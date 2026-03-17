# Credit Card Expense Tracker — Implementation Plan

This plan is derived from `spec.md`, `TECHNICAL_SPEC.md`, and `questions.md`. It is task- and sub-task oriented so the team can start building and track progress. Development follows TDD: write failing tests first, then minimal implementation, then refactor.

**Assumptions (from Q&A):**
- **CardMap:** Per-user; stored in DB as a `Card` model (last4, provider, owner, userId). Lookup at ingest uses authenticated user + file-derived last4.
- **Merchant → category rules:** Per-user; stored in DB (e.g. `CategorizationRule`: userId, merchant pattern, categoryId), applied on ingest.
- **Processed files:** Copy (not move) to `PROCESSED_DIR` with standard name; original file left unchanged.
- **Reports:** Full calendar month (and optionally full year) only in MVP; no arbitrary date ranges.

---

## Phase 0: Project bootstrap and foundation

### 0.1 Repository and tooling setup
- [ ] **0.1.1** Add dependencies: `prisma`, `@prisma/client`, `zod`, `xlsx` (SheetJS), `commander`, `express`, `date-fns`, `argon2` (or `bcrypt`), `jsonwebtoken`, `dotenv`, plus dev: `jest`, `ts-jest`, `@types/express`, `@types/jsonwebtoken`, `@types/node`, `supertest`.
- [ ] **0.1.2** Configure TypeScript: `tsconfig.json` targeting native ES modules (e.g. `"module": "NodeNext"` or `"module": "ESNext"` with `"moduleResolution": "NodeNext"`, plus `outDir`, `strict`, and any path aliases as needed). Configure Node to run ESM (e.g. `"type": "module"` in `package.json` or using `.mjs`/`.mts` entrypoints) and use `import`/`export` syntax only in source files.
- [ ] **0.1.3** Configure Jest: `jest.config.js` or `jest` section in `package.json`; use `ts-jest`; set `testMatch` for `**/*.test.ts`; set `testPathIgnorePatterns` for `node_modules`, `dist`; ensure Jest is configured in an ESM-compatible way (e.g. `ts-jest` with `useESM: true` or equivalent).
- [ ] **0.1.4** Add npm scripts: `build`, `start`, `dev` (using an ESM-aware runner such as Node with ESM support or `tsx`), `test`, `test:watch`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`, all assuming the ESM-aware Jest configuration from **0.1.3**.
- [ ] **0.1.5** Create folder structure: `src/` (or `src/api`, `src/cli`, `src/services`, `src/lib`), `src/__tests__/`, `prisma/`, root `.env.example` with `DATABASE_URL`, `JWT_SECRET`, `PROCESSED_DIR`, etc.
- [ ] **0.1.6** Add `.env.example` and document all required env vars; ensure `.env` and token path are in `.gitignore`.

### 0.2 Docker and database
- [ ] **0.2.1** Add `docker-compose.yml` with a PostgreSQL service (version aligned with Prisma); expose port 5432; optional env for user/pass/db name.
- [ ] **0.2.2** Document in README: run `docker compose up -d db`, set `DATABASE_URL`, run `pnpm db:migrate` (or npm equivalent).

### 0.3 Prisma schema (full schema in one place)
- [ ] **0.3.1** Initialize Prisma: `prisma init`; set `datasource` to `postgresql` and `url = env("DATABASE_URL")`.
- [ ] **0.3.2** Define `User` model: `id` (cuid), `email` (unique), `passwordHash`, `createdAt`, optional `name`; ensure UTF-8 for future Hebrew names.
- [ ] **0.3.3** Define `Category` model: `id` (cuid), `name` (string, Unicode), `slug` (optional, for stable IDs), `userId` (nullable FK → User), `isSystem` (boolean). System categories: `userId = null`, `isSystem = true`; custom: `userId` set, `isSystem = false`. Uniqueness: `(userId, name)` for custom; `name` unique for system where `userId` is null.
- [ ] **0.3.4** Define `Card` model (per-user card map): `id` (cuid), `userId` (FK → User), `lastFourDigits` (string, length 4), `provider` (enum MAX | CAL), `owner` (string), `alias` (optional). Unique on `(userId, lastFourDigits)`.
- [ ] **0.3.5** Define `Transaction` model: `id` (cuid), `hash` (unique, for idempotency), `userId` (FK → User), `provider` (enum), `transactionDate`, `billingDate` (optional), `merchantName`, `categoryId` (nullable FK → Category), `originalCategory` (nullable string from bank), `amount`, `currency` (default ILS), `chargedAmount`, `type` (e.g. Regular, Installments), `lastFourDigits`, `comments`, `installmentsInfo`, `isFixedExpense` (default false), `metadata` (Json?), `createdAt`. Indexes: `userId`, `transactionDate`, `(userId, transactionDate)`, `hash`.
- [ ] **0.3.6** Define `CategorizationRule` model (merchant → category): `id` (cuid), `userId` (FK → User), `merchantPattern` (string; e.g. exact name or pattern), `categoryId` (FK → Category). Optional: `matchType` (exact / contains / startsWith) for future.
- [ ] **0.3.7** Run first migration: `prisma migrate dev --name init`; verify schema in DB.

### 0.4 Seed data
- [ ] **0.4.1** Create Prisma seed script: insert system categories (Hebrew names as per Q&A: אוכל, קניות, דיור, חשבונות, תחבורה, מנויים, פנאי, הכנסות, עמלות, אחר) with `userId = null`, `isSystem = true`.
- [ ] **0.4.2** Add `prisma/seed.ts` and configure `prisma.seed` in `package.json`; run `prisma db seed` and verify.

---

## Phase 1: Auth (API + CLI)

### 1.1 Auth API
- [ ] **1.1.1** (TDD) Write tests for password validation: reject length &lt; 15 or &gt; 100; reject blacklist (e.g. "password", "123456", app name); accept valid passphrase.
- [ ] **1.1.2** Implement password validation (Zod + custom refine); hash with Argon2id (or bcrypt) on register; verify on login.
- [ ] **1.1.3** (TDD) Write tests for `/register`: success returns 201 and user id/email (no password); duplicate email returns 4xx.
- [ ] **1.1.4** Implement `POST /register`: validate email + password with Zod; hash password; create User; return safe user payload.
- [ ] **1.1.5** (TDD) Write tests for `/login`: valid credentials return JWT (access token only); invalid credentials return 401.
- [ ] **1.1.6** Implement `POST /login`: validate body; find user; verify password; sign JWT (24h expiry); return `{ token }`.
- [ ] **1.1.7** Create auth middleware: extract Bearer token; verify JWT; attach `user` (id, email) to request; 401 if missing/invalid.
- [ ] **1.1.8** (TDD) Write tests for protected route: with valid token returns 200; without token or invalid token returns 401.

### 1.2 Admin API (user management)
- [ ] **1.2.1** Define “admin” (e.g. first user, or env-based admin email list); add optional `isAdmin` on User or use env list.
- [ ] **1.2.2** (TDD) Write tests for admin-only routes: non-admin gets 403.
- [ ] **1.2.3** Implement admin middleware: allow only admin user; 403 otherwise.
- [ ] **1.2.4** Implement `GET /admin/users`: list users (id, email, createdAt); no passwords.
- [ ] **1.2.5** Implement `POST /admin/users`: create user (email + password); validate and hash; return safe payload.
- [ ] **1.2.6** Implement `PATCH /admin/users/:id` (or similar): deactivate user if required (e.g. soft delete flag).

### 1.3 CI
- [ ] **1.3.1** Define GitHub Actions CI workflow skeleton in `.github/workflows/ci.yml`: trigger on `pull_request` to `main` (and other long-lived branches if needed) and on `push` to `main`; use Node 24 with npm and `npm ci` for dependency installation.
- [ ] **1.3.2** Add npm scripts (to be implemented later in code) for `lint`, `lint:fix`, `format`, and `format:check` so that CI can run `npm run lint` and `npm run format:check` using the exact same ESLint/formatter configuration as local development (no CI-only rules).
- [ ] **1.3.3** Establish `scripts/checkers/` as the canonical location for non-interactive checker scripts: move `scripts/auth-routes-checker.sh` and `scripts/admin-routes-checker.sh` into `scripts/checkers/` and ensure any future checker scripts (e.g. health, permissions, smoke checks) are added there as `*.sh` files that are idempotent and fail-fast on errors.
- [ ] **1.3.4** In the CI `build-and-checkers` job, after `lint-format` and `unit-tests` succeed, build the project (`npm run build`), start the API/server with appropriate env for CI, and run all checker scripts via a loop over `scripts/checkers/*.sh` (fail the job if any checker exits non-zero).
- [ ] **1.3.5** For Phase 1, keep CI primarily unit-test focused (no mandatory real DB in CI jobs), but design the workflow so that a separate `integration-tests` job with a Postgres service (migrations + seed + `npm run test:integration`) can be added later in Phase 5 without restructuring the existing jobs.

### 1.4 CLI auth
- [ ] **1.4.1** Implement CLI `login` command: prompt for email + password (or read from env/args for non-interactive); call `POST /login`; write token to `~/.credit-tracker/token`; create directory if needed.
- [ ] **1.4.2** Implement token reader: read from `~/.credit-tracker/token` (or env override); use in all API requests as Bearer token; clear error if file missing (suggest running `login`).
- [ ] **1.4.3** Wire CLI commands to send Bearer token on every request; handle 401 with “Please run login again” message.

---

## Phase 2: Categories and cards (API + optional CLI)

### 2.1 Categories API
- [ ] **2.1.1** (TDD) Write tests for `GET /categories`: returns system + current user’s custom categories; filtered by auth.
- [ ] **2.1.2** Implement `GET /categories`: return categories where `userId = null` (system) OR `userId = currentUser.id`.
- [ ] **2.1.3** (TDD) Write tests for `POST /categories`: authenticated user can create custom category (name, optional slug); validate uniqueness of (userId, name).
- [ ] **2.1.4** Implement `POST /categories`: create category with `userId = currentUser.id`, `isSystem = false`.
- [ ] **2.1.5** (TDD) Optional: `PATCH /categories/:id`, `DELETE /categories/:id` for custom categories only; system categories read-only.

### 2.2 Cards API (per-user CardMap)
- [ ] **2.2.1** (TDD) Write tests for `GET /cards`: returns only current user’s cards.
- [ ] **2.2.2** Implement `GET /cards`: list cards for `userId = currentUser.id`.
- [ ] **2.2.3** (TDD) Write tests for `POST /cards`: create card (lastFourDigits, provider, owner, alias); unique (userId, lastFourDigits).
- [ ] **2.2.4** Implement `POST /cards`: validate with Zod; create Card for current user.
- [ ] **2.2.5** (TDD) Write tests for `PATCH /cards/:id`, `DELETE /cards/:id` (scoped to owner).
- [ ] **2.2.6** Implement update/delete; ensure ingest can resolve (userId, last4) → provider and owner.

### 2.3 Categorization rules API
- [ ] **2.3.1** (TDD) Write tests for `GET /categorization-rules`: returns only current user’s rules.
- [ ] **2.3.2** Implement `GET /categorization-rules`: list rules for current user.
- [ ] **2.3.3** (TDD) Write tests for `POST /categorization-rules`: create rule (merchantPattern, categoryId); category must belong to user or system.
- [ ] **2.3.4** Implement `POST /categorization-rules`: validate categoryId; create rule for current user.
- [ ] **2.3.5** Implement `DELETE /categorization-rules/:id` (scoped to owner).

---

## Phase 3: Excel parsing and ingestion

### 3.1 SheetJS wrapper and date handling
- [ ] **3.1.1** (TDD) Write tests for date parsing: DD/MM/YYYY string → Date; Excel serial number → Date; invalid → error or defined behavior.
- [ ] **3.1.2** Implement date parsing helper (e.g. with `date-fns`); handle Israeli format and Excel numbers.
- [ ] **3.1.3** (TDD) Write tests for ExcelService: given a buffer or path, returns array of row objects with expected keys (use small fixture .xlsx).
- [ ] **3.1.4** Implement ExcelService: read .xlsx; extract first (or configured) sheet; return rows as array of plain objects; handle Hebrew headers (UTF-8).
- [ ] **3.1.5** (TDD) Write tests for “empty sheet” and “missing file”; ensure no unhandled exceptions.

### 3.2 Provider schemas (Zod)
- [ ] **3.2.1** (TDD) Write tests for Cal schema: map Hebrew column names to unified keys; required fields present; invalid rows fail validation with clear messages.
- [ ] **3.2.2** Define Cal Zod schema: map תאריך עסקה, שם בית עסק, סכום חיוב, etc. to transactionDate, merchantName, chargedAmount, etc.; transform dates; output unified shape.
- [ ] **3.2.3** (TDD) Write tests for Max schema: same approach; cover installments, currency, billing date, comments.
- [ ] **3.2.4** Define Max Zod schema: map all Max-specific columns to unified shape; handle optional fields (billing date, conversion rate, etc.).
- [ ] **3.2.5** Export unified type from Zod (e.g. `UnifiedTransactionRow`) for use in ingest service.

### 3.3 Hash and idempotency
- [ ] **3.3.1** (TDD) Write tests for hash function: same (date, merchant, amount, last4) → same hash; different input → different hash; deterministic.
- [ ] **3.3.2** Implement hash generation: e.g. SHA256(date + merchant + amount + last4), normalized strings; store in `Transaction.hash`.
- [ ] **3.3.3** (TDD) Write tests for upsert/skipDuplicates: re-ingesting same file does not duplicate rows; new rows are inserted.

### 3.4 File rename and copy (pre-processing)
- [ ] **3.4.1** (TDD) Write tests for “resolve provider from file”: given file content or last4 + user’s cards, return provider or throw “unknown card”.
- [ ] **3.4.2** Implement provider resolution: parse file (or peek) to get last4; lookup in user’s Cards; get provider; infer standard name `[Last4]_[MM]_[YYYY]_[Provider].xlsx` (month/year from file content or filename).
- [ ] **3.4.3** (TDD) Write tests for copy to processed: destination is `PROCESSED_DIR/[Last4]_[MM]_[YYYY]_[Provider].xlsx`; original unchanged; PROCESSED_DIR created if missing.
- [ ] **3.4.4** Implement copy step: read original; write to PROCESSED_DIR with standard name; do not delete original.

### 3.5 Ingestion pipeline (single file)
- [ ] **3.5.1** (TDD) Write tests for ingest service: valid file → transactions created for correct userId; hash used; duplicate rows skipped; return counts (ingested, skipped).
- [ ] **3.5.2** (TDD) Write tests for validation errors: invalid rows skipped; valid rows ingested; response includes error summary (row index, message, optional snippet); max N errors per file (e.g. 50) in summary.
- [ ] **3.5.3** Implement ingest service: 1) resolve provider and userId from file + Cards; 2) copy file to PROCESSED_DIR with standard name; 3) read rows via ExcelService; 4) validate each row with provider schema; 5) build hash; 6) apply categorization rules (merchant → categoryId); 7) upsert by hash (or createMany with skipDuplicates); 8) aggregate and return summary (ingested, skipped, errors array).
- [ ] **3.5.4** Ensure categorization rule engine: for each transaction, find first matching rule by merchantPattern (exact match in MVP); set categoryId; if no rule, leave categoryId null.

### 3.6 Ingestion API and CLI
- [ ] **3.6.1** Implement `POST /ingest`: accept multipart file upload (single .xlsx); run ingest pipeline for current user; return JSON summary (ingested, skipped, errors).
- [ ] **3.6.2** (TDD) Write tests for CLI `ingest <path>`: file path → calls API or runs local ingest; directory path → discover all .xlsx (non-recursive), process each; non-.xlsx skipped with log; one failure does not stop others.
- [ ] **3.6.3** Implement CLI `ingest <path>`: if file, ingest one; if directory, list .xlsx and loop; use stored token; output summary per file (ingested, skipped, errors); machine-readable option (e.g. JSON).

---

## Phase 4: Transactions API and reporting

### 4.1 Transactions CRUD (read + partial update)
- [ ] **4.1.1** (TDD) Write tests for `GET /transactions`: filter by provider, date (month/year), category; pagination; only current user’s data.
- [ ] **4.1.2** Implement `GET /transactions`: query by userId; optional filters (provider, month, year, categoryId); sort by transactionDate or amount; limit/offset or cursor.
- [ ] **4.1.3** (TDD) Write tests for `PATCH /transactions/:id`: update categoryId and/or isFixedExpense; only owner; 404 if not found.
- [ ] **4.1.4** Implement `PATCH /transactions/:id`: validate body (Zod); update only categoryId, isFixedExpense; ensure transaction belongs to current user.

### 4.2 Reports (monthly, category, fixed, merchant)
- [ ] **4.2.1** (TDD) Write tests for `GET /reports/monthly`: query by month/year; returns aggregated by category (and/or totals); only current user.
- [ ] **4.2.2** Implement `GET /reports/monthly`: filter by userId, month, year; group by categoryId (and uncategorized); sum chargedAmount; return list + total.
- [ ] **4.2.3** (TDD) Write tests for `GET /reports/fixed`: list transactions where isFixedExpense = true; optional month/year.
- [ ] **4.2.4** Implement `GET /reports/fixed`: filter by userId and isFixedExpense; optional month/year; sort by date or amount.
- [ ] **4.2.5** (TDD) Write tests for `GET /reports/merchant/:name`: history for merchant name (exact or contains); only current user.
- [ ] **4.2.6** Implement `GET /reports/merchant/:name`: filter by userId and merchantName (normalize encoding); return list of transactions + optional totals.
- [ ] **4.2.7** (TDD) Optional: full-year summary (e.g. `GET /reports/yearly?year=2025`); same pattern as monthly.
- [ ] **4.2.8** Implement yearly report if in scope; document in API.

### 4.3 Uncategorized and sorted views
- [ ] **4.3.1** (TDD) Write tests for uncategorized: transactions with categoryId = null (or missing category); filter by user and optional month.
- [ ] **4.3.2** Implement `GET /transactions/uncategorized` or `GET /reports/uncategorized`: filter categoryId null, userId; optional month/year.
- [ ] **4.3.3** (TDD) Write tests for sorted view: sort by transaction amount (high→low, low→high); same filters as list.
- [ ] **4.3.4** Ensure `GET /transactions` supports `sort=amount_asc` / `sort=amount_desc` (and date); document.

### 4.4 CLI reporting commands
- [ ] **4.4.1** Implement CLI `summary --month MM --year YYYY`: call `GET /reports/monthly`; print table (category, total); optional --json.
- [ ] **4.4.2** Implement CLI `list-uncategorized`: call uncategorized endpoint; print table or JSON.
- [ ] **4.4.3** Implement CLI `report fixed` (and optionally `report merchant <name>`): call corresponding API; print table.

---

## Phase 5: Testing, docs, and polish

### 5.1 Test coverage and TDD alignment
- [ ] **5.1.1** Ensure all services (auth, ingest, categorization, reports) have unit tests; mocks for Prisma and fs.
- [ ] **5.1.2** Add integration tests (optional): real DB in Docker; test register → login → ingest one file → GET transactions; keep minimal for CI.
- [ ] **5.1.3** Document how to run tests and required env (e.g. DATABASE_URL for integration tests).

### 5.2 Documentation and env
- [ ] **5.2.1** README: project overview; prerequisites (Node, Docker); env vars (from .env.example); how to run db, migrate, seed; how to run API and CLI (login, ingest, summary).
- [ ] **5.2.2** Document API (OpenAPI/Swagger or markdown): auth (register, login), all routes with request/response samples; auth header.
- [ ] **5.2.3** .env.example: DATABASE_URL, JWT_SECRET, PROCESSED_DIR, optional ADMIN_EMAILS or first-user admin.

### 5.3 Error handling and security
- [ ] **5.3.1** Centralized API error handler: 4xx/5xx; do not leak stack in production; consistent JSON shape.
- [ ] **5.3.2** Validate all inputs with Zod; sanitize file upload (type, size limit) for ingest.
- [ ] **5.3.3** Ensure no raw password or token in logs; hash never logged.

---

## Phase 6: Optional follow-ups (post-MVP)

- Export to CSV/Excel.
- Arbitrary date range for reports.
- Heuristic “suggest fixed expenses” (recurring merchant + amount).
- Refresh tokens and shorter-lived access tokens.
- Per-user PROCESSED_DIR (e.g. PROCESSED_DIR/<userId>/).

---

## Task summary (checklist)

| Phase | Description |
|-------|-------------|
| **0** | Bootstrap: deps, TS, Jest, Docker, Prisma schema, seed |
| **1** | Auth: register, login, JWT, admin users, CLI login + token storage |
| **2** | Categories, Cards, Categorization rules (API) |
| **3** | Excel parsing, Cal/Max schemas, hash, copy to processed, ingest pipeline, API + CLI ingest |
| **4** | Transactions API, reports (monthly, fixed, merchant), uncategorized, CLI summary/report |
| **5** | Tests, README, API docs, error handling, security |
| **6** | Post-MVP (export, date range, heuristics, refresh tokens) |

---

*End of implementation plan. After approval, implementation can start from Phase 0 and proceed in order; Phases 1–2 can be parallelized by different developers once schema and auth are stable.*
