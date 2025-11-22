from pydantic import BaseModel, EmailStr, Field, model_validator

# ==========================================
# 1. SHARED PROFILE MODELS
# ==========================================

class UserProfileBase(BaseModel):
    """
    Data required to create a profile.
    Shared by both Email registration and Google registration.
    """
    address: str
    nic: str
    phone: str
    role: str = "user"

class UserProfileUpdate(BaseModel):
    """
    For updating profile fields later (PATCH /users/me).
    """
    address: str | None = None
    nic: str | None = None
    phone: str | None = None

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

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "uid": "FirebaseUID_12345",
                "email": "user@example.com",
                "address": "123 Main St",
                "nic": "123456789V",
                "phone": "+94771234567",
                "role": "user"
            }
        }

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
    address: str
    nic: str
    phone: str
    role: str | None = "user"

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