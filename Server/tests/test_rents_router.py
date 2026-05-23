import pytest
from types import SimpleNamespace
from fastapi import HTTPException

from app.routers import rents as rents_router
from app.schemas import RentCreate
from app.services import vehicle_pricing


@pytest.mark.asyncio
async def test_create_rent_defaults_to_pending(fake_db, monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: set())
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: 15.0)
    monkeypatch.setattr(
        vehicle_pricing,
        "get_daily_weather_summary",
        lambda latitude, longitude, dates: SimpleNamespace(
            summary_by_date={booking_day.isoformat(): "clear" for booking_day in dates},
            note=None,
        ),
    )

    await fake_db["vehicles"].insert_one(
        {
            "_id": "veh_1",
            "owner_uid": "owner_1",
            "type": "car",
            "fuel": "petrol",
            "transmission": "automatic",
            "price": 100.0,
            "availability": True,
            "location": "Colombo",
            "brand": "Toyota",
            "year": 2022,
            "model": "Yaris",
            "dynamic_pricing": {
                "enabled": True,
                "weekend_multiplier": 1.2,
                "weekly_discount_percentage": 0,
                "monthly_discount_percentage": 0,
                "holiday_multiplier": 1.15,
                "rainy_weather_multiplier": 1.05,
                "severe_weather_multiplier": 1.12,
                "distance_included_km": 10,
                "distance_surcharge_per_km": 15,
                "custom_date_multipliers": [],
            },
        }
    )
    payload = RentCreate(
        vehicle_id="veh_1",
        owner_uid="owner_1",
        start_date="2026-04-01T09:00:00Z",
        end_date="2026-04-03T09:00:00Z",
        pickup_latitude=6.9271,
        pickup_longitude=79.8612,
        destination_latitude=7.2906,
        destination_longitude=80.6337,
        country_code="LK",
    )

    created = await rents_router.create_rent_endpoint(payload, decoded_token={"uid": "renter_1"}, db=fake_db)

    assert created["_id"] == "auto_1"
    assert created["booking_status"] == "pending"
    assert created["pricing_snapshot"]["total_days"] == 2
    assert created["pricing_snapshot"]["distance_fee"] > 0
    assert created["pricing_snapshot"]["total"] > 200.0
    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "rents.create" and log["entity_id"] == created["_id"] for log in logs)


@pytest.mark.asyncio
async def test_owner_can_accept_rent_and_vehicle_becomes_unavailable(fake_db):
    await fake_db["vehicles"].insert_one(
        {
            "_id": "veh_1",
            "owner_uid": "owner_1",
            "type": "car",
            "fuel": "petrol",
            "transmission": "automatic",
            "price": 100.0,
            "availability": True,
            "location": "Colombo",
            "brand": "Toyota",
            "year": 2022,
            "model": "Yaris",
        }
    )
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_1",
            "renter_uid": "renter_1",
            "owner_uid": "owner_1",
            "vehicle_id": "veh_1",
            "start_date": "2026-04-01T09:00:00Z",
            "end_date": "2026-04-03T09:00:00Z",
            "booking_status": "pending",
        }
    )

    updated = await rents_router.accept_rent_request("rent_1", decoded_token={"uid": "owner_1"}, db=fake_db)

    assert updated["booking_status"] == "accepted"
    vehicle = await fake_db["vehicles"].find_one({"_id": "veh_1"})
    assert vehicle["availability"] is False
    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "rents.accept" and log["entity_id"] == "rent_1" for log in logs)


@pytest.mark.asyncio
async def test_accept_rent_rejects_non_owner(fake_db):
    await fake_db["vehicles"].insert_one(
        {
            "_id": "veh_1",
            "owner_uid": "owner_1",
            "type": "car",
            "fuel": "petrol",
            "transmission": "automatic",
            "price": 100.0,
            "availability": True,
            "location": "Colombo",
            "brand": "Toyota",
            "year": 2022,
            "model": "Yaris",
        }
    )
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_1",
            "renter_uid": "renter_1",
            "owner_uid": "owner_1",
            "vehicle_id": "veh_1",
            "start_date": "2026-04-01T09:00:00Z",
            "end_date": "2026-04-03T09:00:00Z",
            "booking_status": "pending",
        }
    )

    with pytest.raises(HTTPException) as exc_info:
        await rents_router.accept_rent_request("rent_1", decoded_token={"uid": "someone_else"}, db=fake_db)

    assert exc_info.value.status_code == 403
