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
