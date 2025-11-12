import uvicorn
from fastapi import FastAPI

# --- Firebase Initialization ---
# Import firebase_setup to run the initialization code on startup
# This line MUST be before any code that uses 'firebase_admin'
import app.firebase_setup

# --- Import Routers ---
from app.routers import general, auth, users

# --- FastAPI App Initialization ---
app = FastAPI(
    title="AutoShare Server API",
    docs_url="/"
)

# --- Include Routers ---
# Note: The 'general' router includes the root path ("/")
# It's often good to include it last if other routers have specific root paths,
# but here it's fine.
app.include_router(general.router)
app.include_router(auth.router)
app.include_router(users.router)