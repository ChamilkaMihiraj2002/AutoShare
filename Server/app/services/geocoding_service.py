from __future__ import annotations

from functools import lru_cache

import requests


NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
GEOCODER_USER_AGENT = "AutoShare/1.0 (dynamic-pricing)"


@lru_cache(maxsize=128)
def geocode_location_label(location_label: str) -> tuple[float, float] | None:
    normalized = (location_label or "").strip()
    if not normalized:
        return None

    response = requests.get(
        NOMINATIM_SEARCH_URL,
        params={
            "q": normalized,
            "format": "jsonv2",
            "limit": 1,
        },
        headers={
            "User-Agent": GEOCODER_USER_AGENT,
        },
        timeout=5,
    )
    response.raise_for_status()
    payload = response.json()
    if not payload:
        return None

    first_result = payload[0]
    lat = first_result.get("lat")
    lon = first_result.get("lon")
    if lat is None or lon is None:
        return None
    return float(lat), float(lon)
