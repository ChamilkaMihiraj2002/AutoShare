from fastapi import APIRouter, Depends, HTTPException, status, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.core.db import get_admin_database, get_database
from app.core.auth_deps import get_current_user
from app.schemas import RentCreate, Rent, RentUpdate, OwnerEarningsOverview
from app.repositories.rent import (
    create_rent,
    get_rent_by_id,
    list_rents_by_renter,
    list_rents_by_owner,
    update_rent,
    accept_rent,
    set_rent_status,
    delete_rent,
)
from app.repositories.vehicle import get_vehicle_by_id, update_vehicle
from app.services.owner_earnings import get_owner_earnings_overview
from app.services.audit_log import create_audit_log
from app.services.dynamic_pricing_settings import get_global_dynamic_pricing_settings
from app.services.vehicle_pricing import calculate_vehicle_pricing

router = APIRouter(
    prefix="/rents",
    tags=["Rents"],
)


async def _get_owner_rent_or_404(db: AsyncIOMotorDatabase, owner_uid: str, rent_id: str) -> dict:
    rent = await get_rent_by_id(db=db, rent_id=rent_id)
    if not rent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found")
    if rent.get("owner_uid") != owner_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return rent


@router.post("/", response_model=Rent, status_code=201)
async def create_rent_endpoint(
    payload: RentCreate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin_db: AsyncIOMotorDatabase = Depends(get_admin_database),
):
    renter_uid = decoded_token.get("uid")
    vehicle = await get_vehicle_by_id(db=db, vehicle_id=payload.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if vehicle.get("owner_uid") != payload.owner_uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vehicle owner does not match booking payload")
    if not vehicle.get("availability", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vehicle is not currently available")

    try:
        dynamic_pricing = await get_global_dynamic_pricing_settings(admin_db)
        pricing_snapshot = calculate_vehicle_pricing(
            vehicle=vehicle,
            start_date=payload.start_date,
            end_date=payload.end_date,
            dynamic_pricing=dynamic_pricing,
            pickup_latitude=payload.pickup_latitude,
            pickup_longitude=payload.pickup_longitude,
            destination_latitude=payload.destination_latitude,
            destination_longitude=payload.destination_longitude,
            country_code=payload.country_code,
        ).to_dict()
        created = await create_rent(
            db=db,
            renter_uid=renter_uid,
            rent_doc={
                **payload.model_dump(),
                "pricing_snapshot": pricing_snapshot,
            },
        )
        await create_audit_log(
            db,
            action="rents.create",
            outcome="success",
            message="Rent request created",
            actor_uid=renter_uid,
            entity_type="rent",
            entity_id=created.get("_id"),
            metadata={
                "vehicle_id": created.get("vehicle_id"),
                "owner_uid": created.get("owner_uid"),
                "quoted_total": pricing_snapshot.get("total"),
            },
        )
        return created
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        await create_audit_log(
            db,
            action="rents.create",
            outcome="failure",
            message="Rent request creation failed",
            actor_uid=renter_uid,
            entity_type="rent",
            metadata={"error": str(e), "vehicle_id": payload.vehicle_id, "owner_uid": payload.owner_uid},
        )
        raise HTTPException(status_code=500, detail=f"DB error: {e}")


@router.get("/", response_model=List[Rent])
async def list_my_rents(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    renter_uid = decoded_token.get("uid")
    docs = await list_rents_by_renter(db=db, renter_uid=renter_uid)
    return docs


@router.get("/owner", response_model=List[Rent])
async def list_owner_rents(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    docs = await list_rents_by_owner(db=db, owner_uid=owner_uid)
    return docs


@router.get("/owner/earnings", response_model=OwnerEarningsOverview)
async def get_owner_earnings(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    return await get_owner_earnings_overview(db=db, owner_uid=owner_uid)


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
    update_fields = payload.model_dump(exclude_unset=True)
    updated = await update_rent(db=db, renter_uid=renter_uid, rent_id=rent_id, update_fields=update_fields)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found or not owned by you")
    await create_audit_log(
        db,
        action="rents.update",
        outcome="success",
        message="Rent request updated",
        actor_uid=renter_uid,
        entity_type="rent",
        entity_id=rent_id,
        metadata={"updated_fields": sorted(update_fields.keys())},
    )
    return updated


@router.post("/{rent_id}/accept", response_model=Rent)
async def accept_rent_request(
    rent_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    rent = await _get_owner_rent_or_404(db, owner_uid, rent_id)

    vehicle = await get_vehicle_by_id(db=db, vehicle_id=rent["vehicle_id"])
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    updated_vehicle = await update_vehicle(
        db=db,
        owner_uid=owner_uid,
        vehicle_id=rent["vehicle_id"],
        update_fields={"availability": False},
    )
    if not updated_vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")

    updated_rent = await accept_rent(db=db, owner_uid=owner_uid, rent_id=rent_id)
    if not updated_rent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found or not owned by you")
    await create_audit_log(
        db,
        action="rents.accept",
        outcome="success",
        message="Rent request accepted",
        actor_uid=owner_uid,
        entity_type="rent",
        entity_id=rent_id,
        metadata={"vehicle_id": rent["vehicle_id"]},
    )
    return updated_rent


@router.post("/{rent_id}/cancel", response_model=Rent)
async def cancel_rent_request(
    rent_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    rent = await _get_owner_rent_or_404(db, owner_uid, rent_id)

    updated_vehicle = await update_vehicle(
        db=db,
        owner_uid=owner_uid,
        vehicle_id=rent["vehicle_id"],
        update_fields={"availability": True},
    )
    if not updated_vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")

    updated_rent = await set_rent_status(db=db, owner_uid=owner_uid, rent_id=rent_id, booking_status="cancelled")
    if not updated_rent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found or not owned by you")
    await create_audit_log(
        db,
        action="rents.cancel",
        outcome="success",
        message="Rent request cancelled",
        actor_uid=owner_uid,
        entity_type="rent",
        entity_id=rent_id,
        metadata={"vehicle_id": rent["vehicle_id"]},
    )
    return updated_rent


@router.post("/{rent_id}/complete", response_model=Rent)
async def complete_rent_request(
    rent_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_uid = decoded_token.get("uid")
    rent = await _get_owner_rent_or_404(db, owner_uid, rent_id)

    updated_vehicle = await update_vehicle(
        db=db,
        owner_uid=owner_uid,
        vehicle_id=rent["vehicle_id"],
        update_fields={"availability": True},
    )
    if not updated_vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found or not owned by you")

    updated_rent = await set_rent_status(db=db, owner_uid=owner_uid, rent_id=rent_id, booking_status="completed")
    if not updated_rent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rent not found or not owned by you")
    await create_audit_log(
        db,
        action="rents.complete",
        outcome="success",
        message="Rent request completed",
        actor_uid=owner_uid,
        entity_type="rent",
        entity_id=rent_id,
        metadata={"vehicle_id": rent["vehicle_id"]},
    )
    return updated_rent


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
    await create_audit_log(
        db,
        action="rents.delete",
        outcome="success",
        message="Rent request deleted",
        actor_uid=renter_uid,
        entity_type="rent",
        entity_id=rent_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
