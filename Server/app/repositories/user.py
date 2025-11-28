from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas import UserProfileBase

# The name of our MongoDB collection
USER_COLLECTION = "users"

async def create_user_profile(db: AsyncIOMotorDatabase, *, uid: str, email: str, profile_data: UserProfileBase) -> dict:
    """
    Creates a new user profile document in MongoDB.
    Uses the Firebase UID as the document _id.
    """
    # Create a dictionary for the new user document
    user_doc = profile_data.model_dump()
    user_doc["email"] = email
    user_doc["_id"] = uid  # Use Firebase UID as the MongoDB _id

    # Insert the document into the 'users' collection
    result = await db[USER_COLLECTION].insert_one(user_doc)
    
    # Retrieve the inserted document to be safe and return it
    created_doc = await db[USER_COLLECTION].find_one({"_id": result.inserted_id})
    return created_doc

async def get_user_profile_by_uid(db: AsyncIOMotorDatabase, *, uid: str) -> dict | None:
    """
    Fetches a user profile from MongoDB using their Firebase UID (_id).
    """
    user_doc = await db[USER_COLLECTION].find_one({"_id": uid})
    return user_doc


async def update_user_profile_by_uid(db: AsyncIOMotorDatabase, *, uid: str, update_data: dict) -> dict | None:
    """
    Updates an existing user profile document with the provided `update_data`.
    Returns the updated document, or `None` if no document matched the UID.
    """
    if not update_data:
        return await get_user_profile_by_uid(db, uid=uid)

    result = await db[USER_COLLECTION].update_one({"_id": uid}, {"$set": update_data})
    if result.matched_count == 0:
        return None
    updated_doc = await db[USER_COLLECTION].find_one({"_id": uid})
    return updated_doc


async def delete_user_profile_by_uid(db: AsyncIOMotorDatabase, *, uid: str) -> bool:
    """
    Deletes a user profile document by UID. Returns True if a document was deleted.
    """
    result = await db[USER_COLLECTION].delete_one({"_id": uid})
    return result.deleted_count == 1