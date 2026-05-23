"""Package-level exports for user schemas.

This module re-exports the models defined in ``users_schema.py`` so
callers can import from ``app.schemas`` directly.
"""

from .users_schema import (
    UserProfileBase,
    UserProfileUpdate,
    UserProfile,
    PublicUserProfile,
    RegisterEmailRequest,
    SocialProfileRequest,
    RegisterResponse,
    LoginRequest,
    AuthResponse,
)
from .vehicles_schema import (
    CustomDateMultiplier,
    VehicleBase,
    VehicleCreate,
    VehicleDynamicPricing,
    VehicleUpdate,
    Vehicle,
)
from .rents_schema import (
    RentBase,
    RentCreate,
    RentPricingLineItem,
    RentPricingSnapshot,
    RentUpdate,
    Rent,
)
from .earnings_schema import (
    EarningsPeriodSummary,
    EarningsSummary,
    OwnerEarningsTransaction,
    OwnerEarningsOverview,
)
from .admin_schema import (
    AdminLoginRequest,
    AdminAuthResponse,
    AdminOverviewStats,
    AdminActivityItem,
    AdminAccountSummary,
    AdminDashboardOverview,
    AdminUserItem,
    AdminBookingItem,
    AdminUsersResponse,
    AdminBookingsResponse,
)

__all__ = [
    "UserProfileBase",
    "UserProfileUpdate",
    "UserProfile",
    "PublicUserProfile",
    "RegisterEmailRequest",
    "SocialProfileRequest",
    "RegisterResponse",
    "LoginRequest",
    "AuthResponse",
    "VehicleBase",
    "VehicleCreate",
    "VehicleDynamicPricing",
    "CustomDateMultiplier",
    "VehicleUpdate",
    "Vehicle",
    "RentBase",
    "RentCreate",
    "RentPricingLineItem",
    "RentPricingSnapshot",
    "RentUpdate",
    "Rent",
    "EarningsPeriodSummary",
    "EarningsSummary",
    "OwnerEarningsTransaction",
    "OwnerEarningsOverview",
    "AdminLoginRequest",
    "AdminAuthResponse",
    "AdminOverviewStats",
    "AdminActivityItem",
    "AdminAccountSummary",
    "AdminDashboardOverview",
    "AdminUserItem",
    "AdminBookingItem",
    "AdminUsersResponse",
    "AdminBookingsResponse",
]
