from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import our new dependencies and schemas
from app.core.auth_deps import get_current_user
from app.core.db import get_database
from app.repositories.user import (
    get_user_profile_by_uid,
    update_user_profile_by_uid,
    delete_user_profile_by_uid,
)
from app.schemas import UserProfile, UserProfileUpdate, PublicUserProfile

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

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
    return updated


@router.get("/{uid}", response_model=PublicUserProfile)
async def read_user_by_uid(
    uid: str,
    _: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    profile = await get_user_profile_by_uid(db, uid=uid)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return {
        "uid": profile.get("_id", uid),
        "full_name": profile.get("full_name"),
        "email": profile.get("email"),
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
    deleted = await delete_user_profile_by_uid(db, uid=user_uid)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
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
    return updated
