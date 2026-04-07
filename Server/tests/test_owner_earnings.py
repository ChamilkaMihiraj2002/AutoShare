from datetime import datetime, timedelta, timezone

import pytest

from app.routers import rents as rents_router


@pytest.mark.asyncio
async def test_owner_earnings_returns_summary_and_recent_transactions(fake_db):
    now = datetime.now(timezone.utc)
    this_month_start = now.replace(day=2, hour=9, minute=0, second=0, microsecond=0)
    last_month_anchor = (now.replace(day=1) - timedelta(days=1)).replace(day=3, hour=9, minute=0, second=0, microsecond=0)

    await fake_db["vehicles"].insert_one(
        {
            "_id": "veh_1",
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
        }
    )
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_completed_this_month",
            "renter_uid": "renter_1",
            "owner_uid": "owner_1",
            "vehicle_id": "veh_1",
            "start_date": (this_month_start - timedelta(days=2)).isoformat(),
            "end_date": this_month_start.isoformat(),
            "booking_status": "completed",
        }
    )
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_completed_last_month",
            "renter_uid": "renter_2",
            "owner_uid": "owner_1",
            "vehicle_id": "veh_1",
            "start_date": (last_month_anchor - timedelta(days=3)).isoformat(),
            "end_date": last_month_anchor.isoformat(),
            "booking_status": "completed",
        }
    )
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_accepted_future",
            "renter_uid": "renter_3",
            "owner_uid": "owner_1",
            "vehicle_id": "veh_1",
            "start_date": (now + timedelta(days=2)).isoformat(),
            "end_date": (now + timedelta(days=5)).isoformat(),
            "booking_status": "accepted",
        }
    )
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_cancelled",
            "renter_uid": "renter_4",
            "owner_uid": "owner_1",
            "vehicle_id": "veh_1",
            "start_date": now.isoformat(),
            "end_date": (now + timedelta(days=1)).isoformat(),
            "booking_status": "cancelled",
        }
    )

    overview = await rents_router.get_owner_earnings(decoded_token={"uid": "owner_1"}, db=fake_db)

    assert overview["summary"]["this_month"]["amount"] == 200.0
    assert overview["summary"]["this_month"]["bookings"] == 1
    assert overview["summary"]["last_month"]["amount"] == 300.0
    assert overview["summary"]["last_month"]["bookings"] == 1
    assert overview["summary"]["all_time"]["amount"] == 500.0
    assert overview["summary"]["all_time"]["bookings"] == 2
    assert overview["summary"]["change_percentage"] == pytest.approx(-33.33, rel=1e-2)
    assert [transaction["rent_id"] for transaction in overview["transactions"]] == [
        "rent_accepted_future",
        "rent_completed_this_month",
        "rent_completed_last_month",
    ]
