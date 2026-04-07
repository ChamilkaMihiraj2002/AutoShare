# AutoShare Server — local setup

This folder contains the FastAPI server for AutoShare.

## Environment variables

The server expects these variables to be available at runtime:

- `MONGODB_URL` — MongoDB connection string for Atlas or a local Docker MongoDB instance.
- `MONGODB_DB_NAME` — MongoDB database name. This project uses `AutoShare`.
- `FIREBASE_CREDENTIAL_PATH` — path to the Firebase service account JSON (already mounted via `./secrets` in `docker-compose.yml`).
- `FIREBASE_API_KEY` — Firebase Web API Key required for email/password sign-in via the Firebase REST API.

## Local MongoDB with Docker

You can run MongoDB locally with:

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v ~/mongo_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  mongo:latest
```

For that container, use this server config in `Server/.env`:

```env
MONGODB_URL=mongodb://admin:admin123@localhost:27017/AutoShare?authSource=admin
MONGODB_DB_NAME=AutoShare
```

To copy the existing Atlas data into the local container:

```bash
docker exec mongodb sh -lc 'rm -rf /tmp/autoshare-atlas && mkdir -p /tmp/autoshare-atlas'
docker exec -e ATLAS_URI="your_atlas_uri" mongodb sh -lc 'mongodump --uri "$ATLAS_URI" --db AutoShare --out /tmp/autoshare-atlas'
docker exec mongodb sh -lc 'mongorestore --uri "mongodb://admin:admin123@localhost:27017/?authSource=admin" --drop --db AutoShare /tmp/autoshare-atlas/AutoShare'
```

Then verify the restore:

```bash
docker exec mongodb mongosh --quiet \
  --username admin \
  --password admin123 \
  --authenticationDatabase admin \
  AutoShare \
  --eval 'printjson({collections: db.getCollectionNames(), users: db.users.countDocuments(), vehicles: db.vehicles.countDocuments(), rents: db.rents.countDocuments()})'
```

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
