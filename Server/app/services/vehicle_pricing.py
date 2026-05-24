from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from app.services.geocoding_service import geocode_location_label
from app.services.holiday_service import get_public_holiday_dates
from app.services.route_service import get_route_distance_km
from app.services.weather_service import get_daily_weather_summary


@dataclass
class PricingQuote:
    currency: str
    base_daily_price: float
    total_days: int
    subtotal: float
    duration_discount_percentage: float
    duration_discount_amount: float
    distance_km: float
    distance_fee: float
    holiday_dates: list[str]
    weather_summary: list[str]
    weather_note: str | None
    total: float
    line_items: list[dict]

    def to_dict(self) -> dict:
        return {
            "currency": self.currency,
            "base_daily_price": self.base_daily_price,
            "total_days": self.total_days,
            "subtotal": self.subtotal,
            "duration_discount_percentage": self.duration_discount_percentage,
            "duration_discount_amount": self.duration_discount_amount,
            "distance_km": self.distance_km,
            "distance_fee": self.distance_fee,
            "holiday_dates": self.holiday_dates,
            "weather_summary": self.weather_summary,
            "weather_note": self.weather_note,
            "total": self.total,
            "line_items": self.line_items,
        }


def _ensure_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _date_span(start_date: date, end_date: date) -> list[date]:
    if end_date <= start_date:
        return [start_date]
    days = (end_date - start_date).days
    return [start_date + timedelta(days=offset) for offset in range(days)]


def _resolve_duration_discount(total_days: int, dynamic_pricing: dict | None) -> float:
    if not dynamic_pricing or not dynamic_pricing.get("enabled"):
        return 0.0

    monthly_discount = float(dynamic_pricing.get("monthly_discount_percentage", 0) or 0)
    weekly_discount = float(dynamic_pricing.get("weekly_discount_percentage", 0) or 0)

    if total_days >= 30:
        return monthly_discount
    if total_days >= 7:
        return weekly_discount
    return 0.0


