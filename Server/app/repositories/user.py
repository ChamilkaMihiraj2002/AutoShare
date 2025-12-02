from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas import UserProfileBase
from app.repositories.base import BaseRepository

# The name of our MongoDB collection
USER_COLLECTION = "users"


class UserRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, USER_COLLECTION)

    async def create_user_profile(self, *, uid: str, email: str, profile_data: UserProfileBase) -> dict:
        user_doc = profile_data.model_dump()
        user_doc["email"] = email
        user_doc["_id"] = uid
        return await self.create(user_doc)

    async def get_user_profile_by_uid(self, *, uid: str) -> dict | None:
        return await self.get_by_id(uid)

    async def update_user_profile_by_uid(self, *, uid: str, update_data: dict) -> dict | None:
        return await self.update_by_id(uid, update_data)

    async def delete_user_profile_by_uid(self, *, uid: str) -> bool:
        return await self.delete_by_id(uid)


# Backwards-compatible function API used in tests and other modules
async def create_user_profile(db: AsyncIOMotorDatabase, *, uid: str, email: str, profile_data: UserProfileBase) -> dict:
    repo = UserRepository(db)
    return await repo.create_user_profile(uid=uid, email=email, profile_data=profile_data)


async def get_user_profile_by_uid(db: AsyncIOMotorDatabase, *, uid: str) -> dict | None:
    repo = UserRepository(db)
    return await repo.get_user_profile_by_uid(uid=uid)


async def update_user_profile_by_uid(db: AsyncIOMotorDatabase, *, uid: str, update_data: dict) -> dict | None:
    repo = UserRepository(db)
    return await repo.update_user_profile_by_uid(uid=uid, update_data=update_data)


async def delete_user_profile_by_uid(db: AsyncIOMotorDatabase, *, uid: str) -> bool:
    repo = UserRepository(db)
    return await repo.delete_user_profile_by_uid(uid=uid)