import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


async def main() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(env_path)

    mongo_url = (os.getenv("MONGODB_URL") or "").strip().strip('"').strip("'")
    db_name = os.getenv("MONGODB_DB_NAME", "AutoShare")
    if not mongo_url:
        raise RuntimeError("MONGODB_URL is not set.")

    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command("ping")
        db = client[db_name]
        docs = await db["users"].find({}, {"email": 1, "avatar_url": 1, "roles": 1, "role": 1}).to_list(length=100)
        print(f"Found {len(docs)} user documents.")
        for doc in docs:
            print(
                f"- _id={doc.get('_id')} email={doc.get('email')} "
                f"avatar_url={doc.get('avatar_url')!r} roles={doc.get('roles')!r} role={doc.get('role')!r}"
            )
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
