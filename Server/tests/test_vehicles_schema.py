import pytest

from app.schemas import VehicleUpdate, Vehicle


def test_vehicle_update_validation_rejects_empty():
    with pytest.raises(ValueError):
        VehicleUpdate()


def test_vehicle_model_alias_and_fields():
    payload = {
        "_id": "veh_alias",
        "owner_uid": "owner_x",
        "type": "car",
        "fuel": "petrol",
        "transmission": "automatic",
        "price": 20.5,
        "availability": True,
        "location": "Colombo",
        "brand": "Honda",
        "year": 2019,
        "model": "Civic",
    }
    obj = Vehicle(**payload)
    assert obj.vehicleid == "veh_alias"
    assert obj.owner_uid == "owner_x"
    assert obj.price == 20.5


def test_vehicle_dynamic_pricing_fields_are_supported():
    payload = {
        "_id": "veh_dynamic",
        "owner_uid": "owner_dynamic",
        "type": "car",
        "fuel": "petrol",
        "transmission": "automatic",
        "price": 100.0,
        "availability": True,
        "location": "Colombo",
        "brand": "Honda",
        "year": 2019,
        "model": "Civic",
        "dynamic_pricing": {
            "enabled": True,
            "weekend_multiplier": 1.15,
            "weekly_discount_percentage": 5,
            "monthly_discount_percentage": 12,
            "custom_date_multipliers": [
                {
                    "label": "Peak season",
                    "start_date": "2026-12-20",
                    "end_date": "2026-12-31",
                    "multiplier": 1.3,
                }
            ],
        },
    }

    obj = Vehicle(**payload)
    assert obj.dynamic_pricing is not None
    assert obj.dynamic_pricing.enabled is True
    assert obj.dynamic_pricing.weekend_multiplier == 1.15
    assert obj.dynamic_pricing.custom_date_multipliers[0].label == "Peak season"


def test_vehicle_verification_fields_are_supported_and_normalized():
    payload = {
        "_id": "veh_verified",
        "owner_uid": "owner_verified",
        "type": "car",
        "fuel": "petrol",
        "transmission": "automatic",
        "price": 90.0,
        "availability": True,
        "location": "Colombo",
        "brand": "Toyota",
        "year": 2022,
        "model": "Axio",
        "verification_status": "pending",
        "verification_documents": {
            "vehicle_book_url": "https://example.com/uploads/vehicle-documents/book.pdf",
            "vehicle_license_url": "uploads/vehicle-documents/license.pdf",
        },
    }

    obj = Vehicle(**payload)
    assert obj.verification_status == "pending"
    assert obj.verification_documents.vehicle_book_url == "/uploads/vehicle-documents/book.pdf"
    assert obj.verification_documents.vehicle_license_url == "/uploads/vehicle-documents/license.pdf"
