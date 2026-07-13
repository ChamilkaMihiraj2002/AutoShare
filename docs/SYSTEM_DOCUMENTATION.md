# AutoShare System Documentation

## Purpose

This document explains the AutoShare codebase as a full system:

- what the application does
- how the frontend and backend are organized
- how data moves through the system
- what each important folder and file is responsible for
- what external services the system depends on
- how the main user flows work

AutoShare is a full-stack vehicle rental platform. It supports public browsing, renter bookings, owner vehicle management, admin review and pricing control, in-app messaging, reviews, dynamic pricing, PayHere checkout, and an AI vehicle assistant.

## High-Level Architecture

```text
Browser
  |
  v
React 19 + TypeScript + Vite frontend
  |
  | HTTP/JSON + multipart uploads
  v
FastAPI backend
  |
  +--> Firebase Auth / Firebase Admin SDK
  |
  +--> MongoDB
  |
  +--> PayHere
  |
  +--> Ollama
  |
  +--> Weather / geocoding / routing helpers
```

## Main Runtime Layers

### Frontend

The frontend is a React single-page application in `Client/`.

Its main responsibilities are:

- rendering public marketing and browsing pages
- handling sign-up and sign-in flows
- calling backend APIs
- storing user and admin tokens in `localStorage`
- rendering renter, owner, and admin dashboards
- managing booking UI, payment handoff, chat, notifications, and profile editing

### Backend

The backend is a FastAPI application in `Server/`.

Its main responsibilities are:

- validating and serving REST endpoints
- verifying Firebase tokens
- reading and writing MongoDB documents
- calculating vehicle pricing
- handling file uploads
- creating audit and request logs
- preparing payment payloads for PayHere
- serving assistant replies and recommendations

### Data Stores and External Services

- Firebase Auth: user identity, password changes, Google sign-in tokens
- MongoDB app DB: users, vehicles, rents, messages, reviews, logs
- MongoDB admin DB: admins, admin login events, global pricing settings
- PayHere: checkout session form post and notification callback
- Ollama: local LLM endpoint for assistant chat
- File storage: uploaded avatars, vehicle images, and verification documents under `Server/uploads/`

## Core User Roles

- `user`: generic user role used by some older and mixed-role flows
- `renter`: books vehicles, manages bookings, saves vehicles, writes reviews
- `vehicle_owner`: lists vehicles, manages requests, uploads verification docs, sees earnings
- `admin`: separate admin login and token flow for moderation and pricing control

## End-to-End Request Flow

### Standard authenticated API flow

1. The frontend collects form input.
2. `Client/src/lib/api.ts` sends an HTTP request to the FastAPI backend.
3. For protected routes, the frontend attaches `Authorization: Bearer <Firebase ID token>`.
4. `Server/app/core/auth_deps.py` verifies the token with Firebase Admin.
5. A router validates input using Pydantic schemas.
6. The router calls repository and service functions.
7. Data is stored in MongoDB.
8. The router returns a normalized response model.
9. FastAPI middleware writes a request log to `system_logs`.

### Upload flow

1. The frontend builds a `FormData` payload.
2. The backend validates content type and file size.
3. The file is written to `Server/uploads/...`.
4. The relevant MongoDB document is updated with a relative `/uploads/...` URL.
5. FastAPI statically serves files from `/uploads`.

### Payment flow

1. A renter creates a booking.
2. The backend stores a `pricing_snapshot` on the rent record.
3. The frontend requests `/payments/payhere/checkout-session`.
4. The backend prepares a signed PayHere form payload.
5. The frontend submits that payload to PayHere.
6. PayHere calls `/payments/payhere/notify`.
7. The backend updates `payment_summary` on the rent document.

## Repository Layout

## Top Level

- `README.md`: quick-start repository overview.
- `DYNAMIC_PRICING.md`: focused explanation of pricing rules and booking-page total calculation.
- `LICENSE`: project license.
- `.github/workflows/makefile.yml`: CI workflow that installs server dependencies and runs backend tests.
- `docs/SYSTEM_DOCUMENTATION.md`: full technical system documentation.
- `Client/`: frontend application.
- `Server/`: backend application.

## Frontend Structure

### Frontend Root Files

