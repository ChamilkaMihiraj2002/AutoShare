import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from a local .env file (if present)
# This ensures `MONGODB_URL` and other env vars used during startup are available
load_dotenv()

# --- Firebase Initialization ---
import app.core.firebase_setup

# --- Import Routers ---
from app.routers import general, auth, users
import app.routers.vehicles as vehicles


# --- Import DB Connection Handlers ---
from app.core.db import connect_to_mongo, close_mongo_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    """
    # On startup
    await connect_to_mongo()
    yield
    # On shutdown
    await close_mongo_connection()


# --- FastAPI App Initialization ---
app = FastAPI(
    title="My Awesome API",
    docs_url="/",
    lifespan=lifespan  # Use the new lifespan manager
)

# --- Include Routers ---
app.include_router(general.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vehicles.router)