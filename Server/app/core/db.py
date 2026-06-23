import os
import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel

from app.core.db_init import initialize_databases

class DBMotorClient(BaseModel):
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    class Config:
        arbitrary_types_allowed = True

# This `db` object will be populated on app startup
db = DBMotorClient()
admin_db = DBMotorClient()


def _normalize_mongodb_url(mongodb_url: str, db_name: str) -> str:
    """
    Normalize local/dev MongoDB URLs so the same `.env` works both on the host
    and inside Docker.
    """
    normalized = mongodb_url.strip().strip('"').strip("'")
    parsed = urlparse(normalized)

    host = parsed.hostname or ""
    running_in_docker = os.getenv("RUNNING_IN_DOCKER", "").lower() == "true"
    if running_in_docker and host in {"localhost", "127.0.0.1"}:
        netloc = parsed.netloc.replace(host, "host.docker.internal", 1)
        parsed = parsed._replace(netloc=netloc)

    if parsed.scheme.startswith("mongodb") and parsed.path in {"", "/"} and db_name:
        parsed = parsed._replace(path=f"/{db_name}")

    if parsed.scheme.startswith("mongodb") and parsed.username:
        query_params = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if "authSource" not in query_params:
            query_params["authSource"] = "admin"
            parsed = parsed._replace(query=urlencode(query_params))

    return urlunparse(parsed)

async def connect_to_mongo():
    """
    Connects to MongoDB on app startup.
    """
    mongodb_url = os.getenv("MONGODB_URL")
    db_name = os.getenv("MONGODB_DB_NAME", "myAppDb")
    admin_db_name = os.getenv("MONGODB_ADMIN_DB_NAME", "autoshareAdminDb")
    
    if not mongodb_url:
        raise ValueError("MONGODB_URL environment variable not set")
    mongodb_url = _normalize_mongodb_url(mongodb_url, db_name)

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
        admin_db.client = db.client
        # Force a quick round-trip to detect auth issues early
        await db.client.admin.command("ping")
        db.db = db.client[db_name]
        admin_db.db = db.client[admin_db_name]
        try:
            await initialize_databases(db.db, admin_db.db)
        except Exception:
            # Database bootstrap should not block app startup in tests or restricted environments.
            pass
        print(f"Connected to MongoDB. Using databases: app={db_name}, admin={admin_db_name}")
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
    db.client = None
    db.db = None
    admin_db.client = None
    admin_db.db = None
    print("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    """
    A dependency to get the database instance in routes.
    """
    if db.db is None:
        raise RuntimeError("MongoDB database not established.")
    return db.db


def get_admin_database() -> AsyncIOMotorDatabase:
    """
    A dependency to get the dedicated admin database instance in routes.
    """
    if admin_db.db is None:
        raise RuntimeError("MongoDB admin database not established.")
    return admin_db.db
