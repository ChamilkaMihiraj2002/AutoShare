import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials

print("Attempting to initialize Firebase Admin SDK...")

env_path = os.getenv("FIREBASE_CREDENTIAL_PATH")
if env_path:
    cred_path = Path(env_path)
else:
    # Go up two directories from app/firebase_setup.py to the root
    cred_path = Path(__file__).resolve().parent.parent / "firebase-service-account.json"

if not cred_path.exists():
    print(f"Firebase service account file not found at {cred_path}.")
    print("Set FIREBASE_CREDENTIAL_PATH environment variable if the file is located elsewhere.")
    # In a real app, you might want to raise an error here
    # raise FileNotFoundError(f"Firebase service account file not found at {cred_path}.")
else:
    try:
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        # Depending on your app's needs, you might want to exit or raise
        # exit(1)
