import os
import requests
from fastapi import APIRouter, HTTPException, Depends
from firebase_admin import auth
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import our new dependencies and schemas
from app.db import get_database
from app.schemas import (
    RegisterRequest, 
    LoginRequest, 
    AuthResponse, 
    RegisterResponse, 
    UserProfileBase
)
from app.crud.user import create_user_profile

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register_user(
    payload: RegisterRequest, 
    db: AsyncIOMotorDatabase = Depends(get_database) # Inject the DB
):
    """
    Create a new user in Firebase Auth and store their profile in MongoDB.
    """
    try:
        # 1. Create user in Firebase (set display_name so UserRecord.display_name is populated)
        user = auth.create_user(
            email=payload.email,
            password=payload.password,
            display_name=payload.name,
        )
    except Exception as e:
        # Handle Firebase errors (e.g., email already exists)
        raise HTTPException(status_code=400, detail=f"Firebase error: {e}")

    # 2. Prepare profile data for MongoDB
    profile_data = UserProfileBase(
        name=payload.name,
        address=payload.address,
        nic=payload.nic,
        phone=payload.phone,
        role=payload.role or "user"
    )

    try:
        # 3. Create user profile in MongoDB
        created_profile = await create_user_profile(
            db=db,
            uid=user.uid,
            email=user.email,
            profile_data=profile_data
        )
        
        # Return a success response
        # Prefer the profile data's name (we set display_name when creating the user);
        # fall back to Firebase's display_name or the original payload if needed.
        returned_name = getattr(profile_data, "name", None) or getattr(user, "display_name", None) or payload.name

        return RegisterResponse(
            uid=user.uid,
            name=returned_name,
            email=user.email or payload.email,
            profile=profile_data
        )
    except Exception as e:
        # --- CRITICAL: Rollback Logic ---
        # If Mongo fails, we must delete the user from Firebase
        # to prevent an inconsistent state.
        try:
            auth.delete_user(user.uid)
            print(f"Rollback successful: Deleted Firebase user {user.uid}")
        except Exception as del_e:
            # This is a critical failure. Log it.
            print(f"CRITICAL ERROR: Failed to create Mongo profile for {user.uid} AND failed to delete Firebase user. Error: {del_e}")
        
        raise HTTPException(status_code=500, detail=f"MongoDB error: {e}. Firebase user creation rolled back.")


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest):
    """
    Sign in a user using Firebase Auth REST API.
    (This endpoint remains unchanged in functionality)
    """
    api_key = os.getenv("FIREBASE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="FIREBASE_API_KEY is not set."
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
        try:
            err = resp.json()
        except Exception:
            err = {"error": resp.text}
        raise HTTPException(status_code=401, detail=err)

    body = resp.json()
    uid = body.get("localId")
    id_token = body.get("idToken")

    return AuthResponse(uid=uid, email=payload.email, idToken=id_token)