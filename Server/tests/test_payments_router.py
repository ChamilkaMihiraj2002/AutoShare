import pytest

from app.routers import payments as payments_router


@pytest.mark.asyncio
async def test_create_payhere_checkout_session_uses_sandbox(fake_db, monkeypatch):
    monkeypatch.setenv("PAYHERE_SANDBOX", "true")
    monkeypatch.setenv("PAYHERE_MERCHANT_ID", "1234567")
    monkeypatch.setenv("PAYHERE_MERCHANT_SECRET", "secret")
    monkeypatch.setenv("PAYHERE_NOTIFY_URL", "https://example.com/api/payhere/notify")
    monkeypatch.setenv("PAYHERE_RETURN_URL", "http://localhost:5173/user-dashboard/bookings")
    monkeypatch.setenv("PAYHERE_CANCEL_URL", "http://localhost:5173/vehicle-booking/veh_1")

    await fake_db["users"].insert_one(
        {
            "_id": "renter_1",
            "email": "renter@example.com",
            "full_name": "Jane Doe",
            "address": "123 Main Street",
            "city": "Kandy",
            "postal_code": "20000",
            "nic": "123456789V",
            "phone": "+94770000000",
            "roles": ["renter"],
        }
    )
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
            "_id": "rent_1",
            "renter_uid": "renter_1",
            "owner_uid": "owner_1",
            "vehicle_id": "veh_1",
            "start_date": "2026-04-01T09:00:00Z",
            "end_date": "2026-04-03T09:00:00Z",
            "booking_status": "pending",
            "pricing_snapshot": {
                "currency": "LKR",
                "total": 24000,
                "service_fee": 2500,
            },
        }
    )

    session = await payments_router.create_payhere_checkout_session(
        payments_router.PayHereCheckoutSessionRequest(rent_id="rent_1"),
        decoded_token={"uid": "renter_1", "email": "renter@example.com"},
        db=fake_db,
    )

    assert session.action_url == "https://sandbox.payhere.lk/pay/checkout"
    assert session.order_id == "rent_1"
    assert session.amount == "26500.00"
    assert session.first_name == "Jane"
    assert session.last_name == "Doe"
    assert session.city == "Kandy"
    assert session.hash
    rent = await fake_db["rents"].find_one({"_id": "rent_1"})
    assert rent["payment_summary"]["provider"] == "payhere"
    assert rent["payment_summary"]["amount"] == "26500.00"
    assert rent["payment_summary"]["payer"]["postal_code"] == "20000"
    assert rent["payment_summary"]["payer"]["phone"] == "+94770000000"


@pytest.mark.asyncio
async def test_handle_payhere_notify_updates_payment_summary(fake_db):
    await fake_db["rents"].insert_one(
        {
            "_id": "rent_1",
            "renter_uid": "renter_1",
            "vehicle_id": "veh_1",
        }
    )

    class FakeRequest:
        async def form(self):
            return {
                "order_id": "rent_1",
                "payment_id": "pay_123",
                "payhere_amount": "24000.00",
                "payhere_currency": "LKR",
                "status_code": "2",
                "status_message": "success",
                "method": "VISA",
            }

    response = await payments_router.handle_payhere_notify(FakeRequest(), db=fake_db)

    assert response == {"status": "ok"}
    rent = await fake_db["rents"].find_one({"_id": "rent_1"})
    assert rent["payment_summary"] == {
        "provider": "payhere",
        "status": "success",
        "order_id": "rent_1",
        "payment_id": "pay_123",
        "status_code": "2",
        "status_message": "success",
        "method": "VISA",
        "currency": "LKR",
        "amount": "24000.00",
    }
