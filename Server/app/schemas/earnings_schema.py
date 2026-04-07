from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class EarningsPeriodSummary(BaseModel):
    amount: float
    bookings: int


class EarningsSummary(BaseModel):
    this_month: EarningsPeriodSummary
    last_month: EarningsPeriodSummary
    all_time: EarningsPeriodSummary
    change_percentage: float


class OwnerEarningsTransaction(BaseModel):
    rent_id: str
    vehicle_id: str
    vehicle_name: str
    renter_uid: str
    start_date: datetime
    end_date: datetime
    amount: float
    booking_status: Literal["pending", "accepted", "cancelled", "completed"]


class OwnerEarningsOverview(BaseModel):
    summary: EarningsSummary
    transactions: list[OwnerEarningsTransaction]
