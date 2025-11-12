import os
import requests
from fastapi import APIRouter, HTTPException
from firebase_admin import auth

# Import our custom schemas
from app.schemas import RegisterRequest, LoginRequest, AuthResponse

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=AuthResponse, status_code=201)
def register_user(payload: RegisterRequest):
    """Create a new user in Firebase with email & password and return the uid."""
    try:
        user = auth.create_user(email=payload.email, password=payload.password)
        return AuthResponse(uid=user.uid, email=user.email)
    except Exception as e:
        # firebase_admin may raise ValueError or firebase_admin._auth_utils.EmailAlreadyExistsError
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest):
    """Sign in a user using Firebase Auth REST API (requires FIREBASE_API_KEY env var).

    Returns uid and idToken on success.
    """
    api_key = os.getenv("FIREBASE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail=("FIREBASE_API_KEY environment variable not set. "
                    "Set it to your Firebase Web API Key to enable email/password login via the REST API."),
        )

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    data = {
        "email": payload.email,
        "password": payload.password,
        "returnSecureToken": True,
    }

    try:
        resp = requests.post(url, json=data, timeout=10)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")

    if resp.status_code != 200:
        # forward useful error message from Firebase
        try:
            err = resp.json()
        except Exception:
            err = {"error": resp.text}
        raise HTTPException(status_code=401, detail=err)

    body = resp.json()
    # body contains localId (uid), idToken, refreshToken, expiresIn
    uid = body.get("localId")
    id_token = body.get("idToken")

    return AuthResponse(uid=uid, email=payload.email, idToken=id_token)