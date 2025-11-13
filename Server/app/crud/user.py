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