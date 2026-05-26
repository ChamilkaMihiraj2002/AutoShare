from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.auth_deps import get_current_user
from app.core.db import get_database
from app.repositories.message import add_message, create_conversation, get_conversation_by_id, list_user_conversations
from app.repositories.user import get_user_profile_by_uid
from app.repositories.vehicle import get_vehicle_by_id
from app.schemas import Conversation, ConversationCreate, MessageCreate
from app.services.audit_log import create_audit_log

router = APIRouter(
    prefix="/messages",
    tags=["Messages"],
)


def _is_participant(conversation: dict, user_uid: str) -> bool:
    return conversation.get("owner_uid") == user_uid or conversation.get("renter_uid") == user_uid


@router.get("/conversations", response_model=list[Conversation])
async def list_conversations(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    return await list_user_conversations(db=db, user_uid=user_uid)


@router.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
async def create_conversation_endpoint(
    payload: ConversationCreate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    if renter_uid == payload.owner_uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot message yourself.")

    vehicle = await get_vehicle_by_id(db=db, vehicle_id=payload.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if vehicle.get("owner_uid") != payload.owner_uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vehicle owner does not match.")

    owner = await get_user_profile_by_uid(db=db, uid=payload.owner_uid)
    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")

    conversation = await create_conversation(
        db=db,
        vehicle_id=payload.vehicle_id,
        owner_uid=payload.owner_uid,
        renter_uid=renter_uid,
        initial_message=payload.initial_message,
    )
    await create_audit_log(
        db,
        action="messages.create_conversation",
        outcome="success",
        message="Conversation created or reopened",
        actor_uid=renter_uid,
        entity_type="conversation",
        entity_id=conversation.get("_id"),
        metadata={"vehicle_id": payload.vehicle_id, "owner_uid": payload.owner_uid},
    )
    return conversation


@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    conversation = await get_conversation_by_id(db=db, conversation_id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if not _is_participant(conversation, user_uid):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return conversation


@router.post("/conversations/{conversation_id}/messages", response_model=Conversation)
async def send_message(
    conversation_id: str,
    payload: MessageCreate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    conversation = await get_conversation_by_id(db=db, conversation_id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if not _is_participant(conversation, user_uid):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    updated = await add_message(db=db, conversation_id=conversation_id, sender_uid=user_uid, text=payload.text)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await create_audit_log(
        db,
        action="messages.send",
        outcome="success",
        message="Message sent",
        actor_uid=user_uid,
        entity_type="conversation",
        entity_id=conversation_id,
    )
    return updated
