import os
import requests
from fastapi import APIRouter, HTTPException, Depends, status
from firebase_admin import auth
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import dependencies
from app.core.db import get_database
from app.core.auth_deps import get_current_user

# Import schemas
from app.schemas import (
    RegisterEmailRequest,
    SocialProfileRequest,
    LoginRequest, 
    AuthResponse, 
    RegisterResponse, 
    UserProfile,
    UserProfileBase,
    LoginTwoFactorRequest,
)

# Import CRUD operations
from app.repositories.user import create_user_profile, get_user_profile_by_uid
from app.services.audit_log import create_audit_log
from app.services.two_factor_auth import create_login_challenge_token, verify_login_challenge_token, verify_totp_code

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
        await create_audit_log(
            db,
            action="auth.register_email",
            outcome="failure",
            message="Email registration failed while creating Firebase user",
            actor_email=payload.email,
            entity_type="user",
            metadata={"error": str(e)},
        )
        raise HTTPException(status_code=400, detail=f"Firebase error: {e}")

    # B. Prepare profile data
    profile_data = UserProfileBase(
        full_name=payload.full_name,
        address=payload.address,
        city=payload.city,
        postal_code=payload.postal_code,
        nic=payload.nic,
        phone=payload.phone,
        roles=payload.roles,
    )

    # C. Create Mongo Profile (with Rollback)
    try:
        await create_user_profile(
            db=db, 
            uid=user.uid, 
            email=user.email, 
            profile_data=profile_data
        )
        await create_audit_log(
            db,
            action="auth.register_email",
            outcome="success",
            message="Email user registered successfully",
            actor_uid=user.uid,
            actor_email=user.email,
            entity_type="user",
            entity_id=user.uid,
            metadata={"roles": profile_data.roles},
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
        await create_audit_log(
            db,
            action="auth.register_email",
            outcome="failure",
            message="Email registration failed while creating MongoDB profile",
            actor_uid=user.uid,
            actor_email=user.email,
            entity_type="user",
            entity_id=user.uid,
            metadata={"error": str(e)},
        )
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
        await create_audit_log(
            db,
            action="auth.register_social",
            outcome="failure",
            message="Social registration rejected because profile already exists",
            actor_uid=user_uid,
            actor_email=user_email,
            entity_type="user",
            entity_id=user_uid,
        )
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
        await create_audit_log(
            db,
            action="auth.register_social",
            outcome="success",
            message="Social user profile created successfully",
            actor_uid=user_uid,
            actor_email=user_email,
            entity_type="user",
            entity_id=user_uid,
            metadata={"roles": payload.roles},
        )
        
        return RegisterResponse(
            uid=user_uid, 
            email=user_email, 
            message="Social profile created successfully", 
            profile=payload
        )
    except Exception as e:
        await create_audit_log(
            db,
            action="auth.register_social",
            outcome="failure",
            message="Social registration failed while creating MongoDB profile",
            actor_uid=user_uid,
            actor_email=user_email,
            entity_type="user",
            entity_id=user_uid,
            metadata={"error": str(e)},
        )
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


# ==========================================
# 3. LOGIN: EMAIL & PASSWORD
# ==========================================
@router.post("/login", response_model=AuthResponse)
async def login_user(
    payload: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
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
        await create_audit_log(
            db,
            action="auth.login_email",
            outcome="failure",
            message="Email login failed while calling auth provider",
            actor_email=payload.email,
            entity_type="user",
            metadata={"error": str(e)},
        )
        raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")

    if resp.status_code != 200:
        try:
            err = resp.json()
        except:
            err = {"error": resp.text}
        await create_audit_log(
            db,
            action="auth.login_email",
            outcome="failure",
            message="Email login rejected by auth provider",
            actor_email=payload.email,
            entity_type="user",
            metadata={"error": err},
        )
        raise HTTPException(status_code=401, detail=err)

    body = resp.json()
    profile = await get_user_profile_by_uid(db, uid=body.get("localId"))
    two_factor_enabled = bool((profile or {}).get("two_factor_enabled"))
    await create_audit_log(
        db,
        action="auth.login_email",
        outcome="success",
        message="Email login succeeded",
        actor_uid=body.get("localId"),
        actor_email=payload.email,
        entity_type="user",
        entity_id=body.get("localId"),
    )
    if two_factor_enabled:
        challenge_token = create_login_challenge_token(
            uid=body.get("localId"),
            email=payload.email,
            id_token=body.get("idToken"),
        )
        return AuthResponse(
            uid=body.get("localId"),
            email=payload.email,
            two_factor_required=True,
            two_factor_token=challenge_token,
        )

    return AuthResponse(uid=body.get("localId"), email=payload.email, idToken=body.get("idToken"))


@router.post("/login/2fa", response_model=AuthResponse)
async def complete_two_factor_login(
    payload: LoginTwoFactorRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    try:
        challenge = verify_login_challenge_token(payload.two_factor_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    profile = await get_user_profile_by_uid(db, uid=challenge.get("uid"))
    if not profile or not profile.get("two_factor_enabled") or not profile.get("two_factor_secret"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Two-factor authentication is not enabled for this user.")

    if not verify_totp_code(profile.get("two_factor_secret", ""), payload.code):
        await create_audit_log(
            db,
            action="auth.login_email_2fa",
            outcome="failure",
            message="Two-factor login verification failed",
            actor_uid=challenge.get("uid"),
            actor_email=challenge.get("email"),
            entity_type="user",
            entity_id=challenge.get("uid"),
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication code.")

    await create_audit_log(
        db,
        action="auth.login_email_2fa",
        outcome="success",
        message="Two-factor login verification succeeded",
        actor_uid=challenge.get("uid"),
        actor_email=challenge.get("email"),
        entity_type="user",
        entity_id=challenge.get("uid"),
    )
    return AuthResponse(
        uid=challenge.get("uid"),
        email=challenge.get("email"),
        idToken=challenge.get("id_token"),
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
        await create_audit_log(
            db,
            action="auth.login_social",
            outcome="failure",
            message="Social login failed because user profile was not found",
            actor_uid=user_uid,
            actor_email=decoded_token.get("email"),
            entity_type="user",
            entity_id=user_uid,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User profile not found. Please complete registration."
        )

    await create_audit_log(
        db,
        action="auth.login_social",
        outcome="success",
        message="Social login succeeded",
        actor_uid=user_uid,
        actor_email=decoded_token.get("email"),
        entity_type="user",
        entity_id=user_uid,
    )

    return profile
