from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.db import get_database
from app.core.auth_deps import get_current_user
from app.schemas import VehicleCreate, Vehicle, VehicleUpdate
from app.schemas.vehicles_schema import (
    normalize_upload_asset_url,
    normalize_vehicle_image_url,
    normalize_vehicle_image_urls,
)
from app.repositories.vehicle import (
    create_vehicle,
    get_vehicle_by_id,
    list_vehicles_by_owner,
    update_vehicle,
    delete_vehicle,
)
from app.services.audit_log import create_audit_log

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
)

VEHICLE_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "vehicles"
VEHICLE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
VEHICLE_DOCUMENT_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "vehicle-documents"
VEHICLE_DOCUMENT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}
OWNER_DYNAMIC_PRICING_FIELDS = {
    "distance_included_km",
    "distance_surcharge_per_km",
}


def _normalize_image_url(image_url: str) -> str:
    """Accept absolute or relative URLs and return a relative path."""
    normalized = normalize_vehicle_image_url(image_url)
    if normalized:
        return normalized

    parsed = urlparse(image_url)
    if parsed.scheme and parsed.netloc:
        return parsed.path
    return image_url


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_document_url(document_url: str) -> str:
    normalized = normalize_upload_asset_url(document_url, folder="vehicle-documents")
    if normalized:
        return normalized

    parsed = urlparse(document_url)
    if parsed.scheme and parsed.netloc:
        return parsed.path
    return document_url


def _extract_owner_dynamic_pricing(payload: dict) -> dict | None:
    dynamic_pricing = payload.get("dynamic_pricing")
    if not isinstance(dynamic_pricing, dict):
        return None

    owner_dynamic_pricing = {
        field: dynamic_pricing[field]
        for field in OWNER_DYNAMIC_PRICING_FIELDS
        if dynamic_pricing.get(field) is not None
    }
    return owner_dynamic_pricing or None


async def _save_vehicle_document(vehicle_id: str, upload: UploadFile, suffix: str) -> str:
    content_type = (upload.content_type or "").lower()
    extension = ALLOWED_DOCUMENT_TYPES.get(content_type)
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported document type. Use PDF, JPG, or PNG.",
        )

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded document is empty.")
    if len(content) > MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document exceeds 10MB limit.")

    filename = f"{vehicle_id}_{suffix}_{uuid4().hex}{extension}"
    destination = VEHICLE_DOCUMENT_UPLOAD_DIR / filename
    destination.write_bytes(content)
    return f"/uploads/vehicle-documents/{filename}"


