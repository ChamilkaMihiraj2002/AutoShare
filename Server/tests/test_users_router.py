import pytest
from fastapi import HTTPException

from app.routers import users as users_router
from app.schemas import ChangePasswordRequest, TwoFactorDisableRequest, TwoFactorVerifyRequest
from app.services.two_factor_auth import generate_totp_secret


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


@pytest.mark.asyncio
async def test_change_current_user_password_updates_timestamp_and_audit_log(fake_db, monkeypatch):
    uid = "secure_user"
    await fake_db["users"].insert_one(
        {
            "_id": uid,
            "email": "secure@example.com",
            "address": "A",
            "nic": "N",
            "phone": "P",
            "roles": ["vehicle_owner"],
        }
    )

    monkeypatch.setattr(users_router, "_verify_email_password", lambda email, password: None)
    monkeypatch.setattr(users_router.auth, "update_user", lambda user_uid, password: {"uid": user_uid, "password": password})

    response = await users_router.change_current_user_password(
        ChangePasswordRequest(current_password="old-secret", new_password="new-secret-123"),
        decoded_token={"uid": uid},
        db=fake_db,
    )

    assert response.status_code == 204
    updated_profile = await fake_db["users"].find_one({"_id": uid})
    assert updated_profile["password_changed_at"]
    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "users.change_password" and log["actor_uid"] == uid for log in logs)


@pytest.mark.asyncio
async def test_enable_and_disable_two_factor_updates_security_flags(fake_db, monkeypatch):
    uid = "totp_user"
    secret = generate_totp_secret()
    await fake_db["users"].insert_one(
        {
            "_id": uid,
            "email": "totp@example.com",
            "address": "A",
            "nic": "N",
            "phone": "P",
            "roles": ["vehicle_owner"],
            "two_factor_pending_secret": secret,
        }
    )

    monkeypatch.setattr(users_router, "verify_totp_code", lambda saved_secret, code: saved_secret == secret and code == "123456")

    enabled = await users_router.enable_two_factor(
        TwoFactorVerifyRequest(code="123456"),
        decoded_token={"uid": uid},
        db=fake_db,
    )
    assert enabled.enabled is True
    updated_profile = await fake_db["users"].find_one({"_id": uid})
    assert updated_profile["two_factor_enabled"] is True
    assert updated_profile["two_factor_secret"] == secret

    monkeypatch.setattr(users_router, "_verify_email_password", lambda email, password: None)

    disabled = await users_router.disable_two_factor(
        TwoFactorDisableRequest(current_password="old-secret", code="123456"),
        decoded_token={"uid": uid},
        db=fake_db,
    )
    assert disabled.enabled is False
    updated_profile = await fake_db["users"].find_one({"_id": uid})
    assert updated_profile["two_factor_enabled"] is False
    assert updated_profile["two_factor_secret"] is None
