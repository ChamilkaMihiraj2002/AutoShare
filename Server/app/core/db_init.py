from __future__ import annotations

from collections.abc import Iterable

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.admin import ensure_default_admin
from app.services.dynamic_pricing_settings import get_global_dynamic_pricing_settings


IndexSpec = dict[str, object]


APP_COLLECTION_INDEXES: dict[str, list[IndexSpec]] = {
    "users": [
        {"keys": "email", "unique": True},
        {"keys": "roles"},
    ],
    "vehicles": [
        {"keys": "owner_uid"},
        {"keys": [("availability", 1), ("location", 1)]},
        {"keys": [("verification_status", 1), ("owner_uid", 1)]},
    ],
    "rents": [
        {"keys": [("renter_uid", 1), ("start_date", -1)]},
        {"keys": [("owner_uid", 1), ("start_date", -1)]},
        {"keys": [("vehicle_id", 1), ("start_date", -1)]},
        {"keys": [("booking_status", 1), ("start_date", -1)]},
    ],
    "conversations": [
        {"keys": [("vehicle_id", 1), ("owner_uid", 1), ("renter_uid", 1)], "unique": True},
        {"keys": [("owner_uid", 1), ("updated_at", -1)]},
        {"keys": [("renter_uid", 1), ("updated_at", -1)]},
    ],
    "vehicle_reviews": [
        {"keys": "rent_id", "unique": True},
        {"keys": [("vehicle_id", 1), ("created_at", -1)]},
        {"keys": [("renter_uid", 1), ("created_at", -1)]},
    ],
    "system_logs": [
        {"keys": "created_at"},
        {"keys": [("event_type", 1), ("created_at", -1)]},
        {"keys": [("actor_uid", 1), ("created_at", -1)]},
    ],
}


ADMIN_COLLECTION_INDEXES: dict[str, list[IndexSpec]] = {
    "admins": [
        {"keys": "username", "unique": True},
    ],
    "admin_login_events": [
        {"keys": "created_at"},
        {"keys": [("username", 1), ("created_at", -1)]},
    ],
    "pricing_settings": [],
}


async def _ensure_collections_exist(
    db: AsyncIOMotorDatabase,
    collection_names: Iterable[str],
) -> None:
    existing = set(await db.list_collection_names())
    for name in collection_names:
        if name not in existing:
            await db.create_collection(name)
            existing.add(name)


async def _ensure_collection_indexes(
    db: AsyncIOMotorDatabase,
    collection_indexes: dict[str, list[IndexSpec]],
) -> None:
    await _ensure_collections_exist(db, collection_indexes.keys())

    for collection_name, indexes in collection_indexes.items():
        collection = db[collection_name]
        for spec in indexes:
            keys = spec["keys"]
            kwargs = {key: value for key, value in spec.items() if key != "keys"}
            await collection.create_index(keys, **kwargs)


async def initialize_databases(
    app_db: AsyncIOMotorDatabase,
    admin_db: AsyncIOMotorDatabase,
) -> None:
    await _ensure_collection_indexes(app_db, APP_COLLECTION_INDEXES)
    await _ensure_collection_indexes(admin_db, ADMIN_COLLECTION_INDEXES)
    await ensure_default_admin(admin_db)
    await get_global_dynamic_pricing_settings(admin_db)
