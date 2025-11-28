import pytest

from app.schemas import UserProfileUpdate


def test_user_profile_update_validation_accepts_fields():
    payload = {"address": "123 Main"}
    obj = UserProfileUpdate(**payload)
    assert obj.address == "123 Main"


def test_user_profile_update_validation_rejects_empty():
    with pytest.raises(ValueError):
        UserProfileUpdate()
