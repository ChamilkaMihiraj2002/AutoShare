from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.rent import list_rents_by_owner
from app.repositories.vehicle import list_vehicles_by_owner


ACTIVE_EARNING_STATUSES = {"accepted", "completed"}
REALIZED_EARNING_STATUS = "completed"


def _parse_datetime(value: datetime | str | None) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str) or not value:
        return None

    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _calculate_rent_amount(rent: dict, vehicle_price: float) -> float:
    start_date = _parse_datetime(rent.get("start_date"))
    end_date = _parse_datetime(rent.get("end_date"))
    if not start_date or not end_date:
        return 0.0

    duration = end_date - start_date
    days = max(1, duration.days)
    if duration.total_seconds() > days * 24 * 60 * 60:
        days += 1

    return round(vehicle_price * days, 2)


def _is_same_month(value: datetime | None, reference: datetime) -> bool:
    return bool(value and value.year == reference.year and value.month == reference.month)


async def get_owner_earnings_overview(db: AsyncIOMotorDatabase, *, owner_uid: str) -> dict:
    rents = await list_rents_by_owner(db=db, owner_uid=owner_uid)
    vehicles = await list_vehicles_by_owner(db=db, owner_uid=owner_uid)
    vehicle_by_id = {vehicle["_id"]: vehicle for vehicle in vehicles}

    now = datetime.now(timezone.utc)
    last_month_reference = datetime(
        year=now.year - 1 if now.month == 1 else now.year,
        month=12 if now.month == 1 else now.month - 1,
        day=1,
        tzinfo=timezone.utc,
    )

    this_month_amount = 0.0
    this_month_bookings = 0
    last_month_amount = 0.0
    last_month_bookings = 0
    all_time_amount = 0.0
    all_time_bookings = 0
    transactions: list[dict] = []

    for rent in rents:
        vehicle = vehicle_by_id.get(rent.get("vehicle_id"))
        if not vehicle:
            continue

        booking_status = rent.get("booking_status", "pending")
        if booking_status not in ACTIVE_EARNING_STATUSES:
            continue

        start_date = _parse_datetime(rent.get("start_date"))
        end_date = _parse_datetime(rent.get("end_date"))
        if not start_date or not end_date:
            continue

        amount = _calculate_rent_amount(rent, float(vehicle.get("price", 0)))

        transactions.append(
            {
                "rent_id": rent.get("_id", ""),
                "vehicle_id": rent.get("vehicle_id", ""),
                "vehicle_name": f'{vehicle.get("brand", "").strip()} {vehicle.get("model", "").strip()}'.strip()
                or f'Vehicle #{rent.get("vehicle_id", "")}',
                "renter_uid": rent.get("renter_uid", ""),
                "start_date": start_date,
                "end_date": end_date,
                "amount": amount,
                "booking_status": booking_status,
            }
        )

        if booking_status != REALIZED_EARNING_STATUS:
            continue

        all_time_amount += amount
        all_time_bookings += 1

        if _is_same_month(end_date, now):
            this_month_amount += amount
            this_month_bookings += 1
        elif _is_same_month(end_date, last_month_reference):
            last_month_amount += amount
            last_month_bookings += 1

    change_percentage = 0.0
    if last_month_amount > 0:
        change_percentage = round(((this_month_amount - last_month_amount) / last_month_amount) * 100, 2)
    elif this_month_amount > 0:
        change_percentage = 100.0

    transactions.sort(key=lambda item: item["end_date"], reverse=True)

    return {
        "summary": {
            "this_month": {
                "amount": round(this_month_amount, 2),
                "bookings": this_month_bookings,
            },
            "last_month": {
                "amount": round(last_month_amount, 2),
                "bookings": last_month_bookings,
            },
            "all_time": {
                "amount": round(all_time_amount, 2),
                "bookings": all_time_bookings,
            },
            "change_percentage": change_percentage,
        },
        "transactions": transactions[:10],
    }
