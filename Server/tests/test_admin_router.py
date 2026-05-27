import pytest
from bson import ObjectId
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
    await fake_db["vehicles"].insert_one({"_id": "v1", "owner_uid": "u1", "verification_status": "pending"})
    await fake_db["vehicles"].insert_one({"_id": "v2", "owner_uid": "u1", "availability": True, "verification_status": "verified"})
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
    assert overview.stats.active_vehicles == 1
    assert overview.stats.inactive_vehicles == 1
    assert overview.stats.pending_vehicle_verifications == 1
    assert overview.stats.verified_vehicles == 1
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


@pytest.mark.asyncio
async def test_admin_gets_and_updates_global_dynamic_pricing_settings(fake_db):
    response = await admin_router.admin_get_dynamic_pricing_settings(
        current_admin={"sub": "admin"},
        admin_db=fake_db,
    )

    assert response.settings.enabled is False
    assert response.settings.weekend_multiplier == 1.0
    assert response.settings.service_fee == 9.0

    updated = await admin_router.admin_update_dynamic_pricing_settings(
        payload=admin_router.AdminDynamicPricingSettings(
            enabled=True,
            weekend_multiplier=1.2,
            weekly_discount_percentage=5,
            monthly_discount_percentage=10,
            holiday_multiplier=1.15,
            rainy_weather_multiplier=1.05,
            severe_weather_multiplier=1.12,
            distance_included_km=12,
            distance_surcharge_per_km=20,
            service_fee=25,
            custom_date_multipliers=[],
        ),
        current_admin={"sub": "admin"},
        admin_db=fake_db,
    )

    assert updated.settings.enabled is True
    assert updated.settings.weekend_multiplier == 1.2
    assert updated.settings.service_fee == 25
    stored = await fake_db["pricing_settings"].find_one({"_id": "global_dynamic_pricing"})
    assert stored["distance_surcharge_per_km"] == 20
    assert stored["service_fee"] == 25


@pytest.mark.asyncio
async def test_admin_lists_users_with_legacy_or_derived_names(fake_db):
    await fake_db["users"].insert_one(
        {
            "_id": "u1",
            "email": "jane_doe@example.com",
            "name": "Jane Doe",
            "roles": ["user"],
        }
    )
    await fake_db["users"].insert_one(
        {
            "_id": "u2",
            "email": "owner-user@example.com",
            "roles": ["vehicle_owner"],
        }
    )

    users_response = await admin_router.admin_list_users(current_admin={"sub": "admin"}, app_db=fake_db)

    assert users_response.users[0].full_name == "Jane Doe"
    assert users_response.users[1].full_name == "Owner User"


@pytest.mark.asyncio
async def test_admin_lists_and_updates_vehicle_verifications(fake_db):
    await fake_db["vehicles"].insert_one(
        {
            "_id": "veh1",
            "owner_uid": "owner1",
            "brand": "Honda",
            "model": "Fit",
            "year": 2021,
            "location": "Colombo",
            "availability": True,
            "verification_status": "pending",
            "verification_documents": {
                "vehicle_book_url": "/uploads/vehicle-documents/book.pdf",
                "vehicle_license_url": "/uploads/vehicle-documents/license.pdf",
            },
            "verification_submitted_at": "2026-05-24T10:00:00+00:00",
        }
    )

    response = await admin_router.admin_list_vehicle_verifications(current_admin={"sub": "admin"}, app_db=fake_db)
    assert response.vehicles[0].vehicle_id == "veh1"
    assert response.vehicles[0].verification_status == "pending"

    updated = await admin_router.admin_update_vehicle_verification(
        "veh1",
        payload=admin_router.AdminVehicleVerificationUpdateRequest(
            verification_status="verified",
            verification_notes="All documents match the vehicle registration.",
        ),
        current_admin={"sub": "admin"},
        app_db=fake_db,
    )
    assert updated.verification_status == "verified"
    assert updated.verification_verified_by == "admin"
    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "admin.vehicle_verification.update" and log["entity_id"] == "veh1" for log in logs)


@pytest.mark.asyncio
async def test_admin_updates_vehicle_verification_for_object_id_records(fake_db):
    vehicle_id = ObjectId()
    await fake_db["vehicles"].insert_one(
        {
            "_id": vehicle_id,
            "owner_uid": "owner1",
            "brand": "Toyota",
            "model": "Vitz",
            "year": 2020,
            "location": "Kandy",
            "availability": True,
            "verification_status": "pending",
            "verification_documents": {
                "vehicle_book_url": "/uploads/vehicle-documents/book.pdf",
                "vehicle_license_url": "/uploads/vehicle-documents/license.pdf",
            },
            "verification_submitted_at": "2026-05-24T10:00:00+00:00",
        }
    )

    updated = await admin_router.admin_update_vehicle_verification(
        str(vehicle_id),
        payload=admin_router.AdminVehicleVerificationUpdateRequest(
            verification_status="verified",
            verification_notes="ObjectId-backed vehicle verified successfully.",
        ),
        current_admin={"sub": "admin"},
        app_db=fake_db,
    )

    assert updated.vehicle_id == str(vehicle_id)
    assert updated.verification_status == "verified"
    assert updated.verification_verified_by == "admin"
