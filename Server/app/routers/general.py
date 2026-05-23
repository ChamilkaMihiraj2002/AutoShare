from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.schemas import Vehicle
from app.repositories.vehicle import get_vehicle_by_id, list_all_vehicles
from app.services.vehicle_pricing import calculate_vehicle_pricing

router = APIRouter(tags=["General"])


@router.get("/", response_model=dict)
def read_root():
    """A public endpoint that anyone can access."""
    return {"message": "Welcome! This is a public endpoint."}


@router.get("/vehicles", response_model=List[Vehicle])
async def public_list_vehicles(
    db: AsyncIOMotorDatabase = Depends(get_database),
    limit: int = Query(200, ge=1, le=1000),
):
    """Public endpoint to list all vehicles. Limits results to `limit`."""
    docs = await list_all_vehicles(db=db, limit=limit)
    return docs


@router.get("/vehicles/{vehicle_id}/pricing", response_model=dict)
async def public_vehicle_pricing_quote(
    vehicle_id: str,
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    pickup_latitude: float | None = Query(None),
    pickup_longitude: float | None = Query(None),
    destination_latitude: float | None = Query(None),
    destination_longitude: float | None = Query(None),
    country_code: str = Query("LK", min_length=2, max_length=2),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    vehicle = await get_vehicle_by_id(db=db, vehicle_id=vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    try:
        quote = calculate_vehicle_pricing(
            vehicle=vehicle,
            start_date=start_date,
            end_date=end_date,
            pickup_latitude=pickup_latitude,
            pickup_longitude=pickup_longitude,
            destination_latitude=destination_latitude,
            destination_longitude=destination_longitude,
            country_code=country_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return quote.to_dict()
