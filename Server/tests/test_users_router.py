import pytest
from fastapi import HTTPException

from app.routers import users as users_router
from app.schemas import UserProfileBase


@pytest.mark.asyncio
async def test_read_current_user_success(fake_db):
    # prepare fake profile in DB
    uid = "uid_router"
    profile = {"_id": uid, "email": "r@example.com", "address": "A", "nic": "N", "phone": "P", "role": "user"}
    # insert directly into fake collection
    await fake_db["users"].insert_one(profile)

    decoded_token = {"uid": uid}
    result = await users_router.read_current_user(decoded_token=decoded_token, db=fake_db)
    # The router returns the raw dict; Pydantic response_model mapping is exercised by FastAPI runtime,
    # but we ensure the dict contains expected keys
    assert result["_id"] == uid
    assert result["email"] == "r@example.com"


@pytest.mark.asyncio
async def test_read_current_user_not_found_raises(fake_db):
    decoded_token = {"uid": "missing"}
    with pytest.raises(HTTPException):
        await users_router.read_current_user(decoded_token=decoded_token, db=fake_db)


@pytest.mark.asyncio
async def test_update_current_user_not_found_raises(fake_db):
    from app.schemas import UserProfileUpdate

    payload = UserProfileUpdate(address="new")
    decoded_token = {"uid": "missing"}
    with pytest.raises(HTTPException):
        await users_router.update_current_user(payload, decoded_token=decoded_token, db=fake_db)


@pytest.mark.asyncio
async def test_update_current_user_writes_audit_log(fake_db):
    from app.schemas import UserProfileUpdate

    uid = "audit_user"
    await fake_db["users"].insert_one(
        {"_id": uid, "email": "audit@example.com", "address": "A", "nic": "N", "phone": "P", "roles": ["user"]}
    )

    payload = UserProfileUpdate(address="Updated address")
    await users_router.update_current_user(payload, decoded_token={"uid": uid}, db=fake_db)

    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "users.update_profile" and log["actor_uid"] == uid for log in logs)


@pytest.mark.asyncio
async def test_delete_current_user_behavior(fake_db):
    uid = "del_uid"
    # not present -> raises
    decoded_token = {"uid": uid}
    with pytest.raises(HTTPException):
        await users_router.delete_current_user(decoded_token=decoded_token, db=fake_db)

    # insert and delete -> returns Response with status 204
    profile = {"_id": uid, "email": "d@example.com", "address": "A", "nic": "N", "phone": "P", "role": "user"}
    await fake_db["users"].insert_one(profile)
    resp = await users_router.delete_current_user(decoded_token=decoded_token, db=fake_db)
    # FastAPI handler returns a Response object; check status_code
    assert getattr(resp, "status_code", None) == 204
    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "users.delete_profile" and log["actor_uid"] == uid for log in logs)


@pytest.mark.asyncio
async def test_save_vehicle_for_current_user_persists_vehicle_id(fake_db):
    uid = "saved_user"
    vehicle_id = "vehicle_1"
    await fake_db["users"].insert_one(
        {"_id": uid, "email": "saved@example.com", "address": "A", "nic": "N", "phone": "P", "roles": ["user"]}
    )
    await fake_db["vehicles"].insert_one(
        {"_id": vehicle_id, "owner_uid": "owner_1", "brand": "Toyota", "model": "Axio", "type": "Sedan", "fuel": "Petrol", "transmission": "Auto", "price": 10000, "seats": 5, "availability": True, "location": "Colombo", "year": 2020}
    )

    updated = await users_router.save_vehicle_for_current_user(
        vehicle_id=vehicle_id,
        decoded_token={"uid": uid},
        db=fake_db,
    )

    assert updated["saved_vehicle_ids"] == [vehicle_id]
    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "users.save_vehicle" and log["entity_id"] == vehicle_id for log in logs)


@pytest.mark.asyncio
async def test_read_saved_vehicles_returns_saved_docs(fake_db):
    uid = "saved_reader"
    vehicle_id = "vehicle_2"
    await fake_db["users"].insert_one(
        {
            "_id": uid,
            "email": "saved-reader@example.com",
            "address": "A",
            "nic": "N",
            "phone": "P",
            "roles": ["user"],
            "saved_vehicle_ids": [vehicle_id],
        }
    )
    await fake_db["vehicles"].insert_one(
        {"_id": vehicle_id, "owner_uid": "owner_2", "brand": "Honda", "model": "Vezel", "type": "SUV", "fuel": "Hybrid", "transmission": "Auto", "price": 15000, "seats": 5, "availability": True, "location": "Kandy", "year": 2021}
    )

    result = await users_router.read_saved_vehicles(decoded_token={"uid": uid}, db=fake_db)

    assert len(result) == 1
    assert result[0]["_id"] == vehicle_id


@pytest.mark.asyncio
async def test_remove_saved_vehicle_for_current_user_updates_profile(fake_db):
    uid = "saved_remove"
    vehicle_id = "vehicle_3"
    await fake_db["users"].insert_one(
        {
            "_id": uid,
            "email": "saved-remove@example.com",
            "address": "A",
            "nic": "N",
            "phone": "P",
            "roles": ["user"],
            "saved_vehicle_ids": [vehicle_id, "vehicle_4"],
        }
    )

    updated = await users_router.remove_saved_vehicle_for_current_user(
        vehicle_id=vehicle_id,
        decoded_token={"uid": uid},
        db=fake_db,
    )

    assert updated["saved_vehicle_ids"] == ["vehicle_4"]
    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "users.remove_saved_vehicle" and log["entity_id"] == vehicle_id for log in logs)
