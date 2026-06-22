import pytest

from app.core.db_init import ADMIN_COLLECTION_INDEXES, APP_COLLECTION_INDEXES, initialize_databases


@pytest.mark.asyncio
async def test_initialize_databases_bootstraps_expected_collections(fake_db):
    app_db = fake_db
    admin_db = fake_db.__class__()

    await initialize_databases(app_db, admin_db)

    assert set(APP_COLLECTION_INDEXES).issubset(app_db._collections.keys())
    assert set(ADMIN_COLLECTION_INDEXES).issubset(admin_db._collections.keys())

    assert app_db["users"].indexes == [
        {"keys": "email", "unique": True},
        {"keys": "roles"},
    ]
    assert admin_db["admins"].indexes == [
        {"keys": "username", "unique": True},
    ]

    seeded_admin = await admin_db["admins"].find_one({"_id": "admin"})
    assert seeded_admin is not None
    assert seeded_admin["username"] == "admin"

    pricing_settings = await admin_db["pricing_settings"].find_one({"_id": "global_dynamic_pricing"})
    assert pricing_settings is not None
    assert pricing_settings["enabled"] is False
