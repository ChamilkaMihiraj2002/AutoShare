import pytest

from app.repositories import vehicle as vehicle_repo


@pytest.mark.asyncio
async def test_create_get_update_delete_vehicle(fake_db):
    owner = "owner_1"
    vid = "veh_1"
    # minimal required fields for VehicleCreate / VehicleBase
    payload = {
        "vehicleid": vid,
        "type": "car",
        "fuel": "petrol",
        "transmission": "automatic",
        "price": 30.0,
        "availability": True,
        "location": "Colombo",
        "brand": "Toyota",
        "year": 2020,
        "model": "Corolla",
    }

    # Create
    created = await vehicle_repo.create_vehicle(fake_db, owner_uid=owner, vehicle_doc=payload)
    assert created is not None
    assert created["_id"] == vid
    assert created["owner_uid"] == owner

    # Get by id
    fetched = await vehicle_repo.get_vehicle_by_id(fake_db, vehicle_id=vid)
    assert fetched is not None
    assert fetched["_id"] == vid

    # List by owner
    docs = await vehicle_repo.list_vehicles_by_owner(fake_db, owner_uid=owner)
    assert isinstance(docs, list)
    assert any(d.get("_id") == vid for d in docs)

    # Update
    updated = await vehicle_repo.update_vehicle(fake_db, owner_uid=owner, vehicle_id=vid, update_fields={"price": 45.0})
    assert updated is not None
    assert updated["price"] == 45.0

    # Delete
    deleted = await vehicle_repo.delete_vehicle(fake_db, owner_uid=owner, vehicle_id=vid)
    assert deleted is True

    # Ensure not found afterwards
    missing = await vehicle_repo.get_vehicle_by_id(fake_db, vehicle_id=vid)
    assert missing is None


@pytest.mark.asyncio
async def test_update_nonexistent_vehicle_returns_none(fake_db):
    res = await vehicle_repo.update_vehicle(fake_db, owner_uid="nope", vehicle_id="nope", update_fields={"price": 1})
    assert res is None


@pytest.mark.asyncio
async def test_delete_nonexistent_vehicle_returns_false(fake_db):
    res = await vehicle_repo.delete_vehicle(fake_db, owner_uid="nope", vehicle_id="nope")
    assert res is False
