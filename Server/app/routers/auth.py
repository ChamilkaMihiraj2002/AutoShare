import os
import requests
from fastapi import APIRouter, HTTPException, Depends, status
from firebase_admin import auth
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import dependencies
from app.db import get_database
from app.auth_deps import get_current_user

# Import schemas
from app.schemas import (
    RegisterEmailRequest,
    SocialProfileRequest,
    LoginRequest, 
    AuthResponse, 
    RegisterResponse, 
    UserProfile,
    UserProfileBase
)

# Import CRUD operations
from app.crud.user import create_user_profile, get_user_profile_by_uid

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# ==========================================
# 1. REGISTER: EMAIL & PASSWORD
# ==========================================
@router.post("/register/email", response_model=RegisterResponse, status_code=201)
async def register_email_user(
    payload: RegisterEmailRequest, 
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Creates a new user in Firebase (Email/Password) AND a profile in MongoDB.
    Includes rollback logic if MongoDB fails.
    """
    # A. Create user in Firebase
    try:
        user = auth.create_user(email=payload.email, password=payload.password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Firebase error: {e}")

    # B. Prepare profile data
    profile_data = UserProfileBase(
        address=payload.address,
        nic=payload.nic,
        phone=payload.phone,
        role=payload.role or "user"
    )

    # C. Create Mongo Profile (with Rollback)
    try:
        await create_user_profile(
            db=db, 
            uid=user.uid, 
            email=user.email, 
            profile_data=profile_data
        )
        return RegisterResponse(
            uid=user.uid, 
            email=user.email, 
            message="Email user registered successfully", 
            profile=profile_data
        )
    except Exception as e:
        # Rollback: Delete Firebase user if DB write fails
        try:
            auth.delete_user(user.uid)
        except:
            pass 
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


# ==========================================
# 2. REGISTER: GOOGLE / SOCIAL
# ==========================================
@router.post("/register/social", response_model=RegisterResponse, status_code=201)
async def register_social_user(
    payload: SocialProfileRequest,
    decoded_token: dict = Depends(get_current_user), # Validates Google Token
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Completes registration for a user who already signed in with Google.
    Creates the MongoDB profile.
    """
    user_uid = decoded_token.get("uid")
    user_email = decoded_token.get("email")

    # A. Check if profile already exists
    existing_profile = await get_user_profile_by_uid(db, uid=user_uid)
    if existing_profile:
        raise HTTPException(
            status_code=400, 
            detail="User profile already exists. Please login instead."
        )

    # B. Create Profile in MongoDB
    try:
        await create_user_profile(
            db=db, 
            uid=user_uid, 
            email=user_email, 
            profile_data=payload
        )
        
        return RegisterResponse(
            uid=user_uid, 
            email=user_email, 
            message="Social profile created successfully", 
            profile=payload
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


# ==========================================
# 3. LOGIN: EMAIL & PASSWORD
# ==========================================
@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest):
    """
    Exchanges Email/Password for a Firebase ID Token via REST API.
    """
    api_key = os.getenv("FIREBASE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="FIREBASE_API_KEY not set")

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    data = {
        "email": payload.email, 
        "password": payload.password, 
        "returnSecureToken": True
    }

    try:
        resp = requests.post(url, json=data, timeout=10)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")

    if resp.status_code != 200:
        try:
            err = resp.json()
        except:
            err = {"error": resp.text}
        raise HTTPException(status_code=401, detail=err)

    body = resp.json()
    return AuthResponse(
        uid=body.get("localId"), 
        email=payload.email, 
        idToken=body.get("idToken")
    )


# ==========================================
# 4. LOGIN: GOOGLE / SOCIAL (CHECK)
# ==========================================
@router.post("/login/social", response_model=UserProfile)
async def login_social_user(
    decoded_token: dict = Depends(get_current_user), # Validates Google Token
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Checks if a Google User has a profile in MongoDB.
    - 200 OK: Login Success (returns profile).
    - 404 Not Found: User needs to Register (Frontend should redirect to register flow).
    """
    user_uid = decoded_token.get("uid")
    
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User profile not found. Please complete registration."
        )
        
    return profile