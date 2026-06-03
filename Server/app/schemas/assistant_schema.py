from typing import Any

from pydantic import BaseModel, Field, model_validator


class AssistantChatTurn(BaseModel):
    role: str
    content: str

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        role = str(data.get("role", "")).strip().lower()
        content = str(data.get("content", "")).strip()
        if role not in {"user", "assistant", "system"}:
            raise ValueError("role must be user, assistant, or system")
        if not content:
            raise ValueError("content is required")
        return {"role": role, "content": content}


class AssistantChatRequest(BaseModel):
    message: str
    history: list[AssistantChatTurn] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        message = str(data.get("message", "")).strip()
        if not message:
            raise ValueError("message is required")
        return {
            "message": message,
            "history": data.get("history") or [],
        }


class AssistantVehicleRecommendation(BaseModel):
    vehicle_id: str
    name: str
    location: str
    price_per_day: float
    seats: int
    type: str
    fuel: str
    transmission: str
    availability: bool
    verified: bool
    image_url: str | None = None
    reason: str


class AssistantChatResponse(BaseModel):
    reply: str
    recommendations: list[AssistantVehicleRecommendation] = Field(default_factory=list)
    source: str
    model: str | None = None
    warning: str | None = None
