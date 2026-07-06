from enum import Enum
from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, model_validator

class UserRole(str, Enum):
    USER = "user"
    VEHICLE_OWNER = "vehicle_owner"
    RENTER = "renter"


DEFAULT_ROLE = UserRole.USER
LEGACY_ROLE_ALIASES = {
    "owner": UserRole.VEHICLE_OWNER,
}


def normalize_roles(value: Any) -> list[UserRole]:
    if value is None:
        return [DEFAULT_ROLE]

    if isinstance(value, (str, UserRole)):
        values = [value]
    elif isinstance(value, (list, tuple, set)):
        values = list(value)
    else:
        raise ValueError("Role must be a string or a list of strings")

    normalized: list[UserRole] = []
    for item in values:
        if isinstance(item, UserRole):
            role = item
        elif isinstance(item, str):
            raw_role = item.strip()
            if not raw_role:
                continue
            role = LEGACY_ROLE_ALIASES.get(raw_role, UserRole(raw_role))
        else:
            raise ValueError("Each role must be a string")

        if role not in normalized:
            normalized.append(role)

    return normalized or [DEFAULT_ROLE]

# ==========================================
# 1. SHARED PROFILE MODELS
# ==========================================

class UserProfileBase(BaseModel):
    """
    Data required to create a profile.
    Shared by both Email registration and Google registration.
    """
    full_name: str | None = None
    address: str
    city: str | None = None
    postal_code: str | None = None
    nic: str
    phone: str
    roles: list[UserRole] = Field(
        default_factory=lambda: [DEFAULT_ROLE],
        validation_alias=AliasChoices("roles", "role"),
    )
    saved_vehicle_ids: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_role_inputs(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        if "roles" in normalized or "role" in normalized:
            normalized["roles"] = normalize_roles(normalized.get("roles", normalized.get("role")))
        else:
            normalized["roles"] = [DEFAULT_ROLE]
        normalized.pop("role", None)
        return normalized

class UserProfileUpdate(BaseModel):
    """
    For updating profile fields later (PATCH /users/me).
    """
    full_name: str | None = None
    address: str | None = None
    city: str | None = None
    postal_code: str | None = None
    nic: str | None = None
    phone: str | None = None
    roles: list[UserRole] | None = Field(
        default=None,
        validation_alias=AliasChoices("roles", "role"),
    )
    saved_vehicle_ids: list[str] | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_role_inputs(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        if "roles" in normalized or "role" in normalized:
            normalized["roles"] = normalize_roles(normalized.get("roles", normalized.get("role")))
        normalized.pop("role", None)
        return normalized

    @model_validator(mode='after')
    def check_at_least_one_value(self) -> 'UserProfileUpdate':
        if not self.model_dump(exclude_unset=True):
            raise ValueError('At least one field must be provided for update')
        return self

class UserProfile(UserProfileBase):
    """
    Full user profile model returned to client.
    Used for: GET /users/me AND POST /auth/login/social
    """
    uid: str = Field(alias="_id") # Maps MongoDB '_id' to 'uid'
    email: EmailStr
    avatar_url: str | None = None
    two_factor_enabled: bool = False
    password_changed_at: str | None = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "uid": "FirebaseUID_12345",
                "email": "user@example.com",
                "full_name": "John Doe",
                "address": "123 Main St",
                "city": "Colombo",
                "postal_code": "00300",
                "nic": "123456789V",
                "phone": "+94771234567",
                "roles": [UserRole.VEHICLE_OWNER, UserRole.RENTER],
                "avatar_url": "/uploads/example.jpg",
            }
        },
    )


class PublicUserProfile(BaseModel):
    uid: str
    full_name: str | None = None
    email: EmailStr
    avatar_url: str | None = None

# ==========================================
# 2. REGISTRATION REQUESTS
# ==========================================

class RegisterEmailRequest(BaseModel):
    """
    For POST /auth/register/email
    Needs Auth info (Email/Pass) + Profile info
    """
    email: EmailStr
    password: str
    # Profile Data
    full_name: str | None = None
    address: str
    city: str | None = None
    postal_code: str | None = None
    nic: str
    phone: str
    roles: list[UserRole] = Field(
        default_factory=lambda: [DEFAULT_ROLE],
        validation_alias=AliasChoices("roles", "role"),
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_role_inputs(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        if "roles" in normalized or "role" in normalized:
            normalized["roles"] = normalize_roles(normalized.get("roles", normalized.get("role")))
        else:
            normalized["roles"] = [DEFAULT_ROLE]
        normalized.pop("role", None)
        return normalized

class SocialProfileRequest(UserProfileBase):
    """
    For POST /auth/register/social
    Only needs Profile info (Address/NIC/Phone).
    UID/Email are extracted from the Token.
    """
    pass

class RegisterResponse(BaseModel):
    uid: str
    email: EmailStr
    message: str
    profile: UserProfileBase

# ==========================================
# 3. LOGIN REQUESTS
# ==========================================

class LoginRequest(BaseModel):
    """
    For POST /auth/login (Email/Pass only)
    """
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    uid: str
    email: EmailStr | None = None
    idToken: str | None = None
    two_factor_required: bool = False
    two_factor_token: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    two_factor_code: str | None = None


class TwoFactorSetupResponse(BaseModel):
    enabled: bool
    pending_setup: bool
    secret: str
    otpauth_url: str


class TwoFactorStatusResponse(BaseModel):
    enabled: bool
    pending_setup: bool


class TwoFactorVerifyRequest(BaseModel):
    code: str


class TwoFactorDisableRequest(BaseModel):
    current_password: str
    code: str


class LoginTwoFactorRequest(BaseModel):
    two_factor_token: str
    code: str
