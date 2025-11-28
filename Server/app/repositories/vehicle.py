from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from bson import ObjectId

VEHICLE_COLLECTION = "vehicles"


def _stringify_id(doc: dict) -> dict:
    if not doc:
        return doc
    if "_id" in doc and not isinstance(doc["_id"], str):
        doc["_id"] = str(doc["_id"])
    return doc


async def create_vehicle(db: AsyncIOMotorDatabase, *, owner_uid: str, vehicle_doc: dict) -> dict:
    # attach owner
    vehicle_doc = vehicle_doc.copy()
    vehicle_doc["owner_uid"] = owner_uid

    # allow client-provided id
    if vehicle_doc.get("vehicleid"):
        vehicle_doc["_id"] = vehicle_doc.pop("vehicleid")
    else:
        # remove vehicleid key if present to avoid storing it
        vehicle_doc.pop("vehicleid", None)

    result = await db[VEHICLE_COLLECTION].insert_one(vehicle_doc)
    created = await db[VEHICLE_COLLECTION].find_one({"_id": result.inserted_id})
    return _stringify_id(created)


async def get_vehicle_by_id(db: AsyncIOMotorDatabase, *, vehicle_id: str) -> dict | None:
    doc = await db[VEHICLE_COLLECTION].find_one({"_id": vehicle_id})
    return _stringify_id(doc)


async def list_vehicles_by_owner(db: AsyncIOMotorDatabase, *, owner_uid: str) -> List[dict]:
    cursor = db[VEHICLE_COLLECTION].find({"owner_uid": owner_uid})
    docs = await cursor.to_list(length=200)
    return [_stringify_id(d) for d in docs]


async def list_all_vehicles(db: AsyncIOMotorDatabase, *, limit: int = 200) -> List[dict]:
    """Return all vehicles (up to `limit`). Useful for public browsing endpoints."""
    cursor = db[VEHICLE_COLLECTION].find({})
    docs = await cursor.to_list(length=limit)
    return [_stringify_id(d) for d in docs]


async def update_vehicle(db: AsyncIOMotorDatabase, *, owner_uid: str, vehicle_id: str, update_fields: dict) -> dict | None:
    # Prevent changing owner or _id
    update_fields.pop("owner_uid", None)
    update_fields.pop("_id", None)
    update_fields.pop("vehicleid", None)

    result = await db[VEHICLE_COLLECTION].update_one(
        {"_id": vehicle_id, "owner_uid": owner_uid},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        return None
    updated = await db[VEHICLE_COLLECTION].find_one({"_id": vehicle_id})
    return _stringify_id(updated)


async def delete_vehicle(db: AsyncIOMotorDatabase, *, owner_uid: str, vehicle_id: str) -> bool:
    result = await db[VEHICLE_COLLECTION].delete_one({"_id": vehicle_id, "owner_uid": owner_uid})
    return result.deleted_count == 1
