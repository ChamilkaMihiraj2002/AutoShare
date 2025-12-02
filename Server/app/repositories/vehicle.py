from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Any
from app.repositories.base import BaseRepository

VEHICLE_COLLECTION = "vehicles"


def _stringify_id(doc: dict) -> dict:
    if not doc:
        return doc
    if "_id" in doc and not isinstance(doc["_id"], str):
        doc["_id"] = str(doc["_id"])
    return doc


class VehicleRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, VEHICLE_COLLECTION)

    async def create_vehicle(self, *, owner_uid: str, vehicle_doc: dict) -> dict:
        vehicle_doc = vehicle_doc.copy()
        vehicle_doc["owner_uid"] = owner_uid

        if vehicle_doc.get("vehicleid"):
            vehicle_doc["_id"] = vehicle_doc.pop("vehicleid")
        else:
            vehicle_doc.pop("vehicleid", None)

        created = await self.create(vehicle_doc)
        return _stringify_id(created)

    async def get_vehicle_by_id(self, *, vehicle_id: Any) -> dict | None:
        doc = await self.get_by_id(vehicle_id)
        return _stringify_id(doc)

    async def list_vehicles_by_owner(self, *, owner_uid: str) -> List[dict]:
        docs = await self.list({"owner_uid": owner_uid}, limit=200)
        return [_stringify_id(d) for d in docs]

    async def list_all_vehicles(self, *, limit: int = 200) -> List[dict]:
        docs = await self.list({}, limit=limit)
        return [_stringify_id(d) for d in docs]

    async def update_vehicle(self, *, owner_uid: str, vehicle_id: Any, update_fields: dict) -> dict | None:
        update_fields.pop("owner_uid", None)
        update_fields.pop("_id", None)
        update_fields.pop("vehicleid", None)

        # Restrict update to owner
        result = await self.collection.update_one({"_id": vehicle_id, "owner_uid": owner_uid}, {"$set": update_fields})
        if result.matched_count == 0:
            return None
        updated = await self.get_by_id(vehicle_id)
        return _stringify_id(updated)

    async def delete_vehicle(self, *, owner_uid: str, vehicle_id: Any) -> bool:
        result = await self.collection.delete_one({"_id": vehicle_id, "owner_uid": owner_uid})
        return result.deleted_count == 1


# Backwards-compatible functions
async def create_vehicle(db: AsyncIOMotorDatabase, *, owner_uid: str, vehicle_doc: dict) -> dict:
    repo = VehicleRepository(db)
    return await repo.create_vehicle(owner_uid=owner_uid, vehicle_doc=vehicle_doc)


async def get_vehicle_by_id(db: AsyncIOMotorDatabase, *, vehicle_id: str) -> dict | None:
    repo = VehicleRepository(db)
    return await repo.get_vehicle_by_id(vehicle_id=vehicle_id)


async def list_vehicles_by_owner(db: AsyncIOMotorDatabase, *, owner_uid: str) -> List[dict]:
    repo = VehicleRepository(db)
    return await repo.list_vehicles_by_owner(owner_uid=owner_uid)


async def list_all_vehicles(db: AsyncIOMotorDatabase, *, limit: int = 200) -> List[dict]:
    repo = VehicleRepository(db)
    return await repo.list_all_vehicles(limit=limit)


async def update_vehicle(db: AsyncIOMotorDatabase, *, owner_uid: str, vehicle_id: str, update_fields: dict) -> dict | None:
    repo = VehicleRepository(db)
    return await repo.update_vehicle(owner_uid=owner_uid, vehicle_id=vehicle_id, update_fields=update_fields)


async def delete_vehicle(db: AsyncIOMotorDatabase, *, owner_uid: str, vehicle_id: str) -> bool:
    repo = VehicleRepository(db)
    return await repo.delete_vehicle(owner_uid=owner_uid, vehicle_id=vehicle_id)
