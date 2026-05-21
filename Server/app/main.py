import uvicorn
from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path
from time import perf_counter

# Load environment variables from a local .env file (if present)
# This ensures `MONGODB_URL` and other env vars used during startup are available
load_dotenv()

# --- Firebase Initialization ---
import app.core.firebase_setup

# --- Import Routers ---
from app.routers import general, auth, users
import app.routers.vehicles as vehicles
import app.routers.rents as rents


# --- Import DB Connection Handlers ---
from app.core.db import connect_to_mongo, close_mongo_connection, db as mongo_state
from app.services.audit_log import create_request_log


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.middleware("http")
async def persist_request_logs(request: Request, call_next):
    start_time = perf_counter()
    status_code = 500
    error_message = None

    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception as exc:
        error_message = str(exc)
        raise
    finally:
        database = mongo_state.db
        if database is not None:
            duration_ms = round((perf_counter() - start_time) * 1000, 2)
            outcome = "success" if 200 <= status_code < 400 else "failure"
            message = error_message or f"{request.method} {request.url.path} completed with status {status_code}"

            await create_request_log(
                database,
                route=request.url.path,
                method=request.method,
                status_code=status_code,
                outcome=outcome,
                message=message,
                actor_uid=getattr(request.state, "user_uid", None),
                actor_email=getattr(request.state, "user_email", None),
                metadata={
                    "query_params": dict(request.query_params),
                    "client_host": request.client.host if request.client else None,
                    "duration_ms": duration_ms,
                },
            )

# --- Include Routers ---
app.include_router(general.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vehicles.router)
app.include_router(rents.router)
