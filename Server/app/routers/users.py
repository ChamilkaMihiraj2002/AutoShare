from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import os
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File
from firebase_admin import auth
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import our new dependencies and schemas
from app.core.auth_deps import get_current_user
from app.core.db import get_database
from app.repositories.user import (
    get_user_profile_by_uid,
    update_user_profile_by_uid,
    delete_user_profile_by_uid,
    set_saved_vehicle_ids,
)
from app.repositories.vehicle import get_vehicle_by_id, list_all_vehicles
from app.schemas import (
    UserProfile,
    UserProfileUpdate,
    PublicUserProfile,
    Vehicle,
    ChangePasswordRequest,
    TwoFactorSetupResponse,
    TwoFactorStatusResponse,
    TwoFactorVerifyRequest,
    TwoFactorDisableRequest,
)
from app.services.audit_log import create_audit_log
from app.services.two_factor_auth import build_otpauth_url, generate_totp_secret, verify_totp_code

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _normalize_saved_vehicle_ids(saved_vehicle_ids: list[str] | None) -> list[str]:
    if not saved_vehicle_ids:
        return []

    normalized: list[str] = []
    seen: set[str] = set()
    for vehicle_id in saved_vehicle_ids:
        cleaned = (vehicle_id or "").strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalized.append(cleaned)
    return normalized


def _require_firebase_api_key() -> str:
    api_key = os.getenv("FIREBASE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="FIREBASE_API_KEY not set")
    return api_key


def _verify_email_password(email: str, password: str) -> None:
    try:
        response = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={_require_firebase_api_key()}",
            json={"email": email, "password": password, "returnSecureToken": True},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Auth provider error: {exc}") from exc
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect.")


def _security_status(profile: dict) -> TwoFactorStatusResponse:
    return TwoFactorStatusResponse(
        enabled=bool(profile.get("two_factor_enabled")),
        pending_setup=bool(profile.get("two_factor_pending_secret")),
    )

@router.get("/me", response_model=UserProfile)
async def read_current_user(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database) # Inject the DB
):
    """
    Get the current user's Firebase token info AND their MongoDB profile.
    
    The 'decoded_token' is injected by 'get_current_user'.
    The 'db' is injected by 'get_database'.
    """
    user_uid = decoded_token.get("uid")
    
    # Fetch profile from MongoDB
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    
    if not profile:
        # This case (Firebase user exists but no profile) should be rare
        # but could happen if registration rollback fails.
        raise HTTPException(
            status_code=404, 
            detail="User profile not found in database."
        )
    
    # `profile` is a dict from Mongo, including `_id`
    # The UserProfile schema will automatically map `_id` to `uid`
    # because we used Field(alias="_id") and Config.populate_by_name
    return profile


@router.patch("/me", response_model=UserProfile)
async def update_current_user(
    payload: UserProfileUpdate,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Update the current user's profile. Accepts partial fields via `UserProfileUpdate`.
    """
    user_uid = decoded_token.get("uid")
    update_dict = payload.model_dump(exclude_unset=True)

    updated = await update_user_profile_by_uid(db, uid=user_uid, update_data=update_dict)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    await create_audit_log(
        db,
        action="users.update_profile",
        outcome="success",
        message="User profile updated",
        actor_uid=user_uid,
        actor_email=updated.get("email"),
        entity_type="user",
        entity_id=user_uid,
        metadata={"updated_fields": sorted(update_dict.keys())},
    )
    return updated


@router.get("/{uid}", response_model=PublicUserProfile)
async def read_user_by_uid(
    uid: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    profile = await get_user_profile_by_uid(db, uid=uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return {
        "uid": profile.get("_id", uid),
        "full_name": profile.get("full_name"),
        "email": profile.get("email"),
        "avatar_url": profile.get("avatar_url"),
    }


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Delete the current user's profile from the database.
    Returns 204 No Content on success.
    """
    user_uid = decoded_token.get("uid")
    existing = await get_user_profile_by_uid(db, uid=user_uid)
    deleted = await delete_user_profile_by_uid(db, uid=user_uid)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    await create_audit_log(
        db,
        action="users.delete_profile",
        outcome="success",
        message="User profile deleted",
        actor_uid=user_uid,
        actor_email=(existing or {}).get("email"),
        entity_type="user",
        entity_id=user_uid,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/avatar", response_model=UserProfile)
async def upload_avatar(
    avatar: UploadFile = File(...),
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    content_type = (avatar.content_type or "").lower()
    extension = ALLOWED_IMAGE_TYPES.get(content_type)
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type. Use JPG, PNG, or WEBP.",
        )

    content = await avatar.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(content) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image exceeds 5MB limit.")

    user_uid = decoded_token.get("uid")
    filename = f"{user_uid}_{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    destination.write_bytes(content)

    avatar_url = f"/uploads/{filename}"
    updated = await update_user_profile_by_uid(db, uid=user_uid, update_data={"avatar_url": avatar_url})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    await create_audit_log(
        db,
        action="users.upload_avatar",
        outcome="success",
        message="User avatar uploaded",
        actor_uid=user_uid,
        actor_email=updated.get("email"),
        entity_type="user",
        entity_id=user_uid,
        metadata={"avatar_url": avatar_url},
    )
    return updated


@router.get("/me/two-factor", response_model=TwoFactorStatusResponse)
async def get_two_factor_status(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return _security_status(profile)


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_current_user_password(
    payload: ChangePasswordRequest,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from the current password.")

    _verify_email_password(profile.get("email", ""), payload.current_password)

    if profile.get("two_factor_enabled"):
        if not payload.two_factor_code or not verify_totp_code(profile.get("two_factor_secret", ""), payload.two_factor_code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Valid two-factor authentication code is required.")

    try:
        auth.update_user(user_uid, password=payload.new_password)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unable to update password: {exc}") from exc

    password_changed_at = datetime.now(timezone.utc).isoformat()
    await update_user_profile_by_uid(db, uid=user_uid, update_data={"password_changed_at": password_changed_at})
    await create_audit_log(
        db,
        action="users.change_password",
        outcome="success",
        message="User changed password",
        actor_uid=user_uid,
        actor_email=profile.get("email"),
        entity_type="user",
        entity_id=user_uid,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/two-factor/setup", response_model=TwoFactorSetupResponse)
async def begin_two_factor_setup(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    secret = generate_totp_secret()
    await update_user_profile_by_uid(db, uid=user_uid, update_data={"two_factor_pending_secret": secret})
    return TwoFactorSetupResponse(
        enabled=bool(profile.get("two_factor_enabled")),
        pending_setup=True,
        secret=secret,
        otpauth_url=build_otpauth_url(email=profile.get("email", ""), secret=secret),
    )


@router.post("/me/two-factor/enable", response_model=TwoFactorStatusResponse)
async def enable_two_factor(
    payload: TwoFactorVerifyRequest,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    pending_secret = profile.get("two_factor_pending_secret")
    if not pending_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Two-factor setup has not been started.")
    if not verify_totp_code(pending_secret, payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication code.")

    updated = await update_user_profile_by_uid(
        db,
        uid=user_uid,
        update_data={
            "two_factor_enabled": True,
            "two_factor_secret": pending_secret,
            "two_factor_pending_secret": None,
        },
    )
    await create_audit_log(
        db,
        action="users.enable_two_factor",
        outcome="success",
        message="User enabled two-factor authentication",
        actor_uid=user_uid,
        actor_email=profile.get("email"),
        entity_type="user",
        entity_id=user_uid,
    )
    return _security_status(updated or {})


@router.post("/me/two-factor/disable", response_model=TwoFactorStatusResponse)
async def disable_two_factor(
    payload: TwoFactorDisableRequest,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    if not profile.get("two_factor_enabled") or not profile.get("two_factor_secret"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Two-factor authentication is not enabled.")

    _verify_email_password(profile.get("email", ""), payload.current_password)
    if not verify_totp_code(profile.get("two_factor_secret", ""), payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication code.")

    updated = await update_user_profile_by_uid(
        db,
        uid=user_uid,
        update_data={
            "two_factor_enabled": False,
            "two_factor_secret": None,
            "two_factor_pending_secret": None,
        },
    )
    await create_audit_log(
        db,
        action="users.disable_two_factor",
        outcome="success",
        message="User disabled two-factor authentication",
        actor_uid=user_uid,
        actor_email=profile.get("email"),
        entity_type="user",
        entity_id=user_uid,
    )
    return _security_status(updated or {})


@router.get("/me/saved-vehicles", response_model=list[Vehicle])
async def read_saved_vehicles(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    saved_vehicle_ids = _normalize_saved_vehicle_ids(profile.get("saved_vehicle_ids"))
    if not saved_vehicle_ids:
        return []

    vehicles = await list_all_vehicles(db=db, limit=1000)
    vehicle_by_id = {str(vehicle.get("_id")): vehicle for vehicle in vehicles}
    return [vehicle_by_id[vehicle_id] for vehicle_id in saved_vehicle_ids if vehicle_id in vehicle_by_id]


@router.post("/me/saved-vehicles/{vehicle_id}", response_model=UserProfile)
async def save_vehicle_for_current_user(
    vehicle_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    vehicle = await get_vehicle_by_id(db=db, vehicle_id=vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    saved_vehicle_ids = _normalize_saved_vehicle_ids(profile.get("saved_vehicle_ids"))
    if vehicle_id not in saved_vehicle_ids:
        saved_vehicle_ids.append(vehicle_id)

    updated = await set_saved_vehicle_ids(db, uid=user_uid, saved_vehicle_ids=saved_vehicle_ids)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    await create_audit_log(
        db,
        action="users.save_vehicle",
        outcome="success",
        message="Vehicle saved for user",
        actor_uid=user_uid,
        actor_email=updated.get("email"),
        entity_type="vehicle",
        entity_id=vehicle_id,
    )
    return updated


@router.delete("/me/saved-vehicles/{vehicle_id}", response_model=UserProfile)
async def remove_saved_vehicle_for_current_user(
    vehicle_id: str,
    decoded_token: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_uid = decoded_token.get("uid")
    profile = await get_user_profile_by_uid(db, uid=user_uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    saved_vehicle_ids = [
        saved_vehicle_id
        for saved_vehicle_id in _normalize_saved_vehicle_ids(profile.get("saved_vehicle_ids"))
        if saved_vehicle_id != vehicle_id
    ]
    updated = await set_saved_vehicle_ids(db, uid=user_uid, saved_vehicle_ids=saved_vehicle_ids)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    await create_audit_log(
        db,
        action="users.remove_saved_vehicle",
        outcome="success",
        message="Saved vehicle removed for user",
        actor_uid=user_uid,
        actor_email=updated.get("email"),
        entity_type="vehicle",
        entity_id=vehicle_id,
    )
    return updated
