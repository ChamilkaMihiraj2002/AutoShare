from __future__ import annotations

from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.admin_auth import (
    DEFAULT_ADMIN_DISPLAY_NAME,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_USERNAME,
    hash_admin_password,
)


ADMIN_COLLECTION = "admins"
ADMIN_LOGIN_EVENT_COLLECTION = "admin_login_events"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def ensure_default_admin(db: AsyncIOMotorDatabase) -> dict:
    existing = await db[ADMIN_COLLECTION].find_one({"_id": DEFAULT_ADMIN_USERNAME})
    if existing:
        return existing

    now = _utc_now()
    doc = {
        "_id": DEFAULT_ADMIN_USERNAME,
        "username": DEFAULT_ADMIN_USERNAME,
        "display_name": DEFAULT_ADMIN_DISPLAY_NAME,
        "password_hash": hash_admin_password(DEFAULT_ADMIN_PASSWORD),
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
    }
    await db[ADMIN_COLLECTION].insert_one(doc)
    return doc


async def get_admin_by_username(db: AsyncIOMotorDatabase, username: str) -> dict | None:
    return await db[ADMIN_COLLECTION].find_one({"_id": username})


async def record_admin_login(db: AsyncIOMotorDatabase, username: str, outcome: str, message: str) -> None:
    now = _utc_now()
    await db[ADMIN_LOGIN_EVENT_COLLECTION].insert_one(
        {
            "username": username,
            "outcome": outcome,
            "message": message,
            "created_at": now,
        }
    )
    if outcome == "success":
        await db[ADMIN_COLLECTION].update_one(
            {"_id": username},
            {"$set": {"last_login_at": now, "updated_at": now}},
        )