- `Client/package.json`: frontend scripts and dependencies.
- `Client/package-lock.json`: npm lockfile.
- `Client/vite.config.ts`: Vite configuration.
- `Client/tsconfig.json`: TypeScript solution config.
- `Client/tsconfig.app.json`: app-specific TypeScript settings.
- `Client/tsconfig.node.json`: Node/Vite tooling TypeScript settings.
- `Client/eslint.config.js`: ESLint configuration.
- `Client/index.html`: Vite HTML shell.
- `Client/README.md`: default Vite template readme, not system-specific.
- `Client/public/autoshare-favicon.svg`: app favicon.
- `Client/public/vite.svg`: default Vite asset.
- `Client/dist/`: generated frontend build output.
- `Client/node_modules/`: installed frontend packages.

### Frontend Entry and App Shell

- `Client/src/main.tsx`: React bootstrap that renders `<App />` inside `StrictMode`.
- `Client/src/App.tsx`: defines all routes, layout rules, navbar/footer visibility, and dashboard route trees.
- `Client/src/index.css`: global styling entry.
- `Client/src/App.css`: app-level stylesheet.

### Frontend Layouts

- `Client/src/layouts/DashboardLayout.tsx`: owner dashboard layout and owner navigation shell.
- `Client/src/layouts/UserDashboardLayout.tsx`: renter dashboard layout.
- `Client/src/layouts/AdminLayout.tsx`: admin route guard, nav shell, title logic, and logout behavior.

### Frontend API and Utility Layer

- `Client/src/lib/api.ts`: the main frontend integration layer for all backend endpoints. It normalizes vehicle, rent, conversation, and review payloads and centralizes authenticated fetch logic.
- `Client/src/lib/auth.ts`: stores and clears user and admin tokens in `localStorage`.
- `Client/src/lib/firebase.ts`: initializes Firebase web SDK and exposes Google popup sign-in.
- `Client/src/lib/profile.ts`: profile helper functions and profile update notification helpers used by shared UI.
- `Client/src/lib/twoFactor.ts`: frontend helpers related to two-factor UI behavior.
- `Client/src/lib/notifications.ts`: derives renter and owner notification objects from bookings, vehicles, and profile data.
- `Client/src/lib/currency.ts`: formatting helpers for money display.
- `Client/src/lib/ownerEarnings.ts`: transforms earnings response data into dashboard presentation values.
- `Client/src/lib/vehicleOptions.ts`: reusable vehicle form options such as fuel, transmission, and type selections.

### Frontend Hooks

- `Client/src/hooks/useOwnerEarnings.ts`: loads `/rents/owner/earnings` and exposes owner earnings state.
- `Client/src/hooks/useNotifications.ts`: builds notification state, read/unread persistence, and notification actions.

### Frontend Types and Local Data

- `Client/src/types/index.ts`: shared TypeScript interfaces for vehicles, users, auth, rents, admin models, reviews, pricing, payments, and chat.
- `Client/src/data/mockData.ts`: local mock content used by presentational sections.
- `Client/src/data/mockVehicles.ts`: local mock vehicle data for UI display and fallback development.
- `Client/src/assets/react.svg`: default Vite asset.

### Frontend Shared Components

- `Client/src/components/common/Navbar.tsx`: public site navigation, user menu, dashboard switching, auth-aware header behavior.
- `Client/src/components/common/Footer.tsx`: public footer.
- `Client/src/components/common/Button.tsx`: reusable button component.
- `Client/src/components/common/Modal.tsx`: generic modal wrapper.
- `Client/src/components/common/LoadingOverlay.tsx`: UI overlay for in-progress actions.
- `Client/src/components/common/LoadingScreen.tsx`: full-screen loading state component.
- `Client/src/components/cards/CarCard.tsx`: vehicle listing card for search and saved vehicles.
- `Client/src/components/forms/SearchBar.tsx`: search/filter input component.
- `Client/src/components/map/MapWidget.tsx`: map rendering and location visualization.
- `Client/src/components/dashboard/DashboardNavbar.tsx`: owner dashboard top bar, profile menu, and role switching.
- `Client/src/components/dashboard/StatCard.tsx`: compact dashboard metric display.
- `Client/src/components/dashboard/EditProfileModal.tsx`: modal editing UI for profile details.
- `Client/src/components/messages/MessagePopup.tsx`: shared message popup UI.
- `Client/src/components/messages/OwnerMessagesPopup.tsx`: owner-focused quick messaging UI.
- `Client/src/components/messages/AIAssistantPopup.tsx`: floating assistant widget that talks to the backend assistant endpoint.
- `Client/src/components/notifications/NotificationBell.tsx`: notification trigger icon and count badge.
- `Client/src/components/notifications/NotificationsList.tsx`: notification list renderer.

