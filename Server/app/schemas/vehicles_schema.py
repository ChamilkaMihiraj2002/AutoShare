from pydantic import BaseModel, Field, model_validator
from typing import Optional


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
                "model": "Corolla"
            }
        }
