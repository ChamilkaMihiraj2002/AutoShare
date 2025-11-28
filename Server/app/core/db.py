import os
import re
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel

class DBMotorClient(BaseModel):
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    class Config:
        arbitrary_types_allowed = True

# This `db` object will be populated on app startup
db = DBMotorClient()

async def connect_to_mongo():
    """
    Connects to MongoDB on app startup.
    """
    mongodb_url = os.getenv("MONGODB_URL")
    db_name = os.getenv("MONGODB_DB_NAME", "myAppDb")
    
    if not mongodb_url:
        raise ValueError("MONGODB_URL environment variable not set")
    # Defensive: some deploy systems (or accidental edits) include surrounding
    # quotes in the env var. Strip common quote characters.
    mongodb_url = mongodb_url.strip().strip('"').strip("'")

    def _mask_mongo_url(u: str) -> str:
        # mask the password portion for logging
        try:
            return re.sub(r"(//[^:/]+:).*?(@)", r"\1***\2", u)
        except Exception:
            return "<redacted>"

    print("Connecting to MongoDB...")
    try:
        # Add a short serverSelectionTimeoutMS to fail fast on auth/network errors
        db.client = AsyncIOMotorClient(mongodb_url, serverSelectionTimeoutMS=5000)
        # Force a quick round-trip to detect auth issues early
        await db.client.admin.command("ping")
        db.db = db.client[db_name]
        print(f"Connected to MongoDB. Using database: {db_name}")
    except Exception as e:
        masked = _mask_mongo_url(mongodb_url)
        raise RuntimeError(
            f"Failed connecting to MongoDB with provided MONGODB_URL: {e}.\n"
            f"Check credentials, IP whitelist, and that the URI is correctly encoded.\n"
            f"Provided (masked) MONGODB_URL={masked}"
        )

async def close_mongo_connection():
    """
    Closes the MongoDB connection on app shutdown.
    """
    print("Closing MongoDB connection...")
    if db.client:
        db.client.close()
    print("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    """
    A dependency to get the database instance in routes.
    """
    if db.db is None:
        raise RuntimeError("MongoDB database not established.")
    return db.db
