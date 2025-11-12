from fastapi import APIRouter, Depends
from app.auth_deps import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get("/me")
def read_current_user(decoded_token: dict = Depends(get_current_user)):
    """
    A protected endpoint that requires a valid Firebase ID Token.
    
    The 'decoded_token' is injected by the 'get_current_user' dependency.
    """
    # You can now access user information from the decoded token
    user_uid = decoded_token.get("uid")
    user_email = decoded_token.get("email")
    
    return {
        "message": f"Hello, {user_email or user_uid}!",
        "uid": user_uid,
        "email": user_email,
        "all_token_claims": decoded_token
    }