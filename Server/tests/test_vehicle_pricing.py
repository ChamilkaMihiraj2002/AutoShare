from types import SimpleNamespace

from app.services import vehicle_pricing
from app.services.vehicle_pricing import calculate_vehicle_pricing


def test_calculate_vehicle_pricing_applies_weekend_and_duration_discount(monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: set())
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: 0.0)
    monkeypatch.setattr(
        vehicle_pricing,
        "get_daily_weather_summary",
        lambda latitude, longitude, dates: SimpleNamespace(
            summary_by_date={booking_day.isoformat(): "clear" for booking_day in dates},
            note=None,
        ),
    )

    vehicle = {
        "price": 100.0,
        "dynamic_pricing": {
            "enabled": True,
            "weekend_multiplier": 1.2,
            "weekly_discount_percentage": 10,
            "monthly_discount_percentage": 0,
            "holiday_multiplier": 1.15,
            "rainy_weather_multiplier": 1.05,
            "severe_weather_multiplier": 1.12,
            "distance_included_km": 10,
            "distance_surcharge_per_km": 15,
            "service_fee": 9,
            "custom_date_multipliers": [],
        },
    }

    quote = calculate_vehicle_pricing(
        vehicle=vehicle,
        start_date="2026-05-22T09:00:00Z",
        end_date="2026-05-29T09:00:00Z",
    )

    assert quote.total_days == 7
    assert quote.subtotal == 740.0
    assert quote.duration_discount_percentage == 10
    assert quote.duration_discount_amount == 74.0
    assert quote.service_fee == 9
    assert quote.total == 666.0
    assert any("weekend" in multiplier for item in quote.line_items for multiplier in item["applied_multipliers"])


def test_calculate_vehicle_pricing_applies_custom_date_multiplier(monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: set())
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: 0.0)
    monkeypatch.setattr(
        vehicle_pricing,
        "get_daily_weather_summary",
        lambda latitude, longitude, dates: SimpleNamespace(
            summary_by_date={booking_day.isoformat(): "clear" for booking_day in dates},
            note=None,
        ),
    )

    vehicle = {
        "price": 100.0,
        "dynamic_pricing": {
            "enabled": True,
            "weekend_multiplier": 1.0,
            "weekly_discount_percentage": 0,
            "monthly_discount_percentage": 0,
            "holiday_multiplier": 1.15,
            "rainy_weather_multiplier": 1.05,
            "severe_weather_multiplier": 1.12,
            "distance_included_km": 10,
            "distance_surcharge_per_km": 15,
            "custom_date_multipliers": [
                {
                    "label": "Peak season",
                    "start_date": "2026-12-24",
                    "end_date": "2026-12-25",
                    "multiplier": 1.5,
                }
            ],
        },
    }

    quote = calculate_vehicle_pricing(
        vehicle=vehicle,
        start_date="2026-12-24T09:00:00Z",
        end_date="2026-12-26T09:00:00Z",
    )

    assert quote.subtotal == 300.0
    assert quote.total == 300.0
    assert quote.line_items[0]["adjusted_price"] == 150.0
    assert quote.line_items[1]["adjusted_price"] == 150.0


def test_calculate_vehicle_pricing_applies_holiday_weather_and_distance(monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: {vehicle_pricing.date(2026, 12, 25)})
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: 12.5)
    monkeypatch.setattr(
        vehicle_pricing,
        "get_daily_weather_summary",
        lambda latitude, longitude, dates: SimpleNamespace(
            summary_by_date={
                dates[0].isoformat(): "rain",
                dates[1].isoformat(): "severe",
            },
            note=None,
        ),
    )

    vehicle = {
        "price": 100.0,
        "dynamic_pricing": {
            "enabled": True,
            "weekend_multiplier": 1.0,
            "weekly_discount_percentage": 0,
            "monthly_discount_percentage": 0,
            "holiday_multiplier": 1.2,
            "rainy_weather_multiplier": 1.1,
            "severe_weather_multiplier": 1.3,
            "distance_included_km": 5,
            "distance_surcharge_per_km": 10,
            "custom_date_multipliers": [],
        },
    }

    quote = calculate_vehicle_pricing(
        vehicle=vehicle,
        start_date="2026-12-24T09:00:00Z",
        end_date="2026-12-26T09:00:00Z",
        pickup_latitude=6.9271,
        pickup_longitude=79.8612,
        destination_latitude=7.2906,
        destination_longitude=80.6337,
    )

    assert quote.subtotal == 266.0
    assert quote.distance_fee > 0
    assert quote.total > quote.subtotal
    assert quote.holiday_dates == ["2026-12-25"]
    assert "2026-12-24: rain" in quote.weather_summary


