from typing import Any, Optional
from urllib.parse import urlparse

from pydantic import BaseModel, Field, model_validator


def normalize_vehicle_image_url(image_url: str | None) -> str | None:
    if image_url is None:
        return None

    normalized = image_url.strip().replace("\\", "/")
    if not normalized:
        return None

    parsed = urlparse(normalized)
    if parsed.scheme and parsed.netloc:
        normalized = parsed.path or normalized

    uploads_index = normalized.lower().find("/uploads/")
    if uploads_index >= 0:
        normalized = normalized[uploads_index:]
    elif normalized.lower().startswith("uploads/"):
        normalized = f"/{normalized}"
    elif not normalized.startswith("/"):
        normalized = f"/{normalized}"

    return normalized


def normalize_vehicle_image_urls(values: list[str] | None, legacy_value: str | None = None) -> tuple[list[str], str | None]:
    normalized_urls: list[str] = []
    candidates = list(values or [])
    if legacy_value:
        candidates.append(legacy_value)

    for value in candidates:
        normalized = normalize_vehicle_image_url(value)
        if normalized and normalized not in normalized_urls:
            normalized_urls.append(normalized)

    primary = normalized_urls[0] if normalized_urls else None
    return normalized_urls, primary


class VehicleBase(BaseModel):
    type: str
    fuel: str
    transmission: str
    price: float
    availability: bool
    location: str
    brand: str
    year: int
    model: str
    seats: int = 5
    image_urls: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_image_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        image_urls, image_url = normalize_vehicle_image_urls(
            normalized.get("image_urls"),
            normalized.get("image_url"),
        )
        normalized["image_urls"] = image_urls
        normalized["image_url"] = image_url
        return normalized


class VehicleCreate(VehicleBase):
    """Payload used when creating a vehicle.

    `vehicleid` may be supplied by the client; if omitted the DB will
    generate an ObjectId and the repository will return it as a string.
    """
    vehicleid: Optional[str] = None


class VehicleUpdate(BaseModel):
    type: Optional[str] = None
    fuel: Optional[str] = None
    transmission: Optional[str] = None
    price: Optional[float] = None
    availability: Optional[bool] = None
    location: Optional[str] = None
    brand: Optional[str] = None
    year: Optional[int] = None
    model: Optional[str] = None
    seats: Optional[int] = None
    image_urls: Optional[list[str]] = None
    image_url: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_image_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        has_urls = "image_urls" in normalized
        has_url = "image_url" in normalized
        if has_urls or has_url:
            image_urls, image_url = normalize_vehicle_image_urls(
                normalized.get("image_urls") if has_urls else None,
                normalized.get("image_url") if has_url else None,
            )
            if has_urls:
                normalized["image_urls"] = image_urls
            if has_url:
                normalized["image_url"] = image_url
        return normalized

    @model_validator(mode="after")
    def check_at_least_one(cls, values):
        if not values.model_dump(exclude_unset=True):
            raise ValueError("At least one field must be provided for update")
        return values


class Vehicle(VehicleBase):
    vehicleid: str = Field(alias="_id")
    owner_uid: str

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "vehicleid": "veh_12345",
                "owner_uid": "FirebaseUID_12345",
                "type": "car",
                "fuel": "petrol",
                "transmission": "automatic",
                "price": 35.5,
                "availability": True,
                "location": "Colombo",
                "brand": "Toyota",
                "year": 2020,
                "model": "Corolla",
                "seats": 5,
                "image_urls": [
                    "/uploads/vehicles/example1.jpg",
                    "/uploads/vehicles/example2.jpg",
                ],
                "image_url": "/uploads/vehicles/example.jpg",
            }
        }
