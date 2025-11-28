import pytest
from fastapi import HTTPException

from app.routers import vehicles as vehicles_router
from app.schemas import VehicleCreate, VehicleUpdate


@pytest.mark.asyncio
async def test_create_and_list_my_vehicles(fake_db):
    owner = "router_owner"

    payload = VehicleCreate(
        vehicleid="rv1",
        type="car",
        fuel="diesel",
        transmission="manual",
        price=15.0,
        availability=True,
        location="Galle",
        brand="Mazda",
        year=2018,
        model="Mazda3",
    )

    created = await vehicles_router.create_vehicle_endpoint(payload, decoded_token={"uid": owner}, db=fake_db)
    assert created is not None
    assert created["_id"] == "rv1"
    assert created["owner_uid"] == owner

    # list
    docs = await vehicles_router.list_my_vehicles(decoded_token={"uid": owner}, db=fake_db)
    assert isinstance(docs, list)
    assert any(d.get("_id") == "rv1" for d in docs)


@pytest.mark.asyncio
async def test_get_vehicle_and_ownership_checks(fake_db):
    owner = "ownerA"
    vid = "ownVeh"
    doc = {"_id": vid, "owner_uid": owner, "type": "car", "fuel": "petrol", "transmission": "auto", "price": 1.0, "availability": True, "location": "X", "brand": "Y", "year": 2000, "model": "Z"}
    await fake_db["vehicles"].insert_one(doc)

    # success when owner matches
    res = await vehicles_router.get_vehicle(vehicle_id=vid, decoded_token={"uid": owner}, db=fake_db)
    assert res["_id"] == vid

    # forbidden when owner mismatches
    with pytest.raises(HTTPException):
        await vehicles_router.get_vehicle(vehicle_id=vid, decoded_token={"uid": "other"}, db=fake_db)


@pytest.mark.asyncio
async def test_patch_and_delete_vehicle_behavior(fake_db):
    owner = "o2"
    vid = "vpatch"
    doc = {"_id": vid, "owner_uid": owner, "type": "car", "fuel": "petrol", "transmission": "auto", "price": 10.0, "availability": True, "location": "L", "brand": "B", "year": 2021, "model": "M"}
    await fake_db["vehicles"].insert_one(doc)

    # patch success
    payload = VehicleUpdate(price=99.9)
    updated = await vehicles_router.patch_vehicle(vehicle_id=vid, payload=payload, decoded_token={"uid": owner}, db=fake_db)
    assert updated is not None
    assert updated["price"] == 99.9

    # patch nonexistent -> raises
    with pytest.raises(HTTPException):
        await vehicles_router.patch_vehicle(vehicle_id="nope", payload=payload, decoded_token={"uid": owner}, db=fake_db)

    # delete nonexistent -> raises
    with pytest.raises(HTTPException):
        await vehicles_router.remove_vehicle(vehicle_id="nope", decoded_token={"uid": owner}, db=fake_db)

    # delete existing -> returns Response with status 204
    resp = await vehicles_router.remove_vehicle(vehicle_id=vid, decoded_token={"uid": owner}, db=fake_db)
    assert getattr(resp, "status_code", None) == 204
