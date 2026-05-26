from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.admin_auth import create_admin_token, get_current_admin, verify_admin_password
from app.core.db import get_admin_database, get_database
from app.repositories.admin import ensure_default_admin, get_admin_by_username, record_admin_login
from app.schemas.admin_schema import (
    AdminAccountSummary,
    AdminActivityItem,
    AdminAuthResponse,
    AdminBookingItem,
    AdminBookingsResponse,
    AdminDashboardOverview,
    AdminDynamicPricingSettings,
    AdminDynamicPricingSettingsResponse,
    AdminLoginRequest,
    AdminOverviewStats,
    AdminVehicleVerificationItem,
    AdminVehicleVerificationUpdateRequest,
    AdminVehiclesResponse,
    AdminUserItem,
    AdminUsersResponse,
)
from app.services.audit_log import create_audit_log
from app.services.dynamic_pricing_settings import (
    get_global_dynamic_pricing_settings,
    update_global_dynamic_pricing_settings,
)


router = APIRouter(prefix="/admin", tags=["Admin"])


def _serialize_dt(value: object) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    return None


def _vehicle_id_filters(vehicle_id: str) -> list[dict[str, object]]:
    filters: list[dict[str, object]] = [{"_id": vehicle_id}]
    try:
        filters.append({"_id": ObjectId(vehicle_id)})
    except (InvalidId, TypeError):
        pass
    return filters


async def _collection_docs(db: AsyncIOMotorDatabase, collection_name: str, limit: int = 1000) -> list[dict]:
    return await db[collection_name].find({}).to_list(length=limit)


def _sort_key(doc: dict) -> float:
    created_at = doc.get("created_at")
    if isinstance(created_at, datetime):
        return created_at.timestamp()
    return datetime.min.replace(tzinfo=timezone.utc).timestamp()


def _get_roles(user: dict) -> list[str]:
    roles = user.get("roles")
    if isinstance(roles, list):
        return [str(role) for role in roles]
    role = user.get("role")
    if isinstance(role, str) and role:
        return [role]
    return []


def _name_from_email(email: object) -> str | None:
    if not isinstance(email, str):
        return None

    local = email.split("@")[0].strip()
    if not local:
        return None

    parts = [part for part in local.replace(".", " ").replace("_", " ").replace("-", " ").split() if part]
    if not parts:
        return None
    return " ".join(part[:1].upper() + part[1:] for part in parts)


def _get_user_display_name(user: dict) -> str | None:
    for key in ("full_name", "name", "display_name"):
        value = user.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return _name_from_email(user.get("email"))


def _serialize_vehicle_verification_item(vehicle: dict) -> AdminVehicleVerificationItem:
    documents = vehicle.get("verification_documents") or {}
    return AdminVehicleVerificationItem(
        vehicle_id=str(vehicle.get("_id", "")),
        owner_uid=vehicle.get("owner_uid", ""),
        brand=vehicle.get("brand", ""),
        model=vehicle.get("model", ""),
        year=int(vehicle.get("year", 0) or 0),
        location=vehicle.get("location", ""),
        availability=bool(vehicle.get("availability")),
        verification_status=vehicle.get("verification_status", "not_submitted"),
        verification_notes=vehicle.get("verification_notes"),
        verification_submitted_at=vehicle.get("verification_submitted_at"),
        verification_verified_at=vehicle.get("verification_verified_at"),
        verification_verified_by=vehicle.get("verification_verified_by"),
        vehicle_book_url=documents.get("vehicle_book_url"),
        vehicle_license_url=documents.get("vehicle_license_url"),
    )


@router.post("/auth/login", response_model=AdminAuthResponse)
async def admin_login(
    payload: AdminLoginRequest,
    admin_db: AsyncIOMotorDatabase = Depends(get_admin_database),
):
    await ensure_default_admin(admin_db)
    admin = await get_admin_by_username(admin_db, payload.username)
    if not admin or not verify_admin_password(payload.password, admin.get("password_hash", "")):
        await record_admin_login(admin_db, payload.username, "failure", "Invalid admin credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin username or password.")

    await record_admin_login(admin_db, payload.username, "success", "Admin login succeeded")
    return AdminAuthResponse(
        username=payload.username,
        token=create_admin_token(payload.username),
        message="Admin login successful.",
    )


