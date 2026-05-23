from __future__ import annotations

from datetime import datetime, timezone

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
    AdminLoginRequest,
    AdminOverviewStats,
    AdminUserItem,
    AdminUsersResponse,
)


router = APIRouter(prefix="/admin", tags=["Admin"])


def _serialize_dt(value: object) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    return None


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
                full_name=user.get("full_name"),
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