### Frontend Feature Sections

- `Client/src/features/home/Hero.tsx`: home page hero section.
- `Client/src/features/home/HowItWorks.tsx`: explainer section for the platform flow.
- `Client/src/features/home/NearbyVehicles.tsx`: featured vehicle preview section backed by public vehicle data.

### Frontend Public Pages

- `Client/src/pages/Home.tsx`: landing page composition.
- `Client/src/pages/Services.tsx`: services overview.
- `Client/src/pages/About.tsx`: company/about page.
- `Client/src/pages/Contact.tsx`: contact page.
- `Client/src/pages/HelpCenter.tsx`: support/help information.
- `Client/src/pages/SafetyGuidelines.tsx`: safety content.
- `Client/src/pages/TermsOfService.tsx`: terms page.
- `Client/src/pages/PrivacyPolicy.tsx`: privacy page.
- `Client/src/pages/SearchVehicles.tsx`: public vehicle search and filtering page.
- `Client/src/pages/VehicleDetails.tsx`: single vehicle detail page and entry point to booking or messaging.
- `Client/src/pages/VehicleBooking.tsx`: booking form, pricing quote retrieval, delivery/insurance add-ons, and PayHere handoff.
- `Client/src/pages/Messages.tsx`: full conversation page for renter and owner messaging.
- `Client/src/pages/Notifications.tsx`: renter or owner notifications page depending on mode prop.

### Frontend Authentication Pages

- `Client/src/pages/SignIn.tsx`: email/password sign-in, Google sign-in, and two-factor challenge completion.
- `Client/src/pages/SignUp.tsx`: initial account registration step.
- `Client/src/pages/SignUpRole.tsx`: role selection during sign-up.
- `Client/src/pages/SignUpDetails.tsx`: detailed registration form and profile completion.
- `Client/src/pages/admin/AdminLogin.tsx`: separate admin login page.

### Frontend Owner Dashboard Pages

- `Client/src/pages/dashboard/OwnerDashboard.tsx`: summary metrics, pending requests, rents, and owner vehicle overview.
- `Client/src/pages/dashboard/MyVehicles.tsx`: owner vehicle list, create vehicle modal, verification uploads, and availability toggling.
- `Client/src/pages/dashboard/VehicleManage.tsx`: edit vehicle details, upload/delete images, upload verification documents, and delete vehicle.
- `Client/src/pages/dashboard/BookingRequests.tsx`: incoming owner-side booking management.
- `Client/src/pages/dashboard/Earnings.tsx`: owner revenue display.
- `Client/src/pages/dashboard/OwnerProfile.tsx`: owner-facing profile page.
- `Client/src/pages/dashboard/OwnerSettings.tsx`: profile updates, avatar upload, password change, notifications, and two-factor controls.

### Frontend Renter Dashboard Pages

- `Client/src/pages/user-dashboard/UserProfile.tsx`: renter profile display and editing.
- `Client/src/pages/user-dashboard/UserBookings.tsx`: renter booking history and status management.
- `Client/src/pages/user-dashboard/SavedVehicles.tsx`: saved vehicle list and unsave actions.
- `Client/src/pages/user-dashboard/UserSettings.tsx`: renter settings, password change, and two-factor controls.

### Frontend Admin Pages

- `Client/src/pages/admin/AdminDashboard.tsx`: overview metrics, request timeline, and recent admin logins.
- `Client/src/pages/admin/AdminUsers.tsx`: user list and search/filter tools.
- `Client/src/pages/admin/AdminBookings.tsx`: booking list and monitoring.
- `Client/src/pages/admin/AdminVehicles.tsx`: vehicle verification review and approve/reject actions.
- `Client/src/pages/admin/AdminPricing.tsx`: global dynamic pricing configuration editor.

