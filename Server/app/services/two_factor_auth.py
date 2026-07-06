import base64
import hashlib
import hmac
import json
import os
import struct
import time
from urllib.parse import quote


TOTP_PERIOD_SECONDS = 30
TOTP_DIGITS = 6
TWO_FACTOR_ISSUER = "AutoShare"
CHALLENGE_TOKEN_TTL_SECONDS = 300


def generate_totp_secret() -> str:
    return base64.b32encode(os.urandom(20)).decode("ascii").rstrip("=")


def build_otpauth_url(*, email: str, secret: str, issuer: str = TWO_FACTOR_ISSUER) -> str:
    encoded_label = quote(f"{issuer}:{email}")
    encoded_issuer = quote(issuer)
    return (
        f"otpauth://totp/{encoded_label}"
        f"?secret={secret}&issuer={encoded_issuer}&algorithm=SHA1&digits={TOTP_DIGITS}&period={TOTP_PERIOD_SECONDS}"
    )


def _normalize_secret(secret: str) -> bytes:
    normalized = (secret or "").strip().upper().replace(" ", "")
    padding = "=" * ((8 - len(normalized) % 8) % 8)
    return base64.b32decode(normalized + padding, casefold=True)


def _totp_code(secret: str, counter: int) -> str:
    secret_bytes = _normalize_secret(secret)
    message = struct.pack(">Q", counter)
    digest = hmac.new(secret_bytes, message, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(binary % (10 ** TOTP_DIGITS)).zfill(TOTP_DIGITS)


def verify_totp_code(secret: str, code: str, *, at_time: int | None = None, window: int = 1) -> bool:
    normalized_code = "".join(ch for ch in (code or "") if ch.isdigit())
    if len(normalized_code) != TOTP_DIGITS:
        return False

    timestamp = at_time or int(time.time())
    current_counter = timestamp // TOTP_PERIOD_SECONDS
    for offset in range(-window, window + 1):
        if hmac.compare_digest(_totp_code(secret, current_counter + offset), normalized_code):
            return True
    return False


def _challenge_secret() -> bytes:
    value = os.getenv("AUTH_CHALLENGE_SECRET", "autoshare-dev-challenge-secret")
    return value.encode("utf-8")


def create_login_challenge_token(*, uid: str, email: str | None, id_token: str) -> str:
    payload = {
        "uid": uid,
        "email": email,
        "id_token": id_token,
        "exp": int(time.time()) + CHALLENGE_TOKEN_TTL_SECONDS,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    encoded_payload = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    signature = hmac.new(_challenge_secret(), encoded_payload.encode("utf-8"), hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")
    return f"{encoded_payload}.{encoded_signature}"


def verify_login_challenge_token(token: str) -> dict:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
    except ValueError as exc:
        raise ValueError("Invalid 2FA challenge token.") from exc

    expected_signature = hmac.new(
        _challenge_secret(),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    actual_signature = base64.urlsafe_b64decode(encoded_signature + "=" * ((4 - len(encoded_signature) % 4) % 4))
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise ValueError("Invalid 2FA challenge token signature.")

    payload_bytes = base64.urlsafe_b64decode(encoded_payload + "=" * ((4 - len(encoded_payload) % 4) % 4))
    payload = json.loads(payload_bytes.decode("utf-8"))
    if int(payload.get("exp", 0)) < int(time.time()):
        raise ValueError("2FA challenge token has expired.")
    return payload
