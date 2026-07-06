import pytest
from fastapi import HTTPException

from app.routers import auth as auth_router
from app.schemas import LoginRequest, LoginTwoFactorRequest


class FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload
        self.text = str(payload)

    def json(self):
        return self._payload


@pytest.mark.asyncio
async def test_login_user_requires_two_factor_when_enabled(fake_db, monkeypatch):
    uid = "owner_2fa"
    await fake_db["users"].insert_one(
        {
            "_id": uid,
            "email": "owner@example.com",
            "address": "A",
            "nic": "N",
            "phone": "P",
            "roles": ["vehicle_owner"],
            "two_factor_enabled": True,
            "two_factor_secret": "SECRET",
        }
    )

    monkeypatch.setenv("FIREBASE_API_KEY", "test-key")
    monkeypatch.setattr(
        auth_router.requests,
        "post",
        lambda url, json, timeout: FakeResponse(200, {"localId": uid, "idToken": "firebase-id-token"}),
    )

    response = await auth_router.login_user(LoginRequest(email="owner@example.com", password="secret"), db=fake_db)

    assert response.two_factor_required is True
    assert response.two_factor_token
    assert response.idToken is None


@pytest.mark.asyncio
async def test_complete_two_factor_login_returns_id_token(fake_db, monkeypatch):
    uid = "owner_2fa_verify"
    await fake_db["users"].insert_one(
        {
            "_id": uid,
            "email": "verify@example.com",
            "address": "A",
            "nic": "N",
            "phone": "P",
            "roles": ["vehicle_owner"],
            "two_factor_enabled": True,
            "two_factor_secret": "SECRET",
        }
    )

    monkeypatch.setattr(auth_router, "verify_totp_code", lambda secret, code: secret == "SECRET" and code == "123456")
    challenge_token = auth_router.create_login_challenge_token(
        uid=uid,
        email="verify@example.com",
        id_token="firebase-id-token",
    )

    response = await auth_router.complete_two_factor_login(
        LoginTwoFactorRequest(two_factor_token=challenge_token, code="123456"),
        db=fake_db,
    )

    assert response.idToken == "firebase-id-token"
    assert response.uid == uid


@pytest.mark.asyncio
async def test_complete_two_factor_login_rejects_bad_code(fake_db, monkeypatch):
    uid = "owner_2fa_bad_code"
    await fake_db["users"].insert_one(
        {
            "_id": uid,
            "email": "badcode@example.com",
            "address": "A",
            "nic": "N",
            "phone": "P",
            "roles": ["vehicle_owner"],
            "two_factor_enabled": True,
            "two_factor_secret": "SECRET",
        }
    )

    monkeypatch.setattr(auth_router, "verify_totp_code", lambda secret, code: False)
    challenge_token = auth_router.create_login_challenge_token(
        uid=uid,
        email="badcode@example.com",
        id_token="firebase-id-token",
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_router.complete_two_factor_login(
            LoginTwoFactorRequest(two_factor_token=challenge_token, code="000000"),
            db=fake_db,
        )

    assert exc_info.value.status_code == 401
