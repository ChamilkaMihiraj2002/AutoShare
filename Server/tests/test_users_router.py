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
