from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.auth_deps import get_current_user
from app.core.db import get_database
from app.repositories.rent import get_rent_by_id
from app.repositories.review import (
    create_vehicle_review,
    get_vehicle_review_by_rent_id,
    list_vehicle_review_summaries,
    list_vehicle_reviews_by_renter,
    list_vehicle_reviews_by_vehicle,
)
from app.repositories.user import get_user_profile_by_uid
from app.schemas import VehicleReview, VehicleReviewCreate, VehicleReviewSummary, VehicleReviewWithAuthor
from app.services.audit_log import create_audit_log

router = APIRouter(
    prefix="/vehicle-reviews",
    tags=["Vehicle Reviews"],
)


@router.get("/summary", response_model=List[VehicleReviewSummary])
async def get_vehicle_review_summary(
    vehicle_id: list[str] | None = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    return await list_vehicle_review_summaries(db=db, vehicle_ids=vehicle_id)


@router.get("/vehicle/{vehicle_id}", response_model=List[VehicleReviewWithAuthor])
async def get_vehicle_reviews(
    vehicle_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    reviews = await list_vehicle_reviews_by_vehicle(db=db, vehicle_id=vehicle_id)
    enriched_reviews: list[dict] = []

    for review in reviews:
        reviewer_name = None
        reviewer_avatar_url = None
        renter_uid = review.get("renter_uid")
        if renter_uid:
            profile = await get_user_profile_by_uid(db=db, uid=renter_uid)
            if profile:
                reviewer_name = profile.get("full_name") or profile.get("email")
                reviewer_avatar_url = profile.get("avatar_url")

        enriched_reviews.append(
            {
                **review,
                "reviewer_name": reviewer_name,
                "reviewer_avatar_url": reviewer_avatar_url,
            }
        )

    return enriched_reviews


@router.get("/me", response_model=List[VehicleReview])
async def get_my_vehicle_reviews(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    return await list_vehicle_reviews_by_renter(db=db, renter_uid=renter_uid)


@router.post("/", response_model=VehicleReview, status_code=201)
async def create_vehicle_review_endpoint(
    payload: VehicleReviewCreate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    rent = await get_rent_by_id(db=db, rent_id=payload.rent_id)
    if not rent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Completed booking not found")
    if rent.get("renter_uid") != renter_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only review your own completed bookings")
    if rent.get("booking_status") != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only completed bookings can be reviewed")

    existing_review = await get_vehicle_review_by_rent_id(db=db, rent_id=payload.rent_id)
    if existing_review:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A review has already been submitted for this booking")

    created = await create_vehicle_review(
        db=db,
        review_doc={
            "rent_id": payload.rent_id,
            "vehicle_id": rent.get("vehicle_id"),
            "owner_uid": rent.get("owner_uid"),
            "renter_uid": renter_uid,
            "rating": payload.rating,
            "comment": payload.comment,
        },
    )
    await create_audit_log(
        db,
        action="vehicle_reviews.create",
        outcome="success",
        message="Vehicle review submitted",
        actor_uid=renter_uid,
        entity_type="vehicle_review",
        entity_id=created.get("_id"),
        metadata={
            "rent_id": payload.rent_id,
            "vehicle_id": rent.get("vehicle_id"),
            "rating": payload.rating,
        },
    )
    return created
