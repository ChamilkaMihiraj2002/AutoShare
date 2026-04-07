from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Any
from bson import ObjectId
from bson.errors import InvalidId
from app.repositories.base import BaseRepository

RENT_COLLECTION = "rents"


def _stringify_id(doc: dict) -> dict:
    if not doc:
        return doc
    if "_id" in doc and not isinstance(doc["_id"], str):
        doc["_id"] = str(doc["_id"])
    return doc


def _to_object_id(value: Any) -> ObjectId | None:
    if isinstance(value, ObjectId):
        return value
    if not isinstance(value, str):
        return None
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


class RentRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, RENT_COLLECTION)

    async def create_rent(self, *, renter_uid: str, rent_doc: dict) -> dict:
        doc = rent_doc.copy()
        doc["renter_uid"] = renter_uid
        doc["booking_status"] = "pending"

        # Always auto-generate id at DB level; ignore any client-provided rentid
        doc.pop("rentid", None)

        created = await self.create(doc)
        return _stringify_id(created)

    async def accept_rent(self, *, owner_uid: str, rent_id: Any) -> dict | None:
        result = await self.collection.update_one(
            {"_id": rent_id, "owner_uid": owner_uid},
            {"$set": {"booking_status": "accepted"}},
        )
        if result.matched_count == 0:
            oid = _to_object_id(rent_id)
            if oid is None:
                return None
            result = await self.collection.update_one(
                {"_id": oid, "owner_uid": owner_uid},
                {"$set": {"booking_status": "accepted"}},
            )
            if result.matched_count == 0:
                return None
            updated = await self.get_by_id(oid)
            return _stringify_id(updated)
        updated = await self.get_by_id(rent_id)
        return _stringify_id(updated)

    async def set_rent_status(self, *, owner_uid: str, rent_id: Any, booking_status: str) -> dict | None:
        result = await self.collection.update_one(
            {"_id": rent_id, "owner_uid": owner_uid},
            {"$set": {"booking_status": booking_status}},
        )
        if result.matched_count == 0:
            oid = _to_object_id(rent_id)
            if oid is None:
                return None
            result = await self.collection.update_one(
                {"_id": oid, "owner_uid": owner_uid},
                {"$set": {"booking_status": booking_status}},
            )
            if result.matched_count == 0:
                return None
            updated = await self.get_by_id(oid)
            return _stringify_id(updated)
        updated = await self.get_by_id(rent_id)
        return _stringify_id(updated)

    async def get_rent_by_id(self, *, rent_id: Any) -> dict | None:
        doc = await self.get_by_id(rent_id)
        if doc is None:
            oid = _to_object_id(rent_id)
            if oid is not None:
                doc = await self.get_by_id(oid)
        return _stringify_id(doc)

    async def list_rents_by_renter(self, *, renter_uid: str) -> List[dict]:
        docs = await self.list({"renter_uid": renter_uid}, limit=200)
        return [_stringify_id(d) for d in docs]

    async def list_rents_by_owner(self, *, owner_uid: str) -> List[dict]:
        docs = await self.list({"owner_uid": owner_uid}, limit=200)
        return [_stringify_id(d) for d in docs]

    async def update_rent(self, *, renter_uid: str, rent_id: Any, update_fields: dict) -> dict | None:
        # Only allow renter to update the record
        update_fields.pop("_id", None)
        update_fields.pop("renter_uid", None)
        update_fields.pop("owner_uid", None)
        update_fields.pop("vehicle_id", None)

        result = await self.collection.update_one({"_id": rent_id, "renter_uid": renter_uid}, {"$set": update_fields})
        if result.matched_count == 0:
            oid = _to_object_id(rent_id)
            if oid is None:
                return None
            result = await self.collection.update_one({"_id": oid, "renter_uid": renter_uid}, {"$set": update_fields})
            if result.matched_count == 0:
                return None
            updated = await self.get_by_id(oid)
            return _stringify_id(updated)
        updated = await self.get_by_id(rent_id)
        return _stringify_id(updated)

    async def delete_rent(self, *, renter_uid: str, rent_id: Any) -> bool:
        # Only renter can delete their rent
        result = await self.collection.delete_one({"_id": rent_id, "renter_uid": renter_uid})
        if result.deleted_count == 1:
            return True
        oid = _to_object_id(rent_id)
        if oid is None:
            return False
        result = await self.collection.delete_one({"_id": oid, "renter_uid": renter_uid})
        return result.deleted_count == 1


# Backwards-compatible function-style API
async def create_rent(db: AsyncIOMotorDatabase, *, renter_uid: str, rent_doc: dict) -> dict:
    repo = RentRepository(db)
    return await repo.create_rent(renter_uid=renter_uid, rent_doc=rent_doc)


async def get_rent_by_id(db: AsyncIOMotorDatabase, *, rent_id: str) -> dict | None:
    repo = RentRepository(db)
    return await repo.get_rent_by_id(rent_id=rent_id)


async def list_rents_by_renter(db: AsyncIOMotorDatabase, *, renter_uid: str) -> List[dict]:
    repo = RentRepository(db)
    return await repo.list_rents_by_renter(renter_uid=renter_uid)


async def list_rents_by_owner(db: AsyncIOMotorDatabase, *, owner_uid: str) -> List[dict]:
    repo = RentRepository(db)
    return await repo.list_rents_by_owner(owner_uid=owner_uid)


async def update_rent(db: AsyncIOMotorDatabase, *, renter_uid: str, rent_id: str, update_fields: dict) -> dict | None:
    repo = RentRepository(db)
    return await repo.update_rent(renter_uid=renter_uid, rent_id=rent_id, update_fields=update_fields)


async def accept_rent(db: AsyncIOMotorDatabase, *, owner_uid: str, rent_id: str) -> dict | None:
    repo = RentRepository(db)
    return await repo.accept_rent(owner_uid=owner_uid, rent_id=rent_id)


async def set_rent_status(
    db: AsyncIOMotorDatabase,
    *,
    owner_uid: str,
    rent_id: str,
    booking_status: str,
) -> dict | None:
    repo = RentRepository(db)
    return await repo.set_rent_status(owner_uid=owner_uid, rent_id=rent_id, booking_status=booking_status)


async def delete_rent(db: AsyncIOMotorDatabase, *, renter_uid: str, rent_id: str) -> bool:
    repo = RentRepository(db)
    return await repo.delete_rent(renter_uid=renter_uid, rent_id=rent_id)
