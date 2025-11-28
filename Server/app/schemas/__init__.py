"""Package-level exports for user schemas.

This module re-exports the models defined in ``users_schema.py`` so
callers can import from ``app.schemas`` directly.
"""

from .users_schema import (
    UserProfileBase,
    UserProfileUpdate,
    UserProfile,
    RegisterEmailRequest,
    SocialProfileRequest,
    RegisterResponse,
    LoginRequest,
    AuthResponse,
)
from .vehicles_schema import (
    VehicleBase,
    VehicleCreate,
    VehicleUpdate,
    Vehicle,
)

__all__ = [
    "UserProfileBase",
    "UserProfileUpdate",
    "UserProfile",
    "RegisterEmailRequest",
    "SocialProfileRequest",
    "RegisterResponse",
    "LoginRequest",
    "AuthResponse",
    "VehicleBase",
    "VehicleCreate",
    "VehicleUpdate",
    "Vehicle",
]
