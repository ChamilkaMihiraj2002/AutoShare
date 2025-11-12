from pydantic import BaseModel, EmailStr

# --- Auth request/response models ---

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    uid: str
    email: EmailStr | None = None
    idToken: str | None = None