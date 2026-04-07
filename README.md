# AutoShare

AutoShare is a full-stack vehicle rental platform with a React frontend and a FastAPI backend. Renters can browse vehicles and place bookings, while owners can manage listings, approve requests, and track earnings.

## Repository structure

- `Client/` - React 19 + TypeScript + Vite frontend
- `Server/` - FastAPI + MongoDB + Firebase backend

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Firebase Auth, Leaflet
- Backend: FastAPI, Motor, MongoDB, Firebase Admin SDK, Pytest

## Features

- Email/password and Google-based authentication with Firebase
- Public vehicle browsing
- Vehicle booking flow for renters
- Owner dashboard for vehicle management
- Booking request handling for owners
- Earnings overview for owners
- Profile management and avatar uploads
- Vehicle image uploads served by the backend

## Prerequisites

- Node.js 20+
- npm
- Python 3.10+
- MongoDB Atlas or a local MongoDB instance
- Firebase project credentials

## Quick start

### 1. Start the backend

```bash
cd Server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` and the FastAPI docs are served at the root path.

### 2. Start the frontend

```bash
cd Client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Environment variables

### Frontend (`Client/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend (`Server/.env`)

```env
MONGODB_URL=your_mongodb_connection_string
MONGODB_DB_NAME=AutoShare
FIREBASE_CREDENTIAL_PATH=/absolute/path/to/firebase-service-account.json
FIREBASE_API_KEY=your_firebase_web_api_key
```

Notes:

- `FIREBASE_CREDENTIAL_PATH` is used by the Firebase Admin SDK on the server.
- `FIREBASE_API_KEY` is used by the backend email/password login flow.
- If `FIREBASE_CREDENTIAL_PATH` is not set, the server also looks for a local service account JSON near the backend app.

## Useful commands

### Frontend

```bash
cd Client
npm run dev
npm run build
npm run lint
npm run preview
```

### Backend

```bash
cd Server
make install
make run
make test
make lint
make format
make docker-up-build
```

## API overview

Main backend route groups:

- `/auth` - registration and login
- `/users` - current user profile and avatar upload
- `/vehicles` - owner vehicle CRUD and image upload
- `/rents` - renter bookings, owner approvals, earnings
- `/vehicles` - public vehicle listing is also exposed from the root router

## Testing

Backend tests live in `Server/tests/` and can be run with:

```bash
cd Server
pytest -q
```

## Additional docs

- Backend setup details: `Server/README.md`
- Frontend scaffold notes: `Client/README.md`

## License

This project is licensed under the terms in `LICENSE`.
