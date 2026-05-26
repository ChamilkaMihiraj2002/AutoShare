from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.vehicles_schema import VehicleDynamicPricing


PRICING_SETTINGS_COLLECTION = "pricing_settings"
PRICING_SETTINGS_DOCUMENT_ID = "global_dynamic_pricing"


def get_default_dynamic_pricing_settings() -> dict:
    return VehicleDynamicPricing().model_dump(mode="json")


async def get_global_dynamic_pricing_settings(admin_db: AsyncIOMotorDatabase) -> dict:
    settings = await admin_db[PRICING_SETTINGS_COLLECTION].find_one({"_id": PRICING_SETTINGS_DOCUMENT_ID})
    if settings:
        payload = {key: value for key, value in settings.items() if key != "_id"}
        return VehicleDynamicPricing(**payload).model_dump(mode="json")

    defaults = get_default_dynamic_pricing_settings()
    await admin_db[PRICING_SETTINGS_COLLECTION].insert_one(
        {
            "_id": PRICING_SETTINGS_DOCUMENT_ID,
            **defaults,
        }
    )
    return defaults


async def update_global_dynamic_pricing_settings(
    admin_db: AsyncIOMotorDatabase,
    *,
    settings: dict,
) -> dict:
    normalized = VehicleDynamicPricing(**settings).model_dump(mode="json")
    await admin_db[PRICING_SETTINGS_COLLECTION].update_one(
        {"_id": PRICING_SETTINGS_DOCUMENT_ID},
        {"$set": normalized},
    )

    existing = await admin_db[PRICING_SETTINGS_COLLECTION].find_one({"_id": PRICING_SETTINGS_DOCUMENT_ID})
    if existing is None:
        await admin_db[PRICING_SETTINGS_COLLECTION].insert_one(
            {
                "_id": PRICING_SETTINGS_DOCUMENT_ID,
                **normalized,
            }
        )
        return normalized

    payload = {key: value for key, value in existing.items() if key != "_id"}
    return VehicleDynamicPricing(**payload).model_dump(mode="json")
