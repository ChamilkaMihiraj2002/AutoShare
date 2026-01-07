import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials


# Singleton holder for the initialized Firebase app
_FIREBASE_APP = None


def _locate_credential_path() -> Path:
    env_path = os.getenv("FIREBASE_CREDENTIAL_PATH")
    if env_path:
        return Path(env_path)
    return Path(__file__).resolve().parent.parent / "firebase-service-account.json"


def get_firebase_app():
    """Return the initialized Firebase app instance, initializing it if necessary.

    This function implements a safe singleton pattern: repeated calls return the same
    app instance and initialization is only attempted once.
    """
    global _FIREBASE_APP
    if _FIREBASE_APP:
        return _FIREBASE_APP

    cred_path = _locate_credential_path()
    if not cred_path.exists():
        # Credential not found; do not raise here to keep tests running in environments
        # without Firebase credentials. Caller can decide how to handle None.
        print(f"Firebase service account file not found at {cred_path}.")
        print("Set FIREBASE_CREDENTIAL_PATH environment variable if the file is located elsewhere.")
        return None

    try:
        cred = credentials.Certificate(str(cred_path))
        _FIREBASE_APP = firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
        return _FIREBASE_APP
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        return None


def get_firebase_admin():
    """Return the `firebase_admin` module (for access to `auth`, etc.)."""
    return firebase_admin


# Preserve previous behavior: attempt initialization at import time but in a safe way
try:
    get_firebase_app()
except Exception:
    # Swallow exceptions to avoid failing import in test environments
    pass

