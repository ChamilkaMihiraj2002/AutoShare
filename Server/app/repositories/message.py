from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository

MESSAGE_COLLECTION = "conversations"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MessageRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, MESSAGE_COLLECTION)

    async def get_conversation_by_id(self, *, conversation_id: str) -> dict | None:
        return await self.get_by_id(conversation_id)

    async def get_conversation_between_users(
        self,
        *,
        vehicle_id: str,
        owner_uid: str,
        renter_uid: str,
    ) -> dict | None:
        docs = await self.list(
            {
                "vehicle_id": vehicle_id,
                "owner_uid": owner_uid,
                "renter_uid": renter_uid,
            },
            limit=1,
        )
        return docs[0] if docs else None

    async def list_user_conversations(self, *, user_uid: str) -> list[dict]:
        docs = await self.list({}, limit=500)
        conversations = [
            doc for doc in docs if doc.get("owner_uid") == user_uid or doc.get("renter_uid") == user_uid
        ]
        return sorted(
            conversations,
            key=lambda item: item.get("last_message_at") or item.get("updated_at") or item.get("created_at") or "",
            reverse=True,
        )

    async def create_conversation(
        self,
        *,
        vehicle_id: str,
        owner_uid: str,
        renter_uid: str,
        initial_message: str | None = None,
    ) -> dict:
        existing = await self.get_conversation_between_users(
            vehicle_id=vehicle_id,
            owner_uid=owner_uid,
            renter_uid=renter_uid,
        )
        if existing:
            if initial_message:
                return await self.add_message(
                    conversation_id=existing["_id"],
                    sender_uid=renter_uid,
                    text=initial_message,
                )
            return existing

        now = _utc_now_iso()
        conversation = {
            "_id": uuid4().hex,
            "vehicle_id": vehicle_id,
            "owner_uid": owner_uid,
            "renter_uid": renter_uid,
            "created_at": now,
            "updated_at": now,
            "last_message_at": None,
            "last_message_preview": None,
            "last_message_sender_uid": None,
            "messages": [],
        }
        created = await self.create(conversation)
        if initial_message:
            return await self.add_message(
                conversation_id=created["_id"],
                sender_uid=renter_uid,
                text=initial_message,
            )
        return created

    async def add_message(self, *, conversation_id: str, sender_uid: str, text: str) -> dict | None:
        conversation = await self.get_by_id(conversation_id)
        if not conversation:
            return None

        now = _utc_now_iso()
        message = {
            "messageid": uuid4().hex,
            "sender_uid": sender_uid,
            "text": text,
            "created_at": now,
        }
        messages = list(conversation.get("messages", []))
        messages.append(message)
        updated = {
            "messages": messages,
            "updated_at": now,
            "last_message_at": now,
            "last_message_preview": text[:160],
            "last_message_sender_uid": sender_uid,
        }
        return await self.update_by_id(conversation_id, updated)


async def get_conversation_by_id(db: AsyncIOMotorDatabase, *, conversation_id: str) -> dict | None:
    repo = MessageRepository(db)
    return await repo.get_conversation_by_id(conversation_id=conversation_id)


async def list_user_conversations(db: AsyncIOMotorDatabase, *, user_uid: str) -> list[dict]:
    repo = MessageRepository(db)
    return await repo.list_user_conversations(user_uid=user_uid)


async def create_conversation(
    db: AsyncIOMotorDatabase,
    *,
    vehicle_id: str,
    owner_uid: str,
    renter_uid: str,
    initial_message: str | None = None,
) -> dict:
    repo = MessageRepository(db)
    return await repo.create_conversation(
        vehicle_id=vehicle_id,
        owner_uid=owner_uid,
        renter_uid=renter_uid,
        initial_message=initial_message,
    )


async def add_message(
    db: AsyncIOMotorDatabase,
    *,
    conversation_id: str,
    sender_uid: str,
    text: str,
) -> dict | None:
    repo = MessageRepository(db)
    return await repo.add_message(conversation_id=conversation_id, sender_uid=sender_uid, text=text)
