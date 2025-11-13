from pydantic import BaseModel, EmailStr, Field

# --- User Profile Models ---

class UserProfileBase(BaseModel):
    """
    Base model for user profile data (what we expect on creation).
    """
    name: str
    address: str
    nic: str
    phone: str
    role: str = "user" # Default role

class UserProfile(UserProfileBase):
    """
    Full user profile model, including data from MongoDB.
    We use the Firebase UID as the _id in MongoDB.
    """
    uid: str = Field(alias="_id") # Map MongoDB's `_id` to `uid`
    email: EmailStr

    class Config:
        populate_by_name = True # Allows mapping `_id` to `uid`
        json_schema_extra = {
            "example": {
                "uid": "FirebaseUID_12345",
                "name": "John Doe",
                "email": "user@example.com",
                "address": "123 Main St",
                "nic": "123456789V",
                "phone": "+94771234567",
                "role": "user"
            }
        }

# --- Auth request/response models ---

class RegisterRequest(BaseModel):
    """
    Model for the /register endpoint. Includes auth and profile fields.
    """
    email: EmailStr
    password: str
    # Add the new profile fields
    name: str
    address: str
    nic: str
    phone: str
    role: str | None = "user" # Optional, defaults to 'user'

class RegisterResponse(BaseModel):
    """
    Response model for successful registration.
    """
    uid: str
    name: str
    email: EmailStr
    message: str = "User registered successfully"
    profile: UserProfileBase # Return the created profile data


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    uid: str
    email: EmailStr | None = None
    idToken: str | None = None