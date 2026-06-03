import pytest
from fastapi import HTTPException

from app.routers import reviews as reviews_router
from app.schemas import VehicleReviewCreate


@pytest.mark.asyncio
async def test_create_vehicle_review_for_completed_rent(fake_db):
    await fake_db["users"].insert_one(
        {
            "_id": "renter_1",
            "email": "renter@example.com",
            "full_name": "Renter One",
            "address": "",
            "nic": "",
            "phone": "",
            "roles": ["renter"],
        }
    )
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_1",
            "renter_uid": "renter_1",
            "owner_uid": "owner_1",
            "vehicle_id": "veh_1",
            "start_date": "2026-04-01T09:00:00Z",
            "end_date": "2026-04-03T09:00:00Z",
            "booking_status": "completed",
        }
    )

    created = await reviews_router.create_vehicle_review_endpoint(
        VehicleReviewCreate(rent_id="rent_1", rating=5, comment="Very smooth ride."),
        decoded_token={"uid": "renter_1"},
        db=fake_db,
    )

    assert created["rent_id"] == "rent_1"
    assert created["vehicle_id"] == "veh_1"
    assert created["rating"] == 5
    logs = list(fake_db["system_logs"]._store.values())
    assert any(log["action"] == "vehicle_reviews.create" and log["entity_id"] == created["_id"] for log in logs)


@pytest.mark.asyncio
async def test_review_requires_completed_rent(fake_db):
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_2",
            "renter_uid": "renter_2",
            "owner_uid": "owner_2",
            "vehicle_id": "veh_2",
            "booking_status": "accepted",
        }
    )

    with pytest.raises(HTTPException) as exc_info:
        await reviews_router.create_vehicle_review_endpoint(
            VehicleReviewCreate(rent_id="rent_2", rating=4, comment="Good"),
            decoded_token={"uid": "renter_2"},
            db=fake_db,
        )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_review_allows_only_one_submission_per_rent(fake_db):
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_3",
            "renter_uid": "renter_3",
            "owner_uid": "owner_3",
            "vehicle_id": "veh_3",
            "booking_status": "completed",
        }
    )

    await reviews_router.create_vehicle_review_endpoint(
        VehicleReviewCreate(rent_id="rent_3", rating=5, comment="Excellent"),
        decoded_token={"uid": "renter_3"},
        db=fake_db,
    )

    with pytest.raises(HTTPException) as exc_info:
        await reviews_router.create_vehicle_review_endpoint(
            VehicleReviewCreate(rent_id="rent_3", rating=4, comment="Duplicate"),
            decoded_token={"uid": "renter_3"},
            db=fake_db,
        )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_review_summary_and_vehicle_reviews(fake_db):
    await fake_db["users"].insert_one(
        {
            "_id": "renter_4",
            "email": "renter4@example.com",
            "full_name": "Taylor Driver",
            "address": "",
            "nic": "",
            "phone": "",
            "roles": ["renter"],
        }
    )
    await fake_db["vehicle_reviews"].insert_one(
        {
            "_id": "review_1",
            "rent_id": "rent_4",
            "vehicle_id": "veh_4",
            "owner_uid": "owner_4",
            "renter_uid": "renter_4",
            "rating": 4,
            "comment": "Clean vehicle",
            "created_at": "2026-04-03T09:00:00+00:00",
        }
    )
    await fake_db["vehicle_reviews"].insert_one(
        {
            "_id": "review_2",
            "rent_id": "rent_5",
            "vehicle_id": "veh_4",
            "owner_uid": "owner_4",
            "renter_uid": "renter_4",
            "rating": 5,
            "comment": "Great owner",
            "created_at": "2026-04-04T09:00:00+00:00",
        }
    )

    summaries = await reviews_router.get_vehicle_review_summary(vehicle_id=["veh_4"], db=fake_db)
    reviews = await reviews_router.get_vehicle_reviews(vehicle_id="veh_4", db=fake_db)

    assert summaries == [{"vehicle_id": "veh_4", "average_rating": 4.5, "review_count": 2}]
    assert reviews[0]["comment"] == "Great owner"
    assert reviews[0]["reviewer_name"] == "Taylor Driver"
