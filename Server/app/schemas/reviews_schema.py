from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class VehicleReviewCreate(BaseModel):
    rent_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str) -> str:
        return value.strip()


class VehicleReview(BaseModel):
    reviewid: str = Field(alias="_id")
    rent_id: str
    vehicle_id: str
    owner_uid: str
    renter_uid: str
    rating: int
    comment: str = ""
    created_at: str = Field(default_factory=_utc_now_iso)

    class Config:
        populate_by_name = True


class VehicleReviewSummary(BaseModel):
    vehicle_id: str
    average_rating: float = 0.0
    review_count: int = 0


class VehicleReviewWithAuthor(VehicleReview):
    reviewer_name: Optional[str] = None
    reviewer_avatar_url: Optional[str] = None