@router.get("/dashboard/overview", response_model=AdminDashboardOverview)
async def admin_dashboard_overview(
    current_admin: dict = Depends(get_current_admin),
    app_db: AsyncIOMotorDatabase = Depends(get_database),
    admin_db: AsyncIOMotorDatabase = Depends(get_admin_database),
):
    await ensure_default_admin(admin_db)

    username = current_admin["sub"]
    admin = await get_admin_by_username(admin_db, username)
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin account not found.")

    users = await _collection_docs(app_db, "users")
    vehicles = await _collection_docs(app_db, "vehicles")
    rents = await _collection_docs(app_db, "rents")
    request_logs = await _collection_docs(app_db, "system_logs")
    admin_logins = await _collection_docs(admin_db, "admin_login_events")

    recent_requests = sorted(
        [doc for doc in request_logs if doc.get("event_type") == "request"],
        key=_sort_key,
        reverse=True,
    )[:6]
    recent_admin_logins = sorted(
        admin_logins,
        key=_sort_key,
        reverse=True,
    )[:6]

    return AdminDashboardOverview(
        admin=AdminAccountSummary(
            username=admin.get("username", username),
            display_name=admin.get("display_name", "Admin"),
            last_login_at=_serialize_dt(admin.get("last_login_at")),
        ),
        stats=AdminOverviewStats(
            total_users=len(users),
            total_renters=sum(1 for user in users if "renter" in _get_roles(user) or "user" in _get_roles(user)),
            total_vehicle_owners=sum(1 for user in users if "vehicle_owner" in _get_roles(user)),
            active_vehicles=sum(1 for vehicle in vehicles if bool(vehicle.get("availability"))),
            inactive_vehicles=sum(1 for vehicle in vehicles if not bool(vehicle.get("availability"))),
            pending_vehicle_verifications=sum(1 for vehicle in vehicles if vehicle.get("verification_status") == "pending"),
            verified_vehicles=sum(1 for vehicle in vehicles if vehicle.get("verification_status") == "verified"),
            current_rents=sum(1 for rent in rents if rent.get("booking_status") == "accepted"),
            completed_rents=sum(1 for rent in rents if rent.get("booking_status") == "completed"),
        ),
        recent_requests=[
            AdminActivityItem(
                title=f"{item.get('method', 'REQUEST')} {item.get('route', '')}".strip(),
                detail=item.get("message", "Request completed"),
                created_at=_serialize_dt(item.get("created_at")),
                outcome=item.get("outcome"),
            )
            for item in recent_requests
        ],
        recent_admin_logins=[
            AdminActivityItem(
                title=item.get("username", "admin"),
                detail=item.get("message", ""),
                created_at=_serialize_dt(item.get("created_at")),
                outcome=item.get("outcome"),
            )
            for item in recent_admin_logins
        ],
    )


@router.get("/users", response_model=AdminUsersResponse)
async def admin_list_users(
    current_admin: dict = Depends(get_current_admin),
    app_db: AsyncIOMotorDatabase = Depends(get_database),
):
    _ = current_admin
    users = await _collection_docs(app_db, "users")
    normalized = sorted(users, key=lambda item: item.get("email") or item.get("_id") or "")
    return AdminUsersResponse(
        users=[
            AdminUserItem(
                uid=str(user.get("_id", "")),
                email=user.get("email"),
                full_name=_get_user_display_name(user),
                phone=user.get("phone"),
                roles=_get_roles(user),
                address=user.get("address"),
            )
            for user in normalized
        ]
    )


@router.get("/bookings", response_model=AdminBookingsResponse)
async def admin_list_bookings(
    current_admin: dict = Depends(get_current_admin),
    app_db: AsyncIOMotorDatabase = Depends(get_database),
):
    _ = current_admin
    bookings = await _collection_docs(app_db, "rents")
    normalized = sorted(bookings, key=_sort_key, reverse=True)
    return AdminBookingsResponse(
        bookings=[
            AdminBookingItem(
                rent_id=str(booking.get("_id", "")),
                renter_uid=booking.get("renter_uid", ""),
                owner_uid=booking.get("owner_uid", ""),
                vehicle_id=booking.get("vehicle_id", ""),
                booking_status=booking.get("booking_status", "pending"),
                start_date=_serialize_dt(booking.get("start_date")),
                end_date=_serialize_dt(booking.get("end_date")),
                total_amount=((booking.get("pricing_snapshot") or {}).get("total")),
            )
            for booking in normalized
        ]
    )


