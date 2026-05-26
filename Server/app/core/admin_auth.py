from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone

from fastapi import Header, HTTPException, status


DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"
DEFAULT_ADMIN_DISPLAY_NAME = "System Administrator"
TOKEN_TTL_HOURS = 12


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _get_secret() -> str:
    return os.getenv("ADMIN_AUTH_SECRET", "autoshare-admin-secret")


def hash_admin_password(password: str) -> str:
    salt = _get_secret().encode("utf-8")
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return base64.urlsafe_b64encode(derived).decode("utf-8")


def verify_admin_password(password: str, password_hash: str) -> bool:
    expected = hash_admin_password(password)
    return hmac.compare_digest(expected, password_hash)


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(f"{raw}{padding}")


def create_admin_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": int((_utc_now() + timedelta(hours=TOKEN_TTL_HOURS)).timestamp()),
    }
    payload_raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_segment = _b64encode(payload_raw)
    signature = hmac.new(_get_secret().encode("utf-8"), payload_segment.encode("utf-8"), hashlib.sha256).digest()
    return f"{payload_segment}.{_b64encode(signature)}"


def decode_admin_token(token: str) -> dict:
    try:
        payload_segment, signature_segment = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token.") from exc

    expected_signature = hmac.new(
        _get_secret().encode("utf-8"),
        payload_segment.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    actual_signature = _b64decode(signature_segment)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token signature.")

    try:
        payload = json.loads(_b64decode(payload_segment).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token payload.") from exc

    exp = payload.get("exp")
    if not isinstance(exp, int) or exp < int(_utc_now().timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token expired.")

    username = payload.get("sub")
    if not isinstance(username, str) or not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token subject.")
    return payload


async def get_current_admin(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin authorization required.")
    token = authorization.removeprefix("Bearer ").strip()
    return decode_admin_token(token)
