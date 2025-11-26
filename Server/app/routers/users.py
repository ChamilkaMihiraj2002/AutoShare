from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import our new dependencies and schemas
from app.core.auth_deps import get_current_user
from app.core.db import get_database
from app.crud.user import get_user_profile_by_uid
from app.schemas import UserProfile

router = APIRouter(
    prefix="/users",
    tags=["Users"]
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