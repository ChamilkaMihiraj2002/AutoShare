from __future__ import annotations

from pydantic import BaseModel, Field
from app.schemas.vehicles_schema import VehicleDynamicPricing


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminAuthResponse(BaseModel):
    username: str
    token: str
    message: str


class AdminOverviewStats(BaseModel):
    total_users: int
    total_renters: int
    total_vehicle_owners: int
    active_vehicles: int
    inactive_vehicles: int
    pending_vehicle_verifications: int
    verified_vehicles: int
    current_rents: int
    completed_rents: int


class AdminActivityItem(BaseModel):
    title: str
    detail: str
    created_at: str | None = None
    outcome: str | None = None


class AdminAccountSummary(BaseModel):
    username: str
    display_name: str
    last_login_at: str | None = None


class AdminDashboardOverview(BaseModel):
    admin: AdminAccountSummary
    stats: AdminOverviewStats
    recent_requests: list[AdminActivityItem] = Field(default_factory=list)
    recent_admin_logins: list[AdminActivityItem] = Field(default_factory=list)


class AdminUserItem(BaseModel):
    uid: str
    email: str | None = None
    full_name: str | None = None
    phone: str | None = None
    roles: list[str] = Field(default_factory=list)
    address: str | None = None


class AdminBookingItem(BaseModel):
    rent_id: str
    renter_uid: str
    owner_uid: str
    vehicle_id: str
    booking_status: str
    start_date: str | None = None
    end_date: str | None = None
    total_amount: float | None = None


class AdminVehicleVerificationItem(BaseModel):
    vehicle_id: str
    owner_uid: str
    brand: str
    model: str
    year: int
    location: str
    availability: bool
    verification_status: str
    verification_notes: str | None = None
    verification_submitted_at: str | None = None
    verification_verified_at: str | None = None
    verification_verified_by: str | None = None
    vehicle_book_url: str | None = None
    vehicle_license_url: str | None = None


class AdminVehicleVerificationUpdateRequest(BaseModel):
    verification_status: str
    verification_notes: str | None = None


class AdminDynamicPricingSettings(VehicleDynamicPricing):
    pass


class AdminDynamicPricingSettingsResponse(BaseModel):
    settings: AdminDynamicPricingSettings


class AdminUsersResponse(BaseModel):
    users: list[AdminUserItem] = Field(default_factory=list)


class AdminBookingsResponse(BaseModel):
    bookings: list[AdminBookingItem] = Field(default_factory=list)


class AdminVehiclesResponse(BaseModel):
    vehicles: list[AdminVehicleVerificationItem] = Field(default_factory=list)
