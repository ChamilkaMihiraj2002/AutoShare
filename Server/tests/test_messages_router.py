import pytest
from fastapi import HTTPException

from app.routers import messages as messages_router
from app.schemas import ConversationCreate, MessageCreate


@pytest.mark.asyncio
async def test_renter_can_create_conversation_with_initial_message(fake_db):
    await fake_db["users"].insert_one(
        {"_id": "owner_1", "email": "owner@example.com", "address": "A", "nic": "N", "phone": "P", "roles": ["vehicle_owner"]}
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

    created = await messages_router.create_conversation_endpoint(
        ConversationCreate(vehicle_id="veh_1", owner_uid="owner_1", initial_message="Hi, is this available tomorrow?"),
        decoded_token={"uid": "renter_1"},
        db=fake_db,
    )

    assert created["owner_uid"] == "owner_1"
    assert created["renter_uid"] == "renter_1"
    assert len(created["messages"]) == 1
    assert created["messages"][0]["text"] == "Hi, is this available tomorrow?"


@pytest.mark.asyncio
async def test_participant_can_send_message(fake_db):
    await fake_db["conversations"].insert_one(
        {
            "_id": "conv_1",
            "vehicle_id": "veh_1",
            "owner_uid": "owner_1",
            "renter_uid": "renter_1",
            "created_at": "2026-05-26T10:00:00+00:00",
            "updated_at": "2026-05-26T10:00:00+00:00",
            "last_message_at": None,
            "last_message_preview": None,
            "last_message_sender_uid": None,
            "messages": [],
        }
    )

    updated = await messages_router.send_message(
        "conv_1",
        MessageCreate(text="Yes, it is still available."),
        decoded_token={"uid": "owner_1"},
        db=fake_db,
    )

    assert len(updated["messages"]) == 1
    assert updated["messages"][0]["sender_uid"] == "owner_1"
    assert updated["last_message_preview"] == "Yes, it is still available."


@pytest.mark.asyncio
async def test_non_participant_cannot_read_conversation(fake_db):
    await fake_db["conversations"].insert_one(
        {
            "_id": "conv_1",
            "vehicle_id": "veh_1",
            "owner_uid": "owner_1",
            "renter_uid": "renter_1",
            "created_at": "2026-05-26T10:00:00+00:00",
            "updated_at": "2026-05-26T10:00:00+00:00",
            "last_message_at": None,
            "last_message_preview": None,
            "last_message_sender_uid": None,
            "messages": [],
        }
    )

    with pytest.raises(HTTPException) as exc_info:
        await messages_router.get_conversation("conv_1", decoded_token={"uid": "someone_else"}, db=fake_db)

    assert exc_info.value.status_code == 403
