import argparse
import asyncio
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


DEFAULT_ROLE = "user"
LEGACY_ROLE_ALIASES = {
    "owner": "vehicle_owner",
}


def normalize_roles(value: Any) -> list[str]:
    if value is None:
        return [DEFAULT_ROLE]

    if isinstance(value, str):
        raw_values = [value]
    elif isinstance(value, (list, tuple, set)):
        raw_values = list(value)
    else:
        return [DEFAULT_ROLE]

    normalized: list[str] = []
    for item in raw_values:
        if not isinstance(item, str):
            continue

        role = item.strip()
        if not role:
            continue

        role = LEGACY_ROLE_ALIASES.get(role, role)
        if role not in normalized:
            normalized.append(role)

    return normalized or [DEFAULT_ROLE]


def canonicalize_user_doc(doc: dict[str, Any]) -> dict[str, Any]:
    if "roles" in doc or "role" in doc:
        source = doc.get("roles", doc.get("role"))
        roles = normalize_roles(source)
    else:
        roles = [DEFAULT_ROLE]

    return {
        "roles": roles,
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize legacy user role fields in MongoDB.")
    parser.add_argument("--apply", action="store_true", help="Write changes to MongoDB. Default is dry run.")
    parser.add_argument("--limit", type=int, default=50, help="Maximum number of candidate documents to inspect.")
    args = parser.parse_args()

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
        users = db["users"]

        query = {
            "$or": [
                {"role": {"$exists": True}},
                {"roles": {"$exists": True}},
            ]
        }
        docs = await users.find(query).limit(args.limit).to_list(length=args.limit)

        changed = []
        unchanged = 0
        for doc in docs:
            desired = canonicalize_user_doc(doc)
            current_roles = doc.get("roles")
            if current_roles != desired["roles"] or "role" in doc:
                changed.append(
                    {
                        "_id": doc.get("_id"),
                        "before_role": doc.get("role"),
                        "before_roles": doc.get("roles"),
                        "after_roles": desired["roles"],
                    }
                )
                if args.apply:
                    await users.update_one(
                        {"_id": doc["_id"]},
                        {
                            "$set": desired,
                            "$unset": {"role": ""},
                        },
                    )
            else:
                unchanged += 1

        print(f"Scanned {len(docs)} user documents (limit={args.limit}).")
        print(f"Would change {len(changed)} documents." if not args.apply else f"Changed {len(changed)} documents.")
        print(f"Unchanged {unchanged} documents.")

        for item in changed[:20]:
            print(
                f"- {item['_id']}: role={item['before_role']!r}, roles={item['before_roles']!r} -> roles={item['after_roles']!r}"
            )

        if len(changed) > 20:
            print(f"... and {len(changed) - 20} more.")

        if not args.apply:
            print("Dry run only. Re-run with --apply to update MongoDB.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
