from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.repositories.vehicle import list_all_vehicles
from app.schemas import AssistantChatRequest, AssistantChatResponse
from app.services.ollama_assistant import (
    OLLAMA_MODEL,
    build_fallback_reply,
    build_recommendation_payload,
    query_ollama_chat,
    shortlist_vehicles_for_prompt,
)

router = APIRouter(
    prefix="/assistant",
    tags=["Assistant"],
)


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    payload: AssistantChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    vehicles = await list_all_vehicles(db=db, limit=500)
    shortlist = shortlist_vehicles_for_prompt(vehicles, payload.message)
    warning = None

    try:
        reply = query_ollama_chat(payload.message, payload.history, shortlist)
        source = "ollama"
        model = OLLAMA_MODEL
    except Exception as exc:
        reply = build_fallback_reply(payload.message, shortlist)
        source = "fallback"
        model = None
        warning = f"Ollama was unavailable, so local recommendation mode was used instead. ({exc})"

    return AssistantChatResponse(
        reply=reply,
        recommendations=build_recommendation_payload(shortlist),
        source=source,
        model=model,
        warning=warning,
    )
