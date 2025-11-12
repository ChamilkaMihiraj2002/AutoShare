# AutoShare Server — local setup

This folder contains the FastAPI server for AutoShare.

## Environment variables

The server expects these variables to be available at runtime:

- `FIREBASE_CREDENTIAL_PATH` — path to the Firebase service account JSON (already mounted via `./secrets` in `docker-compose.yml`).
- `FIREBASE_API_KEY` — Firebase Web API Key required for email/password sign-in via the Firebase REST API.

To run locally with Docker Compose:

1. Copy `.env.example` to `.env` in the `Server/` folder:

   ```bash
   cp .env.example .env
   # then edit .env and set FIREBASE_API_KEY to your real key
   ```

2. Start the server (the compose file will load `.env`):

   ```bash
   docker-compose up --build
   ```

If you run the server outside Docker (e.g., directly on your Mac), make sure `FIREBASE_API_KEY` is exported in your shell, for example (zsh):

```bash
export FIREBASE_API_KEY="your_real_key_here"
uvicorn app.main:app --reload
```

Security note: Never commit your real API keys to Git. Use `.env` (gitignored) or your CI/CD secrets store for production deployments.