@router.post("/", response_model=Vehicle, status_code=201)
async def create_vehicle_endpoint(
    payload: VehicleCreate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    payload_data = payload.model_dump()
    payload_data["dynamic_pricing"] = _extract_owner_dynamic_pricing(payload_data)
    documents = payload_data.get("verification_documents") or {}
    has_documents = bool(documents.get("vehicle_book_url")) and bool(documents.get("vehicle_license_url"))
    payload_data["verification_status"] = "pending" if has_documents else "not_submitted"
    payload_data["verification_submitted_at"] = _utc_now_iso() if has_documents else None
    payload_data["verification_verified_at"] = None
    payload_data["verification_verified_by"] = None
    try:
        created = await create_vehicle(db=db, owner_uid=owner_uid, vehicle_doc=payload_data)
        await create_audit_log(
            db,
            action="vehicles.create",
            outcome="success",
            message="Vehicle created",
            actor_uid=owner_uid,
            entity_type="vehicle",
            entity_id=created.get("_id"),
            metadata={"brand": created.get("brand"), "model": created.get("model")},
        )
        return created
    except Exception as e:
        await create_audit_log(
            db,
            action="vehicles.create",
            outcome="failure",
            message="Vehicle creation failed",
            actor_uid=owner_uid,
            entity_type="vehicle",
            metadata={"error": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"DB error: {e}")


@router.get("/", response_model=List[Vehicle])
async def list_my_vehicles(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    docs = await list_vehicles_by_owner(db=db, owner_uid=owner_uid)
    return docs


@router.get("/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(
    vehicle_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await get_vehicle_by_id(db=db, vehicle_id=vehicle_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if doc.get("owner_uid") != decoded_token.get("uid"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return doc


@router.patch("/{vehicle_id}", response_model=Vehicle)
async def patch_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    update_fields = payload.model_dump(exclude_unset=True)
    owner_dynamic_pricing = _extract_owner_dynamic_pricing(update_fields)
    if "dynamic_pricing" in update_fields:
        update_fields["dynamic_pricing"] = owner_dynamic_pricing

    for restricted_field in (
        "verification_documents",
        "verification_status",
        "verification_notes",
        "verification_submitted_at",
        "verification_verified_at",
        "verification_verified_by",
    ):
        update_fields.pop(restricted_field, None)
    updated = await update_vehicle(db=db, owner_uid=owner_uid, vehicle_id=vehicle_id, update_fields=update_fields)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")
    await create_audit_log(
        db,
        action="vehicles.update",
        outcome="success",
        message="Vehicle updated",
        actor_uid=owner_uid,
        entity_type="vehicle",
        entity_id=vehicle_id,
        metadata={"updated_fields": sorted(update_fields.keys())},
    )
    return updated


@router.post("/{vehicle_id}/verification-documents", response_model=Vehicle)
async def upload_vehicle_verification_documents(
    vehicle_id: str,
    vehicle_book: UploadFile = File(...),
    vehicle_license: UploadFile = File(...),
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    existing = await get_vehicle_by_id(db=db, vehicle_id=vehicle_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if existing.get("owner_uid") != owner_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    vehicle_book_url = await _save_vehicle_document(vehicle_id, vehicle_book, "book")
    vehicle_license_url = await _save_vehicle_document(vehicle_id, vehicle_license, "license")

    updated = await update_vehicle(
        db=db,
        owner_uid=owner_uid,
        vehicle_id=vehicle_id,
        update_fields={
            "verification_documents": {
                "vehicle_book_url": vehicle_book_url,
                "vehicle_license_url": vehicle_license_url,
            },
            "verification_status": "pending",
            "verification_notes": "Awaiting admin review.",
            "verification_submitted_at": _utc_now_iso(),
            "verification_verified_at": None,
            "verification_verified_by": None,
        },
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")

    await create_audit_log(
        db,
        action="vehicles.upload_verification_documents",
        outcome="success",
        message="Vehicle verification documents uploaded",
        actor_uid=owner_uid,
        entity_type="vehicle",
        entity_id=vehicle_id,
        metadata={
            "vehicle_book_url": vehicle_book_url,
            "vehicle_license_url": vehicle_license_url,
        },
    )
    return updated


@router.delete("/{vehicle_id}", status_code=204)
async def remove_vehicle(
    vehicle_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    ok = await delete_vehicle(db=db, owner_uid=owner_uid, vehicle_id=vehicle_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")
    await create_audit_log(
        db,
        action="vehicles.delete",
        outcome="success",
        message="Vehicle deleted",
        actor_uid=owner_uid,
        entity_type="vehicle",
        entity_id=vehicle_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{vehicle_id}/image", response_model=Vehicle)
async def upload_vehicle_image(
    vehicle_id: str,
    image: UploadFile = File(...),
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    existing = await get_vehicle_by_id(db=db, vehicle_id=vehicle_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if existing.get("owner_uid") != owner_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    content_type = (image.content_type or "").lower()
    extension = ALLOWED_IMAGE_TYPES.get(content_type)
    if not extension:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type. Use JPG, PNG, or WEBP.")

    content = await image.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image exceeds 5MB limit.")

    filename = f"{vehicle_id}_{uuid4().hex}{extension}"
    destination = VEHICLE_UPLOAD_DIR / filename
    destination.write_bytes(content)
    image_url = f"/uploads/vehicles/{filename}"
    existing_urls, _ = normalize_vehicle_image_urls(existing.get("image_urls"), existing.get("image_url"))
    existing_urls.append(image_url)
    existing_urls, _ = normalize_vehicle_image_urls(existing_urls)
    primary_image_url = _normalize_image_url(image_url)

    updated = await update_vehicle(
        db=db,
        owner_uid=owner_uid,
        vehicle_id=vehicle_id,
        update_fields={"image_urls": existing_urls, "image_url": primary_image_url},
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")
    await create_audit_log(
        db,
        action="vehicles.upload_image",
        outcome="success",
        message="Vehicle image uploaded",
        actor_uid=owner_uid,
        entity_type="vehicle",
        entity_id=vehicle_id,
        metadata={"image_url": image_url},
    )
    return updated


@router.delete("/{vehicle_id}/image", response_model=Vehicle)
async def delete_vehicle_image(
    vehicle_id: str,
    image_url: str = Query(..., description="Image URL to remove from the vehicle gallery."),
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    existing = await get_vehicle_by_id(db=db, vehicle_id=vehicle_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if existing.get("owner_uid") != owner_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    current_urls = list(existing.get("image_urls") or [])
    if not current_urls and existing.get("image_url"):
        current_urls = [existing["image_url"]]

    target = _normalize_image_url(image_url)
    matched = next((url for url in current_urls if _normalize_image_url(url) == target), None)
    if not matched:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found on this vehicle")

    new_urls = [url for url in current_urls if url != matched]
    new_primary = new_urls[-1] if new_urls else None

    updated = await update_vehicle(
        db=db,
        owner_uid=owner_uid,
        vehicle_id=vehicle_id,
        update_fields={"image_urls": new_urls, "image_url": new_primary},
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")

    normalized_match = _normalize_image_url(matched)
    if normalized_match.startswith("/uploads/vehicles/"):
        filename = normalized_match.replace("/uploads/vehicles/", "", 1)
        file_path = VEHICLE_UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()

    await create_audit_log(
        db,
        action="vehicles.delete_image",
        outcome="success",
        message="Vehicle image deleted",
        actor_uid=owner_uid,
        entity_type="vehicle",
        entity_id=vehicle_id,
        metadata={"image_url": matched},
    )

    return updated

#