## Backend Structure

### Backend Root Files

- `Server/requirements.txt`: Python dependencies.
- `Server/Makefile`: install, run, test, lint, format, docker, and DB bootstrap shortcuts.
- `Server/Dockerfile`: backend image definition.
- `Server/docker-compose.yml`: local compose setup for the FastAPI service.
- `Server/README.md`: backend setup notes and environment variable reference.
- `Server/.venv/`: local virtual environment.
- `Server/uploads/`: runtime upload storage for avatars, vehicle images, and vehicle documents.
- `Server/secrets/`: mounted secret directory for Firebase credentials in Docker.

### Backend App Entry

- `Server/app/main.py`: FastAPI app creation, CORS setup, upload static mount, MongoDB lifespan management, request logging middleware, and router registration.
- `Server/app/__init__.py`: package marker.

### Backend Core Infrastructure

- `Server/app/core/db.py`: Mongo client state, connection bootstrap, URL normalization, and DB dependency providers.
- `Server/app/core/db_init.py`: collection/index bootstrap and default seed initialization.
- `Server/app/core/firebase_setup.py`: Firebase Admin SDK discovery and initialization.
- `Server/app/core/auth_deps.py`: Firebase token verification dependency for normal authenticated routes.
- `Server/app/core/admin_auth.py`: admin password hashing, admin token creation/verification, and admin auth dependency.

### Backend Routers

- `Server/app/routers/general.py`: public health/root response, public vehicle listing, and public pricing quote endpoint.
- `Server/app/routers/auth.py`: email registration, social registration, email login, social login, and two-factor login completion.
- `Server/app/routers/users.py`: current user profile CRUD, avatar upload, password change, two-factor setup/enable/disable, and saved vehicles.
- `Server/app/routers/vehicles.py`: owner vehicle CRUD, image upload/delete, and verification document upload.
- `Server/app/routers/rents.py`: booking creation, renter booking updates/cancel, owner accept/cancel/complete actions, and owner earnings.
- `Server/app/routers/payments.py`: PayHere checkout payload generation and notification callback processing.
- `Server/app/routers/messages.py`: conversation creation, conversation listing, message send, and conversation access control.
- `Server/app/routers/reviews.py`: review creation, review summary, renter review history, and vehicle review listing with author data.
- `Server/app/routers/assistant.py`: assistant chat endpoint that returns reply text and recommended vehicles.
- `Server/app/routers/admin.py`: admin login, dashboard overview, user/bookings/vehicles listing, vehicle verification actions, and global pricing settings management.
- `Server/app/routers/__init__.py`: router package marker.

### Backend Schemas

- `Server/app/schemas/users_schema.py`: user profile, auth request/response, role normalization, password change, and two-factor request models.
- `Server/app/schemas/vehicles_schema.py`: vehicle models, image/document URL normalization, dynamic pricing schema, and verification document schema.
- `Server/app/schemas/rents_schema.py`: rent models and stored pricing snapshot model.
- `Server/app/schemas/messages_schema.py`: conversation and chat message models.
- `Server/app/schemas/reviews_schema.py`: review creation, summary, and author-enriched review models.
- `Server/app/schemas/payments_schema.py`: PayHere request and response models.
- `Server/app/schemas/admin_schema.py`: admin login, dashboard stats, pricing settings, booking/user/vehicle response models.
- `Server/app/schemas/assistant_schema.py`: assistant conversation turn, request, recommendation, and response models.
- `Server/app/schemas/earnings_schema.py`: owner earnings aggregates and transaction rows.
- `Server/app/schemas/__init__.py`: schema exports.

### Backend Repositories

- `Server/app/repositories/base.py`: small base repository helper class.
- `Server/app/repositories/user.py`: user profile CRUD and saved vehicle persistence.
- `Server/app/repositories/vehicle.py`: vehicle CRUD and owner-scoped update/delete behavior.
- `Server/app/repositories/rent.py`: booking CRUD, owner/renter list queries, status transitions, and ID conversion helpers.
- `Server/app/repositories/message.py`: conversation persistence, deduped participant conversations, and message appends.
- `Server/app/repositories/review.py`: review persistence, summary aggregation, and lookup helpers.
- `Server/app/repositories/admin.py`: default admin seeding, admin account lookup, and admin login event recording.
- `Server/app/repositories/__init__.py`: repository exports.

