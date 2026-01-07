from fastapi import APIRouter, Depends, HTTPException, status, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.db import get_database
from app.core.auth_deps import get_current_user
from app.schemas import RentCreate, Rent, RentUpdate
from app.repositories.rent import (
    create_rent,
    get_rent_by_id,
    list_rents_by_renter,
    update_rent,
    delete_rent,
)

router = APIRouter(
    prefix="/rents",
    tags=["Rents"],
)


@router.post("/", response_model=Rent, status_code=201)
async def create_rent_endpoint(
    payload: RentCreate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    try:
        created = await create_rent(db=db, renter_uid=renter_uid, rent_doc=payload.model_dump())
        return created
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")


@router.get("/", response_model=List[Rent])
async def list_my_rents(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    docs = await list_rents_by_renter(db=db, renter_uid=renter_uid)
    return docs


@router.get("/{rent_id}", response_model=Rent)
async def get_rent(
    rent_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await get_rent_by_id(db=db, rent_id=rent_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found")
    # Allow either renter or owner to view
    uid = decoded_token.get("uid")
    if doc.get("renter_uid") != uid and doc.get("owner_uid") != uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return doc


@router.patch("/{rent_id}", response_model=Rent)
async def patch_rent(
    rent_id: str,
    payload: RentUpdate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    updated = await update_rent(db=db, renter_uid=renter_uid, rent_id=rent_id, update_fields=payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found or not owned by you")
    return updated


@router.delete("/{rent_id}", status_code=204)
async def remove_rent(
    rent_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    ok = await delete_rent(db=db, renter_uid=renter_uid, rent_id=rent_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found or not owned by you")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
