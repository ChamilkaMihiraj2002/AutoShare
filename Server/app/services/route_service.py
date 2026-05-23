from __future__ import annotations

from functools import lru_cache

import requests


OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}"


@lru_cache(maxsize=256)
def get_route_distance_km(
    start_latitude: float | None,
    start_longitude: float | None,
    end_latitude: float | None,
    end_longitude: float | None,
) -> float:
    if None in {start_latitude, start_longitude, end_latitude, end_longitude}:
        return 0.0

    response = requests.get(
        OSRM_ROUTE_URL.format(
            start_lat=start_latitude,
            start_lng=start_longitude,
            end_lat=end_latitude,
            end_lng=end_longitude,
        ),
        params={
            "overview": "false",
            "alternatives": "false",
            "steps": "false",
        },
        timeout=5,
    )
    response.raise_for_status()
    payload = response.json()
    routes = payload.get("routes") or []
    if not routes:
        return 0.0

    distance_meters = routes[0].get("distance")
    if distance_meters is None:
        return 0.0

    return round(float(distance_meters) / 1000, 2)
