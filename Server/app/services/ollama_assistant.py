import os
import re

import requests

from app.schemas import AssistantChatTurn
from app.schemas.vehicles_schema import normalize_vehicle_image_url

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "25"))
GENERIC_QUERY_WORDS = {
    "best",
    "vehicle",
    "vehicles",
    "car",
    "cars",
    "need",
    "want",
    "show",
    "find",
    "looking",
    "for",
    "with",
    "and",
    "the",
    "that",
    "from",
    "near",
    "good",
    "recommend",
    "recommended",
}
VEHICLE_TYPE_KEYWORDS = {"sedan", "suv", "coupe", "hatchback", "convertible", "truck", "van", "car", "jeep"}
FUEL_KEYWORDS = {"petrol", "diesel", "electric", "hybrid"}
TRANSMISSION_KEYWORDS = {"automatic", "manual"}


def _vehicle_name(vehicle: dict) -> str:
    return f"{vehicle.get('brand', '').strip()} {vehicle.get('model', '').strip()}".strip() or "Vehicle"


def _extract_seat_request(query: str) -> int | None:
    match = re.search(r"(\d+)\s*[- ]?\s*seat", query)
    if match:
        return int(match.group(1))
    return None


def _extract_query_preferences(query: str) -> dict:
    tokens = re.findall(r"[a-z0-9]+", query.lower())
    requested_seats = _extract_seat_request(query)
    budget_priority = any(word in query.lower() for word in ("cheap", "budget", "affordable", "low price"))
    premium_priority = any(word in query.lower() for word in ("best", "premium", "luxury", "top"))
    requested_type = next((token for token in tokens if token in VEHICLE_TYPE_KEYWORDS), None)
    requested_fuel = next((token for token in tokens if token in FUEL_KEYWORDS), None)
    requested_transmission = next((token for token in tokens if token in TRANSMISSION_KEYWORDS), None)
    location_terms = [
        token
        for token in tokens
        if len(token) > 2
        and token not in GENERIC_QUERY_WORDS
        and token not in VEHICLE_TYPE_KEYWORDS
        and token not in FUEL_KEYWORDS
        and token not in TRANSMISSION_KEYWORDS
        and not token.isdigit()
    ]

    return {
        "tokens": tokens,
        "requested_seats": requested_seats,
        "budget_priority": budget_priority,
        "premium_priority": premium_priority,
        "requested_type": requested_type,
        "requested_fuel": requested_fuel,
        "requested_transmission": requested_transmission,
        "location_terms": location_terms,
    }


def _matches_preferences(vehicle: dict, preferences: dict) -> bool:
    searchable_text = " ".join(
        [
            str(vehicle.get("location", "")),
            str(vehicle.get("type", "")),
            str(vehicle.get("fuel", "")),
            str(vehicle.get("transmission", "")),
            str(vehicle.get("brand", "")),
            str(vehicle.get("model", "")),
        ]
    ).lower()

    requested_type = preferences.get("requested_type")
    if requested_type and requested_type not in str(vehicle.get("type", "")).lower():
        return False

    requested_fuel = preferences.get("requested_fuel")
    if requested_fuel and requested_fuel not in str(vehicle.get("fuel", "")).lower():
        return False

    requested_transmission = preferences.get("requested_transmission")
    if requested_transmission and requested_transmission not in str(vehicle.get("transmission", "")).lower():
        return False

    requested_seats = preferences.get("requested_seats")
    if requested_seats is not None and int(vehicle.get("seats") or 0) < requested_seats:
        return False

    location_terms = preferences.get("location_terms") or []
    if location_terms and not any(term in searchable_text for term in location_terms):
        return False

    return True


def _score_vehicle(vehicle: dict, query: str, requested_seats: int | None) -> tuple[float, str]:
    score = 0.0
    reasons: list[str] = []
    query_text = query.lower()

    if bool(vehicle.get("availability")):
        score += 60
        reasons.append("available now")

    if vehicle.get("verification_status") == "verified":
        score += 20
        reasons.append("verified listing")

    price = float(vehicle.get("price") or 0)
    score += max(0, 20 - min(price / 1000, 20))
    if price > 0:
        reasons.append(f"LKR {price:.0f}/day")

    if requested_seats is not None:
        seats = int(vehicle.get("seats") or 0)
        if seats >= requested_seats:
            score += 15
            reasons.append(f"fits {requested_seats} passengers")
        else:
            score -= 15

    searchable_fields = [
        str(vehicle.get("type", "")),
        str(vehicle.get("fuel", "")),
        str(vehicle.get("transmission", "")),
        str(vehicle.get("location", "")),
        str(vehicle.get("brand", "")),
        str(vehicle.get("model", "")),
    ]
    searchable_text = " ".join(searchable_fields).lower()
    for token in re.findall(r"[a-z0-9]+", query_text):
        if len(token) > 2 and token in searchable_text:
            score += 4

    if "cheap" in query_text or "budget" in query_text or "low price" in query_text:
        score += max(0, 12 - min(price / 1500, 12))
        reasons.append("budget-friendly price")

    if "best" in query_text or "top" in query_text or "recommended" in query_text:
        if vehicle.get("verification_status") == "verified":
            reasons.append("strong trust signal")

    return score, ", ".join(dict.fromkeys(reasons)) or "good overall match"


