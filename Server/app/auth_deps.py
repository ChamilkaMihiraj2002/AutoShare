from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

# We use HTTPBearer to get the "Bearer <token>" from the Authorization header
http_bearer = HTTPBearer()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(http_bearer)):
    """
    A dependency to verify the Firebase ID token.
    
    It takes the Bearer token from the Authorization header, verifies it
    using the Firebase Admin SDK, and returns the decoded token (user data).
    """
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token missing or invalid."
        )
    
    try:
        # Get the token from the credentials
        id_token = creds.credentials
        # Verify the token using Firebase Admin SDK
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.InvalidIdTokenError as e:
        # Token is invalid (e.g., expired, malformed, wrong signature)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {e}",
        )
    except Exception as e:
        # Handle other potential errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during authentication: {e}"
        )