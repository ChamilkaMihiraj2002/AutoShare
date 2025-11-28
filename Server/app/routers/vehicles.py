from fastapi import APIRouter, Depends, HTTPException, status
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
    return
