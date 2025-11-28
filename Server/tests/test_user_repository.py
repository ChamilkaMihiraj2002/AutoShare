import pytest

from app.repositories import user as user_repo
from app.schemas import UserProfileBase


@pytest.mark.asyncio
async def test_create_get_update_delete_user_profile(fake_db):
    # 1. Create profile
    uid = "uid_123"
    email = "test@example.com"
    profile = UserProfileBase(address="123 St", nic="987654321V", phone="+94770000000")

    created = await user_repo.create_user_profile(fake_db, uid=uid, email=email, profile_data=profile)
    assert created is not None
    assert created["_id"] == uid
    assert created["email"] == email
    assert created["address"] == "123 St"

    # 2. Get by uid
    fetched = await user_repo.get_user_profile_by_uid(fake_db, uid=uid)
    assert fetched is not None
    assert fetched["_id"] == uid

    # 3. Update profile
    updated = await user_repo.update_user_profile_by_uid(fake_db, uid=uid, update_data={"address": "456 New St"})
    assert updated is not None
    assert updated["address"] == "456 New St"

    # 4. Delete profile
    deleted = await user_repo.delete_user_profile_by_uid(fake_db, uid=uid)
    assert deleted is True

    # 5. Ensure not found afterwards
    missing = await user_repo.get_user_profile_by_uid(fake_db, uid=uid)
    assert missing is None


@pytest.mark.asyncio
async def test_update_nonexistent_user_returns_none(fake_db):
    res = await user_repo.update_user_profile_by_uid(fake_db, uid="nope", update_data={"address": "x"})
    assert res is None


@pytest.mark.asyncio
async def test_delete_nonexistent_user_returns_false(fake_db):
    res = await user_repo.delete_user_profile_by_uid(fake_db, uid="nope")
    assert res is False
