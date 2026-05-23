from __future__ import annotations

from datetime import date
from functools import lru_cache

import requests


NAGER_DATE_BASE_URL = "https://date.nager.at/api/v3"


@lru_cache(maxsize=32)
def _get_public_holidays_for_year(country_code: str, year: int) -> tuple[str, ...]:
    response = requests.get(
        f"{NAGER_DATE_BASE_URL}/publicholidays/{year}/{country_code}",
        timeout=5,
    )
    response.raise_for_status()
    holidays = response.json()
    return tuple(item["date"] for item in holidays if item.get("date"))


def get_public_holiday_dates(country_code: str, years: set[int]) -> set[date]:
    holiday_dates: set[date] = set()
    for year in years:
        try:
            entries = _get_public_holidays_for_year(country_code.upper(), year)
        except requests.RequestException:
            continue
        for entry in entries:
            try:
                holiday_dates.add(date.fromisoformat(entry))
            except ValueError:
                continue
    return holiday_dates
