from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any, List


class BaseRepository:
    """Generic repository providing basic CRUD operations for a MongoDB collection.

    Usage:
        repo = BaseRepository(db, "users")
        await repo.create({...})
        await repo.get_by_id("some_id")
    """

    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self.db = db
        self.collection_name = collection_name
        self.collection = db[collection_name]

    async def create(self, doc: dict) -> dict:
        result = await self.collection.insert_one(doc)
        created = await self.collection.find_one({"_id": result.inserted_id})
        return created

    async def get_by_id(self, id_: Any) -> dict | None:
        return await self.collection.find_one({"_id": id_})

    async def update_by_id(self, id_: Any, update: dict) -> dict | None:
        if not update:
            return await self.get_by_id(id_)
        result = await self.collection.update_one({"_id": id_}, {"$set": update})
        if result.matched_count == 0:
            return None
        return await self.get_by_id(id_)

    async def delete_by_id(self, id_: Any) -> bool:
        result = await self.collection.delete_one({"_id": id_})
        return result.deleted_count == 1

    async def list(self, filter_: dict = None, limit: int = 200) -> List[dict]:
        filter_ = filter_ or {}
        cursor = self.collection.find(filter_)
        docs = await cursor.to_list(length=limit)
        return docs
