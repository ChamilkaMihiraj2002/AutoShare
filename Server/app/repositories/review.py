from typing import List
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository

VEHICLE_REVIEW_COLLECTION = "vehicle_reviews"


def _stringify_id(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    if "_id" in doc and not isinstance(doc["_id"], str):
        doc["_id"] = str(doc["_id"])
    return doc


class VehicleReviewRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, VEHICLE_REVIEW_COLLECTION)

    async def create_review(self, review_doc: dict) -> dict:
        payload = review_doc.copy()
        payload["_id"] = payload.get("_id") or f"review_{uuid4().hex}"
        created = await self.create(payload)
        return _stringify_id(created)

    async def get_review_by_rent_id(self, *, rent_id: str) -> dict | None:
        docs = await self.list({"rent_id": rent_id}, limit=1)
        return _stringify_id(docs[0]) if docs else None

    async def list_reviews_by_vehicle(self, *, vehicle_id: str, limit: int = 200) -> List[dict]:
        docs = await self.list({"vehicle_id": vehicle_id}, limit=limit)
        docs.sort(key=lambda doc: doc.get("created_at", ""), reverse=True)
        return [_stringify_id(doc) for doc in docs]

    async def list_reviews_by_renter(self, *, renter_uid: str, limit: int = 200) -> List[dict]:
        docs = await self.list({"renter_uid": renter_uid}, limit=limit)
        docs.sort(key=lambda doc: doc.get("created_at", ""), reverse=True)
        return [_stringify_id(doc) for doc in docs]

    async def list_review_summaries(self, *, vehicle_ids: list[str] | None = None, limit: int = 2000) -> List[dict]:
        docs = await self.list({}, limit=limit)
        summary_by_vehicle: dict[str, dict[str, float | int | str]] = {}

        for doc in docs:
            vehicle_id = doc.get("vehicle_id")
            if not vehicle_id:
                continue
            if vehicle_ids and vehicle_id not in vehicle_ids:
                continue
            summary = summary_by_vehicle.setdefault(vehicle_id, {"vehicle_id": vehicle_id, "total_rating": 0.0, "review_count": 0})
            summary["total_rating"] = float(summary["total_rating"]) + float(doc.get("rating", 0))
            summary["review_count"] = int(summary["review_count"]) + 1

        results: list[dict] = []
        for vehicle_id, summary in summary_by_vehicle.items():
            review_count = int(summary["review_count"])
            total_rating = float(summary["total_rating"])
            average_rating = round(total_rating / review_count, 1) if review_count else 0.0
            results.append(
                {
                    "vehicle_id": vehicle_id,
                    "average_rating": average_rating,
                    "review_count": review_count,
                }
            )

        results.sort(key=lambda item: item["vehicle_id"])
        return results


async def create_vehicle_review(db: AsyncIOMotorDatabase, review_doc: dict) -> dict:
    repo = VehicleReviewRepository(db)
    return await repo.create_review(review_doc)


async def get_vehicle_review_by_rent_id(db: AsyncIOMotorDatabase, *, rent_id: str) -> dict | None:
    repo = VehicleReviewRepository(db)
    return await repo.get_review_by_rent_id(rent_id=rent_id)


async def list_vehicle_reviews_by_vehicle(db: AsyncIOMotorDatabase, *, vehicle_id: str, limit: int = 200) -> List[dict]:
    repo = VehicleReviewRepository(db)
    return await repo.list_reviews_by_vehicle(vehicle_id=vehicle_id, limit=limit)


async def list_vehicle_reviews_by_renter(db: AsyncIOMotorDatabase, *, renter_uid: str, limit: int = 200) -> List[dict]:
    repo = VehicleReviewRepository(db)
    return await repo.list_reviews_by_renter(renter_uid=renter_uid, limit=limit)


async def list_vehicle_review_summaries(
    db: AsyncIOMotorDatabase,
    *,
    vehicle_ids: list[str] | None = None,
    limit: int = 2000,
) -> List[dict]:
    repo = VehicleReviewRepository(db)
    return await repo.list_review_summaries(vehicle_ids=vehicle_ids, limit=limit)