### Backend Services

- `Server/app/services/vehicle_pricing.py`: pricing engine that applies base daily rates, weekend/holiday/weather/custom multipliers, duration discounts, route distance charges, and service fee reporting.
- `Server/app/services/dynamic_pricing_settings.py`: fetches and updates the global dynamic pricing document in the admin database.
- `Server/app/services/owner_earnings.py`: calculates owner earnings overview from completed and accepted rents.
- `Server/app/services/payhere.py`: environment-based PayHere configuration, hashing, and name splitting.
- `Server/app/services/ollama_assistant.py`: vehicle shortlisting, prompt building, fallback reply generation, and recommendation extraction for the assistant.
- `Server/app/services/audit_log.py`: writes action, request, and system log records to MongoDB.
- `Server/app/services/route_service.py`: route distance lookup helper used by pricing.
- `Server/app/services/geocoding_service.py`: location-to-coordinate helper used by pricing/weather fallback.
- `Server/app/services/weather_service.py`: weather summary lookup for booking dates.
- `Server/app/services/holiday_service.py`: public holiday date lookup for pricing.
- `Server/app/services/two_factor_auth.py`: TOTP secret generation, challenge token handling, and code verification.

### Backend Scripts

- `Server/scripts/init_db.py`: manually runs DB initialization and seed/index creation.
- `Server/scripts/cleanup_user_roles.py`: normalizes legacy `role` data into canonical `roles`.
- `Server/scripts/audit_user_profiles.py`: reads user profile details for auditing/debugging.

### Backend Tests

- `Server/tests/conftest.py`: fake async MongoDB test doubles and shared fixtures.
- `Server/tests/test_db_init.py`: verifies collection/index bootstrap behavior.
- `Server/tests/test_general_router.py`: validates public endpoints.
- `Server/tests/test_auth_router.py`: validates auth, social login, and two-factor login behavior.
- `Server/tests/test_users_router.py`: validates profile, avatar, password, two-factor, and saved vehicle flows.
- `Server/tests/test_users_schema.py`: validates user schema behavior.
- `Server/tests/test_vehicle_repository.py`: validates vehicle repository CRUD.
- `Server/tests/test_vehicles_router.py`: validates vehicle routes, ownership checks, uploads, and verification docs.
- `Server/tests/test_vehicles_schema.py`: validates vehicle schema aliasing and dynamic pricing fields.
- `Server/tests/test_rents_router.py`: validates booking lifecycle behavior.
- `Server/tests/test_owner_earnings.py`: validates owner earnings aggregation.
- `Server/tests/test_vehicle_pricing.py`: validates pricing rules such as weekends, holidays, weather, discounts, and distance.
- `Server/tests/test_messages_router.py`: validates conversation and message flows.
- `Server/tests/test_reviews_router.py`: validates review creation and summary responses.
- `Server/tests/test_payments_router.py`: validates PayHere payload generation and callback handling.
- `Server/tests/test_admin_router.py`: validates admin login, dashboard aggregation, pricing settings, and vehicle verification actions.
- `Server/tests/test_user_repository.py`: validates user repository CRUD.

## MongoDB Data Model

### App Database Collections

- `users`: profile documents keyed by Firebase `uid`.
- `vehicles`: vehicle listing documents keyed by `vehicleid` or Mongo `_id`.
- `rents`: booking records with renter, owner, vehicle, dates, status, and `pricing_snapshot`.
- `conversations`: owner-renter conversations with embedded messages.
- `vehicle_reviews`: one review per rent, plus vehicle summary data derived by aggregation.
- `system_logs`: audit logs and request logs.

### Admin Database Collections

- `admins`: admin credentials and profile data.
- `admin_login_events`: admin login success/failure history.
- `pricing_settings`: global dynamic pricing settings, including the seeded `global_dynamic_pricing` document.

### Important Indexes

Indexes are created in `Server/app/core/db_init.py`.

Notable indexes include:

