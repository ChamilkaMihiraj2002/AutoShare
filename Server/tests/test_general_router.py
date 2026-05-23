import pytest
from types import SimpleNamespace

from app.routers import general as general_router
from app.services import vehicle_pricing


@pytest.mark.asyncio
async def test_public_vehicle_pricing_quote_returns_dynamic_totals(fake_db, monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: set())
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: 15.0)
    monkeypatch.setattr(
        vehicle_pricing,
        "get_daily_weather_summary",
        lambda latitude, longitude, dates: SimpleNamespace(
            summary_by_date={booking_day.isoformat(): "clear" for booking_day in dates},
            note=None,
        ),
    )

    await fake_db["vehicles"].insert_one(
        {
            "_id": "veh_quote",
            "owner_uid": "owner_1",
            "type": "car",
            "fuel": "petrol",
            "transmission": "automatic",
            "price": 100.0,
            "availability": True,
            "location": "Colombo",
            "brand": "Toyota",
            "year": 2022,
            "model": "Yaris",
            "dynamic_pricing": {
                "enabled": True,
                "weekend_multiplier": 1.1,
                "weekly_discount_percentage": 0,
                "monthly_discount_percentage": 0,
                "holiday_multiplier": 1.15,
                "rainy_weather_multiplier": 1.05,
                "severe_weather_multiplier": 1.12,
                "distance_included_km": 10,
                "distance_surcharge_per_km": 15,
                "custom_date_multipliers": [],
            },
        }
    )

    quote = await general_router.public_vehicle_pricing_quote(
        "veh_quote",
        start_date="2026-05-23T09:00:00Z",
        end_date="2026-05-25T09:00:00Z",
        pickup_latitude=6.9271,
        pickup_longitude=79.8612,
        destination_latitude=7.2906,
        destination_longitude=80.6337,
        country_code="LK",
        db=fake_db,
    )

    assert quote["total_days"] == 2
    assert quote["subtotal"] == 220.0
    assert quote["distance_km"] == 15.0
    assert quote["distance_fee"] > 0
    assert quote["total"] > 220.0
