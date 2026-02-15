from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.db import get_database
from app.core.auth_deps import get_current_user
from app.schemas import VehicleCreate, Vehicle, VehicleUpdate
from app.repositories.vehicle import (
    create_vehicle,
    get_vehicle_by_id,
    list_vehicles_by_owner,
    update_vehicle,
    delete_vehicle,
)

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
)

VEHICLE_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "vehicles"
VEHICLE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _normalize_image_url(image_url: str) -> str:
    """Accept absolute or relative URLs and return a relative path."""
    parsed = urlparse(image_url)
    if parsed.scheme and parsed.netloc:
        return parsed.path
    return image_url


@router.post("/", response_model=Vehicle, status_code=201)
async def create_vehicle_endpoint(
    payload: VehicleCreate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    try:
        created = await create_vehicle(db=db, owner_uid=owner_uid, vehicle_doc=payload.model_dump())
        return created
    except Exception as e:
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
    updated = await update_vehicle(db=db, owner_uid=owner_uid, vehicle_id=vehicle_id, update_fields=payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")
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
    existing_urls = list(existing.get("image_urls") or [])
    if not existing_urls and existing.get("image_url"):
        existing_urls.append(existing["image_url"])
    existing_urls.append(image_url)

    updated = await update_vehicle(
        db=db,
        owner_uid=owner_uid,
        vehicle_id=vehicle_id,
        update_fields={"image_urls": existing_urls, "image_url": image_url},
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")
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

    return updated
