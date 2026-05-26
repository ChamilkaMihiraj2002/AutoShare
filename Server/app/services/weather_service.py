from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache

import requests


OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

SEVERE_WEATHER_CODES = {95, 96, 99}
RAINY_WEATHER_CODES = {51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82}


@dataclass
class WeatherLookupResult:
    summary_by_date: dict[str, str]
    note: str | None = None


@lru_cache(maxsize=128)
def _fetch_daily_weather(latitude: float, longitude: float, start_date: str, end_date: str) -> dict[str, dict]:
    response = requests.get(
        OPEN_METEO_FORECAST_URL,
        params={
            "latitude": latitude,
            "longitude": longitude,
            "daily": "weather_code,precipitation_sum,rain_sum,showers_sum,wind_speed_10m_max",
            "timezone": "auto",
            "start_date": start_date,
            "end_date": end_date,
        },
        timeout=5,
    )
    response.raise_for_status()
    payload = response.json().get("daily") or {}
    times = payload.get("time") or []
    weather_codes = payload.get("weather_code") or []
    precipitation_sum = payload.get("precipitation_sum") or []
    rain_sum = payload.get("rain_sum") or []
    shower_sum = payload.get("showers_sum") or []
    wind_speed = payload.get("wind_speed_10m_max") or []

    results: dict[str, dict] = {}
    for index, current_date in enumerate(times):
        results[current_date] = {
            "weather_code": weather_codes[index] if index < len(weather_codes) else None,
            "precipitation_sum": precipitation_sum[index] if index < len(precipitation_sum) else 0,
            "rain_sum": rain_sum[index] if index < len(rain_sum) else 0,
            "showers_sum": shower_sum[index] if index < len(shower_sum) else 0,
            "wind_speed_10m_max": wind_speed[index] if index < len(wind_speed) else 0,
        }
    return results


def get_daily_weather_summary(latitude: float | None, longitude: float | None, dates: list[date]) -> WeatherLookupResult:
    if latitude is None or longitude is None or not dates:
        return WeatherLookupResult(summary_by_date={}, note="Location coordinates were unavailable for weather lookup.")

    today = datetime.now(timezone.utc).date()
    forecast_limit = today + timedelta(days=16)
    if max(dates) > forecast_limit:
        return WeatherLookupResult(
            summary_by_date={},
            note=f"Live weather forecast is only available through {forecast_limit.isoformat()}.",
        )

    try:
        daily_weather = _fetch_daily_weather(
            round(latitude, 4),
            round(longitude, 4),
            min(dates).isoformat(),
            max(dates).isoformat(),
        )
    except requests.RequestException:
        return WeatherLookupResult(summary_by_date={}, note="Weather service is temporarily unavailable.")

    summary: dict[str, str] = {}
    for current_date in dates:
        details = daily_weather.get(current_date.isoformat()) or {}
        weather_code = details.get("weather_code")
        rain_total = float(details.get("rain_sum") or 0) + float(details.get("showers_sum") or 0)
        precipitation_total = float(details.get("precipitation_sum") or 0)
        wind_speed = float(details.get("wind_speed_10m_max") or 0)

        if weather_code in SEVERE_WEATHER_CODES or precipitation_total >= 20 or wind_speed >= 45:
            summary[current_date.isoformat()] = "severe"
        elif weather_code in RAINY_WEATHER_CODES or rain_total > 0 or precipitation_total >= 3:
            summary[current_date.isoformat()] = "rain"
        else:
            summary[current_date.isoformat()] = "clear"

    if not summary:
        return WeatherLookupResult(summary_by_date={}, note="No daily weather forecast was returned for the selected dates.")

    return WeatherLookupResult(summary_by_date=summary, note=None)
