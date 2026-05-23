import pytest
from fastapi import HTTPException

from app.routers import admin as admin_router


@pytest.mark.asyncio
async def test_admin_login_success(fake_db):
    response = await admin_router.admin_login(
        payload=admin_router.AdminLoginRequest(username="admin", password="admin"),
        admin_db=fake_db,
    )

    assert response.username == "admin"
    assert response.token
    login_events = list(fake_db["admin_login_events"]._store.values())
    assert any(event["username"] == "admin" and event["outcome"] == "success" for event in login_events)


@pytest.mark.asyncio
async def test_admin_login_rejects_bad_password(fake_db):
    with pytest.raises(HTTPException) as exc_info:
        await admin_router.admin_login(
            payload=admin_router.AdminLoginRequest(username="admin", password="wrong"),
            admin_db=fake_db,
        )

    assert exc_info.value.status_code == 401
    login_events = list(fake_db["admin_login_events"]._store.values())
    assert any(event["outcome"] == "failure" for event in login_events)


@pytest.mark.asyncio
async def test_admin_dashboard_aggregates_data(fake_db):
    await admin_router.ensure_default_admin(fake_db)
    await fake_db["users"].insert_one({"_id": "u1", "email": "u1@example.com"})
    await fake_db["vehicles"].insert_one({"_id": "v1", "owner_uid": "u1"})
    await fake_db["rents"].insert_one({"_id": "r1", "booking_status": "pending"})
    await fake_db["rents"].insert_one({"_id": "r2", "booking_status": "accepted"})
    await fake_db["system_logs"].insert_one(
        {
            "event_type": "request",
            "method": "GET",
            "route": "/vehicles",
            "message": "Vehicles fetched",
        }
    )
    await admin_router.record_admin_login(fake_db, "admin", "success", "Admin login succeeded")

    overview = await admin_router.admin_dashboard_overview(
        current_admin={"sub": "admin"},
        app_db=fake_db,
        admin_db=fake_db,
    )

    assert overview.stats.total_users == 1
    assert overview.stats.total_renters == 0
    assert overview.stats.total_vehicle_owners == 0
    assert overview.stats.active_vehicles == 0
    assert overview.stats.inactive_vehicles == 1
    assert overview.stats.current_rents == 1
    assert overview.stats.completed_rents == 0
    assert overview.recent_requests
    assert overview.recent_admin_logins


@pytest.mark.asyncio
async def test_admin_lists_users_and_bookings(fake_db):
    await fake_db["users"].insert_one(
        {
            "_id": "u1",
            "email": "owner@example.com",
            "full_name": "Owner One",
            "phone": "0771234567",
            "roles": ["vehicle_owner", "renter"],
            "address": "Colombo",
        }
    )
    await fake_db["rents"].insert_one(
        {
            "_id": "r1",
            "renter_uid": "u2",
            "owner_uid": "u1",
            "vehicle_id": "v1",
            "booking_status": "completed",
            "pricing_snapshot": {"total": 15000},
        }
    )

    users_response = await admin_router.admin_list_users(current_admin={"sub": "admin"}, app_db=fake_db)
    bookings_response = await admin_router.admin_list_bookings(current_admin={"sub": "admin"}, app_db=fake_db)

    assert users_response.users[0].roles == ["vehicle_owner", "renter"]
    assert bookings_response.bookings[0].rent_id == "r1"
    assert bookings_response.bookings[0].total_amount == 15000
