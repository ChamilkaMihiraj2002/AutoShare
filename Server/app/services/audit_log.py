from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi.encoders import jsonable_encoder
from motor.motor_asyncio import AsyncIOMotorDatabase


SYSTEM_LOG_COLLECTION = "system_logs"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata:
        return {}
    return jsonable_encoder(metadata)


async def create_system_log(
    db: AsyncIOMotorDatabase,
    *,
    event_type: str,
    action: str,
    outcome: str,
    message: str,
    actor_uid: str | None = None,
    actor_email: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    route: str | None = None,
    method: str | None = None,
    status_code: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict:
    doc = {
        "event_type": event_type,
        "action": action,
        "outcome": outcome,
        "message": message,
        "actor_uid": actor_uid,
        "actor_email": actor_email,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "route": route,
        "method": method,
        "status_code": status_code,
        "metadata": _normalize_metadata(metadata),
        "created_at": utc_now(),
    }
    try:
        result = await db[SYSTEM_LOG_COLLECTION].insert_one(doc)
        created = await db[SYSTEM_LOG_COLLECTION].find_one({"_id": result.inserted_id})
        return created or doc
    except Exception:
        return doc


async def create_audit_log(
    db: AsyncIOMotorDatabase,
    *,
    action: str,
    outcome: str,
    message: str,
    actor_uid: str | None = None,
    actor_email: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict:
    return await create_system_log(
        db,
        event_type="audit",
        action=action,
        outcome=outcome,
        message=message,
        actor_uid=actor_uid,
        actor_email=actor_email,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata,
    )


async def create_request_log(
    db: AsyncIOMotorDatabase,
    *,
    route: str,
    method: str,
    status_code: int,
    outcome: str,
    message: str,
    actor_uid: str | None = None,
    actor_email: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict:
    return await create_system_log(
        db,
        event_type="request",
        action=f"{method.upper()} {route}",
        outcome=outcome,
        message=message,
        actor_uid=actor_uid,
        actor_email=actor_email,
        route=route,
        method=method.upper(),
        status_code=status_code,
        metadata=metadata,
    )
