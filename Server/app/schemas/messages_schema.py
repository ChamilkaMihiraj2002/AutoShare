from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, model_validator


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ChatMessage(BaseModel):
    messageid: str
    sender_uid: str
    text: str
    created_at: str


class ConversationBase(BaseModel):
    vehicle_id: str
    owner_uid: str
    renter_uid: str


class Conversation(ConversationBase):
    conversationid: str = Field(alias="_id")
    created_at: str
    updated_at: str
    last_message_at: str | None = None
    last_message_preview: str | None = None
    last_message_sender_uid: str | None = None
    messages: list[ChatMessage] = Field(default_factory=list)


class ConversationCreate(BaseModel):
    vehicle_id: str
    owner_uid: str
    initial_message: str | None = None

    @model_validator(mode="after")
    def normalize_initial_message(self) -> "ConversationCreate":
        if self.initial_message is not None:
            self.initial_message = self.initial_message.strip() or None
        return self


class MessageCreate(BaseModel):
    text: str

    @model_validator(mode="before")
    @classmethod
    def validate_payload(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        text = str(data.get("text", "")).strip()
        if not text:
            raise ValueError("Message text is required")
        return {"text": text}