- unique `users.email`
- owner and status indexes on `vehicles`
- renter/owner/vehicle/status and date indexes on `rents`
- unique owner-renter-vehicle tuple for `conversations`
- unique `rent_id` for `vehicle_reviews`
- time and actor/event indexes for `system_logs`
- unique `admins.username`

## Authentication and Authorization

## User Authentication

AutoShare uses Firebase for normal user identity.

Supported flows:

- email/password registration
- email/password login via Firebase REST API
- Google sign-in via the frontend Firebase SDK
- backend token verification via Firebase Admin SDK
- optional TOTP-based two-factor authentication

### Email registration flow

1. `POST /auth/register/email`
2. Backend creates Firebase user.
3. Backend creates MongoDB profile.
4. If the profile write fails, the Firebase user is deleted as rollback.

### Email login flow

1. `POST /auth/login`
2. Backend calls Firebase Identity Toolkit REST API.
3. If the user has `two_factor_enabled`, the backend withholds the `idToken` and returns a signed `two_factor_token`.
4. The client then calls `POST /auth/login/2fa`.
5. On success, the backend returns the Firebase ID token.

### Social login flow

1. Frontend uses `signInWithPopup`.
2. Frontend sends Google/Firebase `idToken` to backend.
3. Backend validates the token.
4. For new users, the frontend finishes profile registration with `/auth/register/social`.

### Admin authentication

Admins do not use Firebase. They use a separate username/password flow handled by `Server/app/core/admin_auth.py` and `Server/app/routers/admin.py`.

The backend issues its own signed admin token, and the frontend stores it with a separate `localStorage` key.

## Pricing Architecture

Pricing logic lives mainly in `Server/app/services/vehicle_pricing.py`.

Inputs:

- vehicle base daily price
- booking start and end dates
- global dynamic pricing settings from admin DB
- vehicle-level distance overrides
- pickup and destination coordinates
- holiday dates
- weather conditions

Outputs:

- subtotal
- duration discount
- distance fee
- service fee
- daily pricing line items
- total quoted price

Important note:

- the backend stores and returns `service_fee`, but the payment amount calculation currently adds service fee on top of `pricing_snapshot.total`
- the booking page also applies frontend-only extras such as insurance, delivery fee, and child seat fee

This means total cost is assembled across both backend quote data and frontend booking selections.

## Vehicle Management and Verification

Vehicle owners can:

- create listings
- edit fields like brand, model, fuel, price, seats, and availability
- upload multiple vehicle images
- upload registration and license documents

Verification workflow:

1. Owner uploads both required documents.
2. Vehicle status becomes `pending`.
3. Admin sees the vehicle in `/admin/vehicles`.
4. Admin marks it `verified` or `rejected` and may add notes.

Verification fields are stored directly on the vehicle document.

## Booking Lifecycle

Main booking statuses include:

- `pending`
- `accepted`
- `cancelled`
- `completed`

Typical flow:

1. Renter books a vehicle through `POST /rents/`.
2. Backend stores a pricing snapshot.
3. Owner reviews the request.
4. Owner accepts, cancels, or later completes the rent.
5. Accepted bookings can mark the vehicle unavailable.
6. Renter or owner cancellation may restore availability.
7. Completed bookings become eligible for reviews and earnings calculations.

## Messaging Architecture

Messaging uses conversation documents with embedded message arrays.

Participants:

- one owner
- one renter
- one vehicle context

The repository ensures a unique conversation tuple for owner, renter, and vehicle so duplicate threads are avoided.

Each message stores role-like metadata such as sender identity and timestamp.

## Reviews Architecture

Reviews are written after bookings and stored in `vehicle_reviews`.

The system supports:

- creating one review per rent
- listing all reviews for a vehicle
- listing a renter's own reviews
- computing summary data for ratings and review counts

The frontend augments public vehicle listings with summary data fetched from `/vehicle-reviews/summary`.

## Assistant Architecture

The assistant feature is a lightweight recommendation layer:

1. The frontend sends a chat query and recent chat history.
2. The backend fetches public vehicle data.
3. `ollama_assistant.py` extracts preferences like seats, fuel, transmission, type, budget terms, and location terms.
4. Vehicles are scored and shortlisted.
5. The backend either calls Ollama or returns a fallback recommendation reply.
6. The response includes both reply text and vehicle recommendation payloads.