def calculate_vehicle_pricing(
    *,
    vehicle: dict,
    start_date: datetime | str,
    end_date: datetime | str,
    dynamic_pricing: dict | None = None,
    currency: str = "LKR",
    pickup_latitude: float | None = None,
    pickup_longitude: float | None = None,
    destination_latitude: float | None = None,
    destination_longitude: float | None = None,
    country_code: str = "LK",
) -> PricingQuote:
    start_dt = _ensure_datetime(start_date)
    end_dt = _ensure_datetime(end_date)
    if end_dt <= start_dt:
        raise ValueError("end_date must be after start_date")

    booking_days = _date_span(start_dt.date(), end_dt.date())
    base_daily_price = round(float(vehicle.get("price", 0) or 0), 2)
    resolved_dynamic_pricing = dynamic_pricing if dynamic_pricing is not None else (vehicle.get("dynamic_pricing") or {})
    is_dynamic_enabled = bool(resolved_dynamic_pricing.get("enabled"))
    weekend_multiplier = float(resolved_dynamic_pricing.get("weekend_multiplier", 1.0) or 1.0)
    holiday_multiplier = float(resolved_dynamic_pricing.get("holiday_multiplier", 1.0) or 1.0)
    rainy_weather_multiplier = float(resolved_dynamic_pricing.get("rainy_weather_multiplier", 1.0) or 1.0)
    severe_weather_multiplier = float(resolved_dynamic_pricing.get("severe_weather_multiplier", 1.0) or 1.0)
    distance_included_km = float(resolved_dynamic_pricing.get("distance_included_km", 0.0) or 0.0)
    distance_surcharge_per_km = float(resolved_dynamic_pricing.get("distance_surcharge_per_km", 0.0) or 0.0)
    custom_date_multipliers = resolved_dynamic_pricing.get("custom_date_multipliers") or []
    holiday_dates = get_public_holiday_dates(country_code, {booking_day.year for booking_day in booking_days}) if is_dynamic_enabled else set()
    weather_latitude = destination_latitude if destination_latitude is not None else pickup_latitude
    weather_longitude = destination_longitude if destination_longitude is not None else pickup_longitude
    if is_dynamic_enabled and (weather_latitude is None or weather_longitude is None):
        fallback_coords = geocode_location_label(str(vehicle.get("location") or ""))
        if fallback_coords is not None:
            weather_latitude, weather_longitude = fallback_coords

    weather_lookup = get_daily_weather_summary(weather_latitude, weather_longitude, booking_days) if is_dynamic_enabled else None
    weather_by_date = weather_lookup.summary_by_date if weather_lookup else {}

    line_items: list[dict] = []
    subtotal = 0.0

    for booking_day in booking_days:
        adjusted_price = base_daily_price
        applied_multipliers: list[str] = []

        if is_dynamic_enabled and booking_day.weekday() >= 5 and weekend_multiplier != 1:
            adjusted_price *= weekend_multiplier
            applied_multipliers.append(f"weekend x{weekend_multiplier:.2f}")

        if is_dynamic_enabled:
            if booking_day in holiday_dates and holiday_multiplier != 1:
                adjusted_price *= holiday_multiplier
                applied_multipliers.append(f"holiday x{holiday_multiplier:.2f}")

            weather_condition = weather_by_date.get(booking_day.isoformat())
            if weather_condition == "rain" and rainy_weather_multiplier != 1:
                adjusted_price *= rainy_weather_multiplier
                applied_multipliers.append(f"rain weather x{rainy_weather_multiplier:.2f}")
            elif weather_condition == "severe" and severe_weather_multiplier != 1:
                adjusted_price *= severe_weather_multiplier
                applied_multipliers.append(f"severe weather x{severe_weather_multiplier:.2f}")

            for custom_multiplier in custom_date_multipliers:
                start = custom_multiplier.get("start_date")
                end = custom_multiplier.get("end_date")
                multiplier = float(custom_multiplier.get("multiplier", 1.0) or 1.0)
                label = (custom_multiplier.get("label") or "date rule").strip()
                if not start or not end:
                    continue
                start_rule = date.fromisoformat(str(start))
                end_rule = date.fromisoformat(str(end))
                if start_rule <= booking_day <= end_rule:
                    adjusted_price *= multiplier
                    applied_multipliers.append(f"{label} x{multiplier:.2f}")

        adjusted_price = round(adjusted_price, 2)
        subtotal += adjusted_price
        line_items.append(
            {
                "date": booking_day.isoformat(),
                "base_price": base_daily_price,
                "adjusted_price": adjusted_price,
                "applied_multipliers": applied_multipliers,
            }
        )

    subtotal = round(subtotal, 2)
    duration_discount_percentage = _resolve_duration_discount(len(booking_days), resolved_dynamic_pricing)
    duration_discount_amount = round(subtotal * (duration_discount_percentage / 100), 2)
    try:
        distance_km = get_route_distance_km(
            pickup_latitude,
            pickup_longitude,
            destination_latitude,
            destination_longitude,
        )
    except Exception:
        distance_km = 0.0
    extra_distance_km = max(0.0, distance_km - distance_included_km)
    distance_fee = round(extra_distance_km * distance_surcharge_per_km, 2) if is_dynamic_enabled else 0.0
    total = round(subtotal - duration_discount_amount + distance_fee, 2)

    return PricingQuote(
        currency=currency,
        base_daily_price=base_daily_price,
        total_days=len(booking_days),
        subtotal=subtotal,
        duration_discount_percentage=duration_discount_percentage,
        duration_discount_amount=duration_discount_amount,
        distance_km=distance_km,
        distance_fee=distance_fee,
        holiday_dates=sorted(day.isoformat() for day in holiday_dates if day in booking_days),
        weather_summary=[
            f"{booking_day.isoformat()}: {weather_by_date[booking_day.isoformat()]}"
            for booking_day in booking_days
            if booking_day.isoformat() in weather_by_date
        ],
        weather_note=weather_lookup.note if weather_lookup else None,
        total=total,
        line_items=line_items,
    )
