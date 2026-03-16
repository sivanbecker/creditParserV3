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

- Node.js 20+ (ESM-compatible; project uses `"type": "module"`).
- Docker + Docker Compose (for PostgreSQL).

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env` (or create it) and set at least:

```env
DATABASE_URL="postgresql://credit:credit@localhost:5432/credit_tracker"
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

---

## Where to look next

- **Auth implementation**: `src/auth/*` (`authController.ts`, `authRoutes.ts`, `authMiddleware.ts`, `authSchemas.ts`, `passwordValidation.ts`).
- **Express app wiring**: `src/app.ts` and `src/index.ts`.
- **Prisma client**: `src/lib/prisma.ts` (configured with the PostgreSQL adapter and `DATABASE_URL`).
- **Prisma schema & migrations**: `prisma/schema.prisma`, `prisma/migrations/*`.

For higher-level feature planning, always consult `IMPLEMENTATION_PLAN.md` (phase breakdown) together with `questions.md` (product decisions) before adding or changing behavior.