@router.get("/pricing-settings", response_model=AdminDynamicPricingSettingsResponse)
async def admin_get_dynamic_pricing_settings(
    current_admin: dict = Depends(get_current_admin),
    admin_db: AsyncIOMotorDatabase = Depends(get_admin_database),
):
    _ = current_admin
    settings = await get_global_dynamic_pricing_settings(admin_db)
    return AdminDynamicPricingSettingsResponse(settings=AdminDynamicPricingSettings(**settings))


@router.put("/pricing-settings", response_model=AdminDynamicPricingSettingsResponse)
async def admin_update_dynamic_pricing_settings(
    payload: AdminDynamicPricingSettings,
    current_admin: dict = Depends(get_current_admin),
    admin_db: AsyncIOMotorDatabase = Depends(get_admin_database),
):
    admin_username = current_admin.get("sub", "admin")
    settings = await update_global_dynamic_pricing_settings(
        admin_db,
        settings=payload.model_dump(mode="json"),
    )
    await create_audit_log(
        admin_db,
        action="admin.dynamic_pricing.update",
        outcome="success",
        message="Admin updated global dynamic pricing settings",
        actor_uid=admin_username,
        entity_type="pricing_settings",
        entity_id="global_dynamic_pricing",
        metadata={"enabled": settings.get("enabled")},
    )
    return AdminDynamicPricingSettingsResponse(settings=AdminDynamicPricingSettings(**settings))


@router.get("/vehicles", response_model=AdminVehiclesResponse)
async def admin_list_vehicle_verifications(
    current_admin: dict = Depends(get_current_admin),
    app_db: AsyncIOMotorDatabase = Depends(get_database),
):
    _ = current_admin
    vehicles = await _collection_docs(app_db, "vehicles")
    normalized = sorted(
        vehicles,
        key=lambda vehicle: (
            0 if vehicle.get("verification_status") == "pending" else 1,
            vehicle.get("verification_submitted_at") or "",
            str(vehicle.get("_id", "")),
        ),
        reverse=True,
    )
    return AdminVehiclesResponse(
        vehicles=[_serialize_vehicle_verification_item(vehicle) for vehicle in normalized]
    )


@router.patch("/vehicles/{vehicle_id}/verification", response_model=AdminVehicleVerificationItem)
async def admin_update_vehicle_verification(
    vehicle_id: str,
    payload: AdminVehicleVerificationUpdateRequest,
    current_admin: dict = Depends(get_current_admin),
    app_db: AsyncIOMotorDatabase = Depends(get_database),
):
    requested_status = (payload.verification_status or "").strip().lower()
    if requested_status not in {"verified", "rejected"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="verification_status must be either 'verified' or 'rejected'.",
        )

    vehicle = None
    matched_filter: dict[str, object] | None = None
    for candidate_filter in _vehicle_id_filters(vehicle_id):
        vehicle = await app_db["vehicles"].find_one(candidate_filter)
        if vehicle:
            matched_filter = candidate_filter
            break
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")

    documents = vehicle.get("verification_documents") or {}
    if not documents.get("vehicle_book_url") or not documents.get("vehicle_license_url"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle verification documents are missing.",
        )

    admin_username = current_admin.get("sub", "admin")
    update_fields = {
        "verification_status": requested_status,
        "verification_notes": payload.verification_notes,
        "verification_verified_at": datetime.now(timezone.utc).isoformat(),
        "verification_verified_by": admin_username,
    }
    if requested_status == "verified" and not vehicle.get("verification_submitted_at"):
        update_fields["verification_submitted_at"] = datetime.now(timezone.utc).isoformat()

    await app_db["vehicles"].update_one(matched_filter, {"$set": update_fields})
    updated_vehicle = await app_db["vehicles"].find_one(matched_filter)

    await create_audit_log(
        app_db,
        action="admin.vehicle_verification.update",
        outcome="success",
        message=f"Vehicle verification marked as {requested_status}",
        actor_uid=admin_username,
        entity_type="vehicle",
        entity_id=vehicle_id,
        metadata={"verification_notes": payload.verification_notes},
    )

    return _serialize_vehicle_verification_item(updated_vehicle or {})
