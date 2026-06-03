from fastapi import APIRouter, Depends, HTTPException, Request, status
from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.auth_deps import get_current_user
from app.core.db import get_database
from app.repositories.rent import get_rent_by_id
from app.repositories.user import get_user_profile_by_uid
from app.repositories.vehicle import get_vehicle_by_id
from app.schemas.payments_schema import PayHereCheckoutSessionRequest, PayHereCheckoutSessionResponse
from app.services.audit_log import create_audit_log
from app.services.payhere import build_payhere_hash, require_payhere_config, split_name

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


def _resolve_payhere_amount(pricing_snapshot: dict) -> float:
    base_total = float(pricing_snapshot.get("total") or 0)
    service_fee = float(pricing_snapshot.get("service_fee") or 0)
    return round(base_total + service_fee, 2)


def _derive_city(*, user: dict, vehicle: dict) -> str:
    city = str(user.get("city") or "").strip()
    if city:
        return city

    address = str(user.get("address") or "").strip()
    if address and "," in address:
        trailing_segment = address.split(",")[-1].strip()
        if trailing_segment:
            return trailing_segment

    return str(vehicle.get("location") or "Colombo")


def _rent_id_candidates(rent_id: str) -> list[object]:
    candidates: list[object] = [rent_id]
    try:
        candidates.append(ObjectId(rent_id))
    except (InvalidId, TypeError):
        pass
    return candidates


@router.post("/payhere/checkout-session", response_model=PayHereCheckoutSessionResponse)
async def create_payhere_checkout_session(
    payload: PayHereCheckoutSessionRequest,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    rent = await get_rent_by_id(db=db, rent_id=payload.rent_id)
    if not rent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found")
    if rent.get("renter_uid") != renter_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    user = await get_user_profile_by_uid(db, uid=renter_uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    vehicle = await get_vehicle_by_id(db=db, vehicle_id=rent["vehicle_id"])
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    pricing_snapshot = rent.get("pricing_snapshot") or {}
    amount_value = pricing_snapshot.get("total")
    if amount_value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This booking does not include a pricing snapshot for payment.",
        )

    config = require_payhere_config()
    amount = f"{_resolve_payhere_amount(pricing_snapshot):.2f}"
    currency = str(pricing_snapshot.get("currency") or "LKR")
    order_id = str(rent.get("_id") or payload.rent_id)
    first_name, last_name = split_name(user.get("full_name"))
    city = _derive_city(user=user, vehicle=vehicle)
    payment_summary = {
        "provider": "payhere",
        "status": "checkout_initiated",
        "order_id": order_id,
        "currency": currency,
        "amount": amount,
        "payer": {
            "first_name": first_name,
            "last_name": last_name,
            "email": str(user.get("email") or decoded_token.get("email") or ""),
            "phone": str(user.get("phone") or ""),
            "address": str(user.get("address") or ""),
            "city": city,
            "postal_code": str(user.get("postal_code") or ""),
            "country": "Sri Lanka",
        },
    }
    item_name = f"AutoShare booking for {vehicle.get('brand', '')} {vehicle.get('model', '')}".strip()
    hash_value = build_payhere_hash(
        merchant_id=str(config["merchant_id"]),
        order_id=order_id,
        amount=amount,
        currency=currency,
        merchant_secret=str(config["merchant_secret"]),
    )

    for rent_id_candidate in _rent_id_candidates(order_id):
        update_result = await db["rents"].update_one(
            {"_id": rent_id_candidate},
            {"$set": {"payment_summary": payment_summary}},
        )
        if update_result.matched_count:
            break

    return PayHereCheckoutSessionResponse(
        action_url=str(config["action_url"]),
        merchant_id=str(config["merchant_id"]),
        return_url=str(config["return_url"]),
        cancel_url=str(config["cancel_url"]),
        notify_url=str(config["notify_url"]),
        first_name=first_name,
        last_name=last_name,
        email=str(user.get("email") or decoded_token.get("email") or ""),
        phone=str(user.get("phone") or ""),
        address=str(user.get("address") or ""),
        city=city,
        country="Sri Lanka",
        order_id=order_id,
        items=item_name,
        currency=currency,
        amount=amount,
        hash=hash_value,
        sandbox=bool(config["sandbox"]),
    )


@router.post("/payhere/notify", status_code=200)
async def handle_payhere_notify(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    form = await request.form()
    payload = {key: str(value) for key, value in form.items()}

    order_id = payload.get("order_id")
    payment_update = {
        "provider": "payhere",
        "status": payload.get("status_message") or "notification_received",
        "order_id": order_id,
        "payment_id": payload.get("payment_id"),
        "status_code": payload.get("status_code"),
        "status_message": payload.get("status_message"),
        "method": payload.get("method"),
        "currency": payload.get("payhere_currency"),
        "amount": payload.get("payhere_amount"),
    }

    if order_id:
        for rent_id_candidate in _rent_id_candidates(order_id):
            update_result = await db["rents"].update_one(
                {"_id": rent_id_candidate},
                {"$set": {"payment_summary": payment_update}},
            )
            if update_result.matched_count:
                break

    await create_audit_log(
        db,
        action="payments.payhere.notify",
        outcome="success",
        message="Received PayHere payment notification",
        entity_type="payment",
        entity_id=order_id,
        metadata=payload,
    )
    return {"status": "ok"}
