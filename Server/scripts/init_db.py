import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env")

from app.core.db import admin_db, close_mongo_connection, connect_to_mongo, db
from app.core.db_init import initialize_databases


async def main() -> None:
    await connect_to_mongo()
    try:
        if db.db is None or admin_db.db is None:
            raise RuntimeError("MongoDB databases were not initialized.")
        await initialize_databases(db.db, admin_db.db)
        print("MongoDB schema bootstrap completed successfully.")
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
