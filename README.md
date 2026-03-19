## Credit Card Expense Tracker (CLI + REST API)

This project is a Node.js + TypeScript backend for tracking credit-card expenses. It exposes a JSON REST API and (later) a CLI that can ingest `.xlsx` statements (MAX/CAL), normalize transactions into PostgreSQL via Prisma, and provide reporting over per-user, per-card, and per-category data.

- **Domain docs**: Implementation and behavior are driven by:
  - `IMPLEMENTATION_PLAN.md`: end-to-end implementation roadmap, split into phases (auth, categories/cards, ingestion, reports, polish). Treat this as the primary “what to build” guide.
  - `questions.md`: PRD Q&A and design decisions (auth model, categories, ingestion behavior, reporting scope, etc.). This is the single source of truth for product-level decisions.

These two documents should stay in sync with the actual code; when you change behavior, update them.

---

## Cursor rules used in this repo

This project is configured with Cursor rules to keep workflows consistent:

- **`git-workflow.mdc`**: enforces “no direct commits to `main`”, per-task feature branches, and user approval before merging.
- **`testing.mdc`**: defines Jest testing style for the backend (unit-test focus, Arrange/Act/Assert, mocking external boundaries like Prisma, no real DB in unit tests).

When working in Cursor, the assistant and tools follow these rules automatically.

---

## Running the project locally

### 1. Prerequisites

- Node.js 24.x (>=24 <25) (ESM-compatible; project uses `"type": "module"`).
- Use `nvm use` in the project root to load the version from `.nvmrc`.
- Docker + Docker Compose (for PostgreSQL).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env` (or create it) and set at least:

```env
DATABASE_URL="postgresql://someuser:change-me@localhost:5432/credit_tracker"
JWT_SECRET="dev-secret-change-me"
PROCESSED_DIR="./processed" # optional, used later for ingest
```

### 4. Run PostgreSQL via Docker

From the project root:

```bash
docker compose up -d db
```

This starts a Postgres instance matching the Prisma datasource in `prisma/schema.prisma`.

### 5. Migrate and seed the database

```bash
npm run db:migrate
npm run db:seed
```

- `db:migrate`: applies Prisma migrations (creates `User`, `Category`, `Card`, `Transaction`, `CategorizationRule` tables, etc.).
- `db:seed`: inserts system categories (Hebrew names) as global categories.

### 6. Build and start the API server

```bash
npm run build
npm start
```

The server starts on port `3000` by default and logs:

```text
Server listening on port 3000
```

---

## Running tests

Unit tests are written with Jest and live under `src/__tests__/`.

```bash
npm run lint
npm run format:check
npm test
```

This exercises auth logic (password validation, `/auth/register`, `/auth/login`, JWT middleware) with Prisma mocked out, following the `testing.mdc` rules.

---

## Quick API smoke test with curl

Assuming the server is running on `http://localhost:3000`:

### 1. Register a user

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "this is a long random passphrase 2026"
  }'
```

Expected: `201` response with a JSON body containing `id`, `email`, and `createdAt` (no `passwordHash`).

### 2. Login to get a JWT

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "this is a long random passphrase 2026"
  }'
```

Expected: `200` response:

```json
{ "token": "JWT_HERE" }
```

Copy the `token` value.

### 3. Call a protected route (`/me`)

```bash
curl http://localhost:3000/me \
  -H "Authorization: Bearer JWT_HERE"
```

Expected: `200` response with the authenticated user payload:

```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

If you omit or break the `Authorization` header, you should see a `401` with an error message, which confirms the auth middleware is wired correctly.

### 4. Admin routes (admin only)

Admin endpoints live under `/admin` and require a valid JWT for a user with `isAdmin: true`. Without a token you get `401`; with a non-admin token you get `403`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/users` | List all users (id, email, createdAt, isAdmin). No passwords. |
| `POST` | `/admin/users` | Create a user. Body: `{ "email", "password", "isAdmin" }` (password validated like register). Returns `201` and the created user; `409` if email already exists. |
| `PATCH` | `/admin/users/:id` | Update a user. Body: `{ "isAdmin": true \| false }`. Returns `200` with updated user; `404` if user not found. |

To get an admin token, set a user as admin in the database (e.g. via Prisma Studio: `npm run db:studio` → User → set `isAdmin = true`), then call `POST /auth/login` with that user’s email and password. Use the returned `token` in the `Authorization: Bearer <token>` header for admin requests.

---

## Scripts and checklist

The `scripts/` directory contains route checkers and a pre-commit checklist. Run them from the project root with the API server already running (unless otherwise noted).

### Auth route checker (`scripts/auth-routes-checker.sh`)

Smoke-tests the auth flow: register (random email/password), login, and `GET /me` with the JWT. No arguments; uses `BASE_URL` if set.

```bash
chmod +x scripts/auth-routes-checker.sh   # once
./scripts/auth-routes-checker.sh
```

Optional: `BASE_URL=http://localhost:3000 ./scripts/auth-routes-checker.sh`

### Admin route checker (`scripts/admin-routes-checker.sh`)

Smoke-tests admin-only routes: login as admin, `GET /admin/users`, `POST /admin/users` (create a random user), `PATCH /admin/users/:id`, and a final `GET /admin/users` to confirm the new user. Requires an existing admin user.

```bash
chmod +x scripts/admin-routes-checker.sh   # once
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='your-admin-password' ./scripts/admin-routes-checker.sh
```

Optional: `BASE_URL=http://localhost:3000` (default).

### Pre-commit checklist (`scripts/pre-commit-checklist.md`)

A markdown checklist for verifying the app before committing: start DB, run migrations, regenerate Prisma client, run lint + format checks, run tests, build, start the server, and manually test auth and admin routes with curl. Use it as a reference; it does not run automatically.

---

## Where to look next

- **Auth implementation**: `src/auth/*` (`authController.ts`, `authRoutes.ts`, `authMiddleware.ts`, `authSchemas.ts`, `passwordValidation.ts`).
- **Admin implementation**: `src/admin/*` (`adminMiddleware.ts`, `adminRoutes.ts`).
- **Express app wiring**: `src/app.ts` and `src/index.ts`.
- **Prisma client**: `src/lib/prisma.ts` (configured with the PostgreSQL adapter and `DATABASE_URL`).
- **Prisma schema & migrations**: `prisma/schema.prisma`, `prisma/migrations/*`.
- **Route checkers and checklist**: `scripts/auth-routes-checker.sh`, `scripts/admin-routes-checker.sh`, `scripts/pre-commit-checklist.md`.

For higher-level feature planning, always consult `IMPLEMENTATION_PLAN.md` (phase breakdown) together with `questions.md` (product decisions) before adding or changing behavior.

