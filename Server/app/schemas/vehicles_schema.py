from datetime import date
from typing import Any, Literal, Optional
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


def normalize_upload_asset_url(asset_url: str | None, *, folder: str) -> str | None:
    if asset_url is None:
        return None

    normalized = asset_url.strip().replace("\\", "/")
    if not normalized:
        return None

    parsed = urlparse(normalized)
    if parsed.scheme and parsed.netloc:
        normalized = parsed.path or normalized

    folder_path = f"/uploads/{folder.strip('/')}/"
    folder_index = normalized.lower().find(folder_path.lower())
    if folder_index >= 0:
        normalized = normalized[folder_index:]
    elif normalized.lower().startswith(folder_path.lstrip("/").lower()):
        normalized = f"/{normalized}"
    elif not normalized.startswith("/"):
        normalized = f"/{normalized}"

    return normalized


class VehicleVerificationDocuments(BaseModel):
    vehicle_book_url: str | None = None
    vehicle_license_url: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_document_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        normalized["vehicle_book_url"] = normalize_upload_asset_url(
            normalized.get("vehicle_book_url"),
            folder="vehicle-documents",
        )
        normalized["vehicle_license_url"] = normalize_upload_asset_url(
            normalized.get("vehicle_license_url"),
            folder="vehicle-documents",
        )
        return normalized


VehicleVerificationStatus = Literal["not_submitted", "pending", "verified", "rejected"]


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
    dynamic_pricing: Optional["VehicleDynamicPricing"] = None
    verification_documents: VehicleVerificationDocuments = Field(default_factory=VehicleVerificationDocuments)
    verification_status: VehicleVerificationStatus = "not_submitted"
    verification_notes: str | None = None
    verification_submitted_at: str | None = None
    verification_verified_at: str | None = None
    verification_verified_by: str | None = None

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
    dynamic_pricing: Optional["VehicleDynamicPricing"] = None
    verification_documents: Optional[VehicleVerificationDocuments] = None
    verification_status: Optional[VehicleVerificationStatus] = None
    verification_notes: Optional[str] = None
    verification_submitted_at: Optional[str] = None
    verification_verified_at: Optional[str] = None
    verification_verified_by: Optional[str] = None

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
                "verification_documents": {
                    "vehicle_book_url": "/uploads/vehicle-documents/veh_12345_book.pdf",
                    "vehicle_license_url": "/uploads/vehicle-documents/veh_12345_license.pdf",
                },
                "verification_status": "verified",
                "verification_notes": "Registration documents confirmed.",
                "verification_submitted_at": "2026-05-24T08:30:00+00:00",
                "verification_verified_at": "2026-05-25T09:00:00+00:00",
                "verification_verified_by": "admin",
                "dynamic_pricing": {
                    "enabled": True,
                    "weekend_multiplier": 1.1,
                    "weekly_discount_percentage": 5,
                    "monthly_discount_percentage": 10,
                    "custom_date_multipliers": [
                        {
                            "label": "New Year demand",
                            "start_date": "2026-12-20",
                            "end_date": "2027-01-05",
                            "multiplier": 1.25,
                        }
                    ],
                },
            }
        }


class CustomDateMultiplier(BaseModel):
    label: Optional[str] = None
    start_date: date
    end_date: date
    multiplier: float = 1.0

    @model_validator(mode="after")
    def validate_range(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if self.multiplier <= 0:
            raise ValueError("multiplier must be greater than 0")
        return self


class VehicleDynamicPricing(BaseModel):
    enabled: bool = False
    weekend_multiplier: float = 1.0
    weekly_discount_percentage: float = 0.0
    monthly_discount_percentage: float = 0.0
    holiday_multiplier: float = 1.15
    rainy_weather_multiplier: float = 1.05
    severe_weather_multiplier: float = 1.12
    distance_included_km: float = 10.0
    distance_surcharge_per_km: float = 15.0
    service_fee: float = 9.0
    custom_date_multipliers: list[CustomDateMultiplier] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_values(self):
        if self.weekend_multiplier <= 0:
            raise ValueError("weekend_multiplier must be greater than 0")
        if self.holiday_multiplier <= 0:
            raise ValueError("holiday_multiplier must be greater than 0")
        if self.rainy_weather_multiplier <= 0:
            raise ValueError("rainy_weather_multiplier must be greater than 0")
        if self.severe_weather_multiplier <= 0:
            raise ValueError("severe_weather_multiplier must be greater than 0")
        if self.distance_included_km < 0:
            raise ValueError("distance_included_km must be 0 or greater")
        if self.distance_surcharge_per_km < 0:
            raise ValueError("distance_surcharge_per_km must be 0 or greater")
        if self.service_fee < 0:
            raise ValueError("service_fee must be 0 or greater")
        if not 0 <= self.weekly_discount_percentage <= 100:
            raise ValueError("weekly_discount_percentage must be between 0 and 100")
        if not 0 <= self.monthly_discount_percentage <= 100:
            raise ValueError("monthly_discount_percentage must be between 0 and 100")
        return self