def shortlist_vehicles_for_prompt(vehicles: list[dict], query: str, limit: int = 6) -> list[dict]:
    preferences = _extract_query_preferences(query)
    requested_seats = preferences["requested_seats"]
    available = [vehicle for vehicle in vehicles if bool(vehicle.get("availability"))]
    matching = [vehicle for vehicle in available if _matches_preferences(vehicle, preferences)]
    candidate_pool = matching if matching else available
    scored: list[tuple[float, dict, str]] = []

    for vehicle in candidate_pool:
        score, reason = _score_vehicle(vehicle, query, requested_seats)

        if preferences["requested_type"] and preferences["requested_type"] in str(vehicle.get("type", "")).lower():
            score += 18
            reason = f"{reason}, matches requested type"
        if preferences["requested_fuel"] and preferences["requested_fuel"] in str(vehicle.get("fuel", "")).lower():
            score += 10
            reason = f"{reason}, matches fuel preference"
        if preferences["requested_transmission"] and preferences["requested_transmission"] in str(vehicle.get("transmission", "")).lower():
            score += 8
            reason = f"{reason}, matches transmission preference"
        if preferences["location_terms"]:
            location_text = " ".join(
                [
                    str(vehicle.get("location", "")),
                    str(vehicle.get("brand", "")),
                    str(vehicle.get("model", "")),
                ]
            ).lower()
            if any(term in location_text for term in preferences["location_terms"]):
                score += 14
                reason = f"{reason}, close to requested location"
        if preferences["budget_priority"]:
            score += max(0, 20 - min(float(vehicle.get("price") or 0) / 1000, 20))
        if preferences["premium_priority"] and vehicle.get("verification_status") == "verified":
            score += 8

        enriched = vehicle.copy()
        enriched["_assistant_reason"] = ", ".join(dict.fromkeys(part.strip() for part in reason.split(",") if part.strip()))
        enriched["_assistant_score"] = round(score, 2)
        scored.append((score, enriched, enriched["_assistant_reason"]))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored[:limit]]


def build_fallback_reply(query: str, shortlist: list[dict]) -> str:
    if not shortlist:
        return (
            "I could not find any available vehicles right now. "
            "Please try another location or vehicle type."
        )

    preferences = _extract_query_preferences(query)
    summary_parts: list[str] = []
    if preferences["requested_type"]:
        summary_parts.append(preferences["requested_type"])
    if preferences["requested_fuel"]:
        summary_parts.append(preferences["requested_fuel"])
    if preferences["requested_transmission"]:
        summary_parts.append(preferences["requested_transmission"])
    if preferences["requested_seats"] is not None:
        summary_parts.append(f"{preferences['requested_seats']}-seater")
    if preferences["location_terms"]:
        summary_parts.append("in " + " ".join(preferences["location_terms"]))

    intro = "Here are the best available vehicles I found"
    if summary_parts:
        intro += f" for {' '.join(summary_parts)}"
    intro += ":"

    lines = [intro]
    for vehicle in shortlist[:3]:
        name = _vehicle_name(vehicle)
        location = vehicle.get("location") or "Unknown location"
        price = float(vehicle.get("price") or 0)
        reason = vehicle.get("_assistant_reason") or "good match"
        lines.append(f"- {name} in {location} at LKR {price:.0f}/day ({reason}).")
    lines.append("Open a vehicle to see details and continue booking.")
    return " ".join(lines)


def build_prompt(query: str, history: list[AssistantChatTurn], shortlist: list[dict]) -> str:
    history_lines = [
        f"{turn.role.title()}: {turn.content}"
        for turn in history[-6:]
        if turn.role in {"user", "assistant"}
    ]

    vehicle_lines = []
    for vehicle in shortlist:
        vehicle_lines.append(
            (
                f"ID: {vehicle.get('_id')}; Name: {_vehicle_name(vehicle)}; "
                f"Type: {vehicle.get('type')}; Location: {vehicle.get('location')}; "
                f"PricePerDayLKR: {vehicle.get('price')}; Seats: {vehicle.get('seats')}; "
                f"Fuel: {vehicle.get('fuel')}; Transmission: {vehicle.get('transmission')}; "
                f"Verified: {vehicle.get('verification_status') == 'verified'}; "
                f"Reason: {vehicle.get('_assistant_reason')}"
            )
        )

    return (
        "You are the AutoShare vehicle assistant. "
        "Recommend only vehicles from the provided list. "
        "Only mention available vehicles. "
        "Keep responses short, practical, and friendly. "
        "If the user asks for the best option, rank by overall fit, trust, and value. "
        "Mention 2 to 4 vehicles maximum and explain why in simple language. "
        "If no good match exists, say that clearly.\n\n"
        f"Recent chat:\n{chr(10).join(history_lines) or 'No prior messages'}\n\n"
        f"User request:\n{query}\n\n"
        f"Available vehicles:\n{chr(10).join(vehicle_lines) or 'None'}"
    )


def query_ollama_chat(query: str, history: list[AssistantChatTurn], shortlist: list[dict]) -> str:
    prompt = build_prompt(query, history, shortlist)
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        },
        timeout=OLLAMA_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()
    text = str(payload.get("response", "")).strip()
    if not text:
        raise ValueError("Ollama returned an empty response")
    return text


def build_recommendation_payload(shortlist: list[dict]) -> list[dict]:
    recommendations: list[dict] = []
    for vehicle in shortlist[:4]:
        recommendations.append(
            {
                "vehicle_id": str(vehicle.get("_id") or ""),
                "name": _vehicle_name(vehicle),
                "location": str(vehicle.get("location") or ""),
                "price_per_day": float(vehicle.get("price") or 0),
                "seats": int(vehicle.get("seats") or 0),
                "type": str(vehicle.get("type") or ""),
                "fuel": str(vehicle.get("fuel") or ""),
                "transmission": str(vehicle.get("transmission") or ""),
                "availability": bool(vehicle.get("availability")),
                "verified": vehicle.get("verification_status") == "verified",
                "image_url": normalize_vehicle_image_url(vehicle.get("image_url")),
                "reason": str(vehicle.get("_assistant_reason") or "Recommended match"),
            }
        )
    return recommendations
