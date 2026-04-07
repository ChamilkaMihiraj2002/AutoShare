import pytest
from fastapi import HTTPException

from app.routers import rents as rents_router
from app.schemas import RentCreate


@pytest.mark.asyncio
async def test_create_rent_defaults_to_pending(fake_db):
    payload = RentCreate(
        vehicle_id="veh_1",
        owner_uid="owner_1",
        start_date="2026-04-01T09:00:00Z",
        end_date="2026-04-03T09:00:00Z",
    )

    created = await rents_router.create_rent_endpoint(payload, decoded_token={"uid": "renter_1"}, db=fake_db)

    assert created["_id"] == "auto_1"
    assert created["booking_status"] == "pending"


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