The assistant is not deeply integrated into booking logic. It is a recommendation helper over public vehicle inventory.

## Logging and Audit Design

AutoShare logs two main classes of events:

- request logs from FastAPI middleware
- action/audit logs from route handlers

Stored log data includes:

- route and method
- outcome and status code
- actor UID and email when known
- entity type and entity ID when relevant
- metadata such as query params, duration, errors, or business context

This design supports admin dashboards and post-incident inspection.

## Configuration and Environment Variables

## Frontend Environment

Expected in `Client/.env`:

- `VITE_API_BASE_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Backend Environment

Expected in `Server/.env`:

- `MONGODB_URL`
- `MONGODB_DB_NAME`
- `MONGODB_ADMIN_DB_NAME` optional, defaults in code
- `FIREBASE_CREDENTIAL_PATH`
- `FIREBASE_API_KEY`
- `PAYHERE_SANDBOX`
- `PAYHERE_MERCHANT_ID`
- `PAYHERE_MERCHANT_SECRET`
- `PAYHERE_RETURN_URL`
- `PAYHERE_CANCEL_URL`
- `PAYHERE_NOTIFY_URL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT_SECONDS`
- `RUNNING_IN_DOCKER`

## Local Development and Operations

### Frontend commands

```bash
cd Client
npm install
npm run dev
npm run build
npm run lint
```

### Backend commands

```bash
cd Server
make install
make run
make test
make init-db
make docker-up-build
```

## Deployment and Docker Notes

The provided compose file mainly supports the backend service.

Important runtime details:

- the API is exposed on port `8000`
- `RUNNING_IN_DOCKER=true` allows Mongo localhost rewriting to `host.docker.internal`
- Firebase credentials are mounted read-only from `Server/secrets`
- Ollama can be reached from Docker through `DOCKER_OLLAMA_BASE_URL`

## Testing and Quality

Current automated coverage is strongest on the backend.

Covered backend areas include:

- schemas
- repositories
- auth
- user flows
- vehicles
- rents
- payments
- admin
- reviews
- pricing
- messages

The current CI workflow runs backend install and test steps only. There is no frontend CI job in the repository at the moment.

## Architectural Characteristics

## Strengths

- clear separation between routers, schemas, repositories, and services on the backend
- centralized frontend API client
- good backend test coverage for key business rules
- audit and request logging are already built into runtime flow
- pricing logic is isolated and testable
- admin features are separated from normal user auth

## Important design choices

- user-facing auth is delegated to Firebase rather than custom JWT creation
- admin auth is custom and independent from Firebase
- MongoDB documents are used as the main persistence model without a separate ORM
- conversation messages are embedded in conversation documents
- uploaded files are stored on local disk, not cloud object storage
- assistant behavior is heuristic-first with optional Ollama enrichment

## Maintenance considerations

- `Client/README.md` is still the default Vite template and can confuse new contributors
- frontend totals and backend pricing totals should be kept aligned carefully
- local-disk uploads are simple for development but require planning for production deployments
- the root FastAPI docs are mounted at `/`, which replaces a traditional home or health endpoint path
- request logging depends on Mongo availability at runtime

## Recommended Documentation Entry Points

For future maintainers, the best files to read first are:

1. `README.md`
2. `docs/SYSTEM_DOCUMENTATION.md`
3. `Server/app/main.py`
4. `Server/app/routers/`
5. `Server/app/services/vehicle_pricing.py`
6. `Client/src/App.tsx`
7. `Client/src/lib/api.ts`
8. `DYNAMIC_PRICING.md`

## Summary

AutoShare is a layered full-stack rental platform with:

- a React/Vite frontend
- a FastAPI backend
- Firebase-based user authentication
- MongoDB persistence
- local upload storage
- admin-controlled dynamic pricing
- PayHere payments
- embedded messaging
- post-booking reviews
- an Ollama-backed assistant

The repository is organized well enough for feature growth, especially on the backend. The most important technical centers of gravity are:

- `Client/src/lib/api.ts`
- `Client/src/App.tsx`
- `Server/app/main.py`
- `Server/app/routers/*`
- `Server/app/services/vehicle_pricing.py`
- `Server/app/core/db.py`
