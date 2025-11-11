import os
from pathlib import Path

import uvicorn
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI


# Create an instance of the FastAPI class
app = FastAPI(
    title="My Awesome API",
    docs_url="/"
)

env_path = os.getenv("FIREBASE_CREDENTIAL_PATH")
if env_path:
    cred_path = Path(env_path)
else:
    # main.py is in Server/app/, so go up one directory to Server/
    cred_path = Path(__file__).resolve().parent.parent / "firebase-service-account.json"

if not cred_path.exists():
    raise FileNotFoundError(
        f"Firebase service account file not found at {cred_path}. "
        "Set FIREBASE_CREDENTIAL_PATH environment variable if the file is located elsewhere."
    )

if not firebase_admin._apps:
    cred = credentials.Certificate(str(cred_path))
    firebase_admin.initialize_app(cred)


@app.get("/")
def read_root():
    """A simple root endpoint that returns a welcome message."""
    return {"message": "Hello, FastAPI with Docker!"}

@app.post('/signup')
async def signup():
    pass

@app.post('/login')
async def login():
    pass

@app.post('/ping')
async def ping():
    pass