def test_calculate_vehicle_pricing_uses_vehicle_location_for_weather_fallback(monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: set())
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: 0.0)
    monkeypatch.setattr(vehicle_pricing, "geocode_location_label", lambda location: (6.9271, 79.8612))
    monkeypatch.setattr(
        vehicle_pricing,
        "get_daily_weather_summary",
        lambda latitude, longitude, dates: SimpleNamespace(
            summary_by_date={dates[0].isoformat(): "clear"},
            note=None,
        ),
    )

    vehicle = {
        "price": 100.0,
        "location": "Colombo",
        "dynamic_pricing": {
            "enabled": True,
            "weekend_multiplier": 1.0,
            "weekly_discount_percentage": 0,
            "monthly_discount_percentage": 0,
            "holiday_multiplier": 1.0,
            "rainy_weather_multiplier": 1.05,
            "severe_weather_multiplier": 1.12,
            "distance_included_km": 10,
            "distance_surcharge_per_km": 15,
            "custom_date_multipliers": [],
        },
    }

    quote = calculate_vehicle_pricing(
        vehicle=vehicle,
        start_date="2026-05-24T09:00:00Z",
        end_date="2026-05-25T09:00:00Z",
    )

    assert quote.weather_summary == ["2026-05-24: clear"]
    assert quote.weather_note is None


def test_weather_service_returns_forecast_window_note_when_dates_are_too_far(monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: set())
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: 0.0)
    monkeypatch.setattr(vehicle_pricing, "geocode_location_label", lambda location: (6.9271, 79.8612))

    future_start = vehicle_pricing.datetime.now(vehicle_pricing.timezone.utc) + vehicle_pricing.timedelta(days=30)
    future_end = future_start + vehicle_pricing.timedelta(days=2)

    vehicle = {
        "price": 100.0,
        "location": "Colombo",
        "dynamic_pricing": {
            "enabled": True,
            "weekend_multiplier": 1.0,
            "weekly_discount_percentage": 0,
            "monthly_discount_percentage": 0,
            "holiday_multiplier": 1.0,
            "rainy_weather_multiplier": 1.05,
            "severe_weather_multiplier": 1.12,
            "distance_included_km": 10,
            "distance_surcharge_per_km": 15,
            "custom_date_multipliers": [],
        },
    }

    quote = calculate_vehicle_pricing(
        vehicle=vehicle,
        start_date=future_start.isoformat(),
        end_date=future_end.isoformat(),
    )

    assert quote.weather_summary == []
    assert quote.weather_note is not None
    assert "Live weather forecast is only available through" in quote.weather_note


def test_calculate_vehicle_pricing_returns_zero_distance_when_route_service_fails(monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: set())
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: (_ for _ in ()).throw(RuntimeError("route failed")))
    monkeypatch.setattr(
        vehicle_pricing,
        "get_daily_weather_summary",
        lambda latitude, longitude, dates: SimpleNamespace(summary_by_date={}, note=None),
    )

    vehicle = {
        "price": 100.0,
        "dynamic_pricing": {
            "enabled": True,
            "distance_included_km": 5,
            "distance_surcharge_per_km": 10,
        },
    }

    quote = calculate_vehicle_pricing(
        vehicle=vehicle,
        start_date="2026-05-24T09:00:00Z",
        end_date="2026-05-25T09:00:00Z",
        pickup_latitude=6.9271,
        pickup_longitude=79.8612,
        destination_latitude=7.2906,
        destination_longitude=80.6337,
    )

    assert quote.distance_km == 0.0
    assert quote.distance_fee == 0.0


def test_calculate_vehicle_pricing_prefers_vehicle_distance_settings_over_global(monkeypatch):
    monkeypatch.setattr(vehicle_pricing, "get_public_holiday_dates", lambda country_code, years: set())
    monkeypatch.setattr(vehicle_pricing, "get_route_distance_km", lambda *args: 20.0)
    monkeypatch.setattr(
        vehicle_pricing,
        "get_daily_weather_summary",
        lambda latitude, longitude, dates: SimpleNamespace(summary_by_date={}, note=None),
    )

    vehicle = {
        "price": 100.0,
        "dynamic_pricing": {
            "distance_included_km": 12,
            "distance_surcharge_per_km": 25,
        },
    }
    global_dynamic_pricing = {
        "enabled": True,
        "distance_included_km": 5,
        "distance_surcharge_per_km": 10,
    }

    quote = calculate_vehicle_pricing(
        vehicle=vehicle,
        start_date="2026-05-24T09:00:00Z",
        end_date="2026-05-25T09:00:00Z",
        dynamic_pricing=global_dynamic_pricing,
        pickup_latitude=6.9271,
        pickup_longitude=79.8612,
        destination_latitude=7.2906,
        destination_longitude=80.6337,
    )

    assert quote.distance_km == 20.0
    assert quote.distance_fee == 200.0
