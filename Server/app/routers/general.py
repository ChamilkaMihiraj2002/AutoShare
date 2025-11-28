from fastapi import APIRouter, Depends, Query
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.schemas import Vehicle
from app.repositories.vehicle import list_all_vehicles

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