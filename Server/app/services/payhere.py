import hashlib
import os

from fastapi import HTTPException, status


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def is_payhere_sandbox_enabled() -> bool:
    return _env("PAYHERE_SANDBOX", "true").lower() in {"1", "true", "yes", "on"}


def get_payhere_action_url() -> str:
    if is_payhere_sandbox_enabled():
        return "https://sandbox.payhere.lk/pay/checkout"
    return "https://www.payhere.lk/pay/checkout"


def split_name(full_name: str | None) -> tuple[str, str]:
    cleaned = (full_name or "").strip()
    if not cleaned:
        return ("AutoShare", "Customer")

    parts = cleaned.split()
    if len(parts) == 1:
        return (parts[0], parts[0])
    return (parts[0], " ".join(parts[1:]))


def build_payhere_hash(*, merchant_id: str, order_id: str, amount: str, currency: str, merchant_secret: str) -> str:
    secret_md5 = hashlib.md5(merchant_secret.encode("utf-8")).hexdigest().upper()
    raw = f"{merchant_id}{order_id}{amount}{currency}{secret_md5}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest().upper()


def require_payhere_config() -> dict[str, str | bool]:
    merchant_id = _env("PAYHERE_MERCHANT_ID")
    merchant_secret = _env("PAYHERE_MERCHANT_SECRET")
    return_url = _env("PAYHERE_RETURN_URL", "http://localhost:5173/user-dashboard/bookings")
    cancel_url = _env("PAYHERE_CANCEL_URL", "http://localhost:5173/vehicle-booking")
    notify_url = _env("PAYHERE_NOTIFY_URL", "http://localhost:8000/payments/payhere/notify")

    if not merchant_id or not merchant_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PayHere is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.",
        )

    return {
        "merchant_id": merchant_id,
        "merchant_secret": merchant_secret,
        "return_url": return_url,
        "cancel_url": cancel_url,
        "notify_url": notify_url,
        "sandbox": is_payhere_sandbox_enabled(),
        "action_url": get_payhere_action_url(),
    }
