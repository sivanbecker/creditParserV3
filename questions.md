# PRD Questions and Answers

This file records the questions asked during the PRD/spec brainstorming and the answers you provided. Use it as the single source of truth for project decisions.

---

## 1. PRD scope and priorities

### Who will use the system? (Impacts auth, schema, and API design.)

**Question:** Single user/household, single user with multi-user later, or multi-user from day one?

**Your answer:** Multi-user from day one (auth, per-user transactions and reports).

---

### On ingest: what should happen to the .xlsx file on disk?

**Question:** Rename in place, copy to a "processed" folder with the standard name, or only store in DB (no file rename/move)?

**Your answer:** Copy to a dedicated "processed" folder with the standard name; leave the original file unchanged.

---

### How should transaction categories work?

**Question:** Predefined list only, free-form text only, or predefined list with option to add custom categories?

**Your answer:** Predefined list with option to add custom categories.

---

### MVP delivery scope: what should be included in the first release?

**Question:** CLI + REST API only, or CLI + REST API + minimal web UI?

**Your answer:** CLI + REST API only (no web UI).

---

## 2. Auth, data, and environment

### How should users authenticate for the API (and optionally for CLI)?

**Question:** JWT, session-based, or API key per user?

**Your answer:** JWT (e.g. login returns token; CLI and API use Bearer token).

---

### Should MVP include rule-based auto-categorization (e.g. merchant "Wolt" → Food)?

**Question:** Yes in MVP (configurable merchant → category map, applied on ingest) or no (manual only; add rules later)?

**Your answer:** Yes — configurable merchant → category map, applied on ingest.

---

### Database for development and production?

**Question:** PostgreSQL only, or SQLite for local dev and PostgreSQL for production?

**Your answer:** PostgreSQL only (local Docker or cloud).

---

## Summary table

| Topic           | Decision                                                                 |
|----------------|---------------------------------------------------------------------------|
| User model     | Multi-user from day one (auth, per-user data)                            |
| File handling  | Copy to "processed" folder with standard name; leave original as-is       |
| Categories     | Predefined list + option to add custom categories                        |
| MVP UI         | CLI + REST API only                                                      |
| Auth           | JWT (Bearer token)                                                       |
| Auto-categorize| Yes in MVP (merchant → category map on ingest)                          |
| Database       | PostgreSQL only                                                          |

---

## 3. Open questions (to be answered)

### Auth & user management

- **User creation:** For MVP, how do users get created? (e.g. CLI-only `user create`, or a `/register` API endpoint, or seed/migration only?)
**Your answer:** For MVP, users are created via local auth using a `/register` API endpoint that the end-user CLI calls to self-register with email + password, plus a separate admin surface for user management. A dedicated admin CLI calls protected `/admin/users` endpoints (e.g. create/list/deactivate users); the main CLI only acts as an end user. No seed/migration-only creation is planned; passwords are stored hashed, and the design leaves room to later swap in an IdP or expose the API on the internet.
- **Password policy:** Any requirements (min length, complexity)? Or keep minimal for MVP?
**Your answer:** For MVP, require passwords to be between 15 and 100 characters, with no strict composition rules (no forced symbols/uppercase) to keep local development and CLI usage frictionless. Encourage long passphrases, reject a small set of obviously weak passwords (e.g. `password`, `123456`, app name), do not enforce periodic rotation, and store all passwords as salted, strong hashes (e.g. Argon2id or bcrypt).
- **JWT:** Access token only, or access + refresh tokens? Typical access token expiry (e.g. 15 min / 1 h / 24 h)?
**Your answer:** For MVP, use access tokens only (no refresh tokens) to keep the auth flow simple for a local/internal tool. The `/login` endpoint issues a JWT access token with a 24-hour expiry, which the CLI stores and sends as a Bearer token; when it expires, the user runs `login` again. If the API later becomes internet-facing or gains more users, we can introduce refresh tokens and shorter-lived access tokens without changing the overall model.

### Data ownership & CardMap

- **CardMap scope:** Is the card map (last4 → provider, owner) **global** (one shared config) or **per-user** (each user has their own cards)?
**Your answer:** Per-user. Each user has their own card map; the same last4 can exist for multiple users, with each user assigning provider and owner as needed. Cards are scoped by `userId` in the schema and all card-related queries filter by the authenticated user.
- **Transaction ownership:** Confirm: every transaction is tied to a `userId` (e.g. via card’s owner at ingest), and users only see their own transactions?
**Your answer:** Yes. Every transaction is tied to a `userId` (derived from the card's owner at ingest). Users only see their own transactions; all transaction queries filter by the authenticated user's `userId`.

### Categories

- **Predefined list source:** Where do “predefined” categories come from? (Seed list in DB, config file, or first user-created category defines the list?)
**Your answer:** Predefined categories come from a seeded list in the database, stored as system-wide `Category` records created via migrations or a Prisma seed script so they are consistent across environments. Category names fully support Hebrew and other Unicode characters. The initial list is a small, opinionated set of Hebrew category names (e.g. `אוכל`, `קניות`, `דיור`, `חשבונות`, `תחבורה`, `מנויים`, `פנאי`, `הכנסות`, `עמלות`, `אחר`) and evolves over time via schema/seed updates. The CLI does not hardcode this list; it always reads categories from the API/DB so new predefined categories can be added without a CLI release.

- **Category model:** Do we need a `Category` table (id, name, userId or null for system, isSystem) so “custom” categories are per-user and predefined are system-wide?
**Your answer:** Yes. Introduce a `Category` table with fields like `id` (PK), `name` (Unicode-capable string, unique per owner scope), `userId` (nullable FK to `User`), `isSystem` (boolean) and optionally `slug` (string) for stable identifiers. Records with `userId = null` and `isSystem = true` represent system-wide predefined categories (seeded in Hebrew) visible to all users; records with a non-null `userId` represent custom per-user categories only visible/usable by that user. Transactions reference categories by `categoryId` (FK to `Category`), and we enforce uniqueness of `(userId, name)` for custom categories and of `name` for system categories (`userId = null`), while allowing names to include Hebrew and other Unicode characters.

### Ingestion behavior

- **Processed folder location:** Single global path from env (e.g. `PROCESSED_DIR`), or configurable per user?
- **Bulk ingest:** Should `ingest` accept a **directory** (process all .xlsx inside) or only a **single file** per invocation?
- **Parse/validation errors:** If some rows in a file fail Zod validation, should we: **fail entire file**, **skip bad rows and ingest good ones**, or **save good rows and return a summary of errors**?

### Reporting & “fixed” expenses

- **Date range:** Are reports only for **full month/year** (e.g. “March 2025”), or do we need **arbitrary date range** (e.g. 1 Mar–15 Apr) in MVP?
- **Fixed expense detection:** Is “fixed expense” **manual only** (user flags a transaction), or should we also support **simple heuristics** (e.g. same merchant + similar amount in last N months) in MVP?
- **Export:** Do we need **export to CSV/Excel** in MVP, or is that post-MVP?

### CLI & tooling

- **CLI auth:** How does the CLI get the JWT? (e.g. `login` command that stores token in `~/.credit-tracker/token` or env; other commands read it? Or pass `--token` every time?)
- **CLI framework:** Prefer **Commander.js** or **Clack** for the CLI?

### DevOps & environment

- **Local PostgreSQL:** Should we provide a **Docker Compose** (or similar) for local PostgreSQL, or assume devs run Postgres themselves?
- **Migrations:** Use Prisma Migrate for schema changes from the start? (Assumed yes unless you prefer otherwise.)
 
**Ingestion behavior – Processed folder location – Your answer:** For MVP, use a single global processed directory configured via an env var like `PROCESSED_DIR` (defaulting to a local `./processed` if not set). All successfully ingested files are renamed to `[Last4]_[MM]_[YYYY]_[Provider].xlsx` and moved into this shared folder; logical per-user separation is enforced in the database via `userId`/`CardMap`, not via separate directories. If we ever need stricter per-user archival, we can evolve the path to `PROCESSED_DIR/<userId>/...` without changing the ingestion contract.

**Ingestion behavior – Bulk ingest – Your answer:** From day one, `ingest` accepts either a single file or a directory. The CLI command is `ingest <path>`: if `<path>` is an `.xlsx` file, we ingest just that file; if `<path>` is a directory, we scan its immediate children and ingest all `.xlsx` files inside (non-recursive in MVP). Non-`.xlsx` files are skipped with a short log message. Each file is processed independently so a failure in one file does not prevent ingesting the others.

**Ingestion behavior – Parse/validation errors – Your answer:** Use resilient behavior: skip invalid rows, ingest valid ones, and return a clear, structured error summary so fixes and re-runs are safe. Per file, the summary includes: total rows processed, count ingested, count skipped; for each skipped row (or a capped sample, e.g. first 50), include row index (e.g. sheet row number), validation error message(s) from Zod, and optionally a short raw-row snippet so a test fixture can be added and the parser fixed. The summary is machine-readable (e.g. JSON or a well-defined CLI table) so tests can assert on it. Validation paths, error aggregation, and idempotency are well covered by tests; for any real ingestion error the user can add a test (fixture + expected error shape), fix the code, and re-run. Idempotency (row hash + upsert/skipDuplicates) ensures re-running the same file after a fix re-ingests only previously failed rows and does not duplicate already-ingested rows in the DB.

**Reporting – Date range – Your answer:** For MVP, reports are based on full calendar periods only (primarily per-month summaries, e.g. “March 2025”), not arbitrary date ranges. The reporting API is designed so that adding arbitrary start/end date filters later (e.g. 1 Mar–15 Apr) is a backward-compatible extension, but the first release focuses on simple, reliable monthly (and optionally full-year) summaries.

**Reporting – Fixed expense detection – Your answer:** For MVP, “fixed expense” is a purely manual flag that the user applies to transactions (or categories); there is no automatic detection or heuristic-based suggestion. The data model and queries are designed so that we can later add a “suggest fixed expenses” feature (e.g. recurring merchant + similar amount over N months), but initial releases rely only on explicit user marking.

**Reporting – Export – Your answer:** Export to CSV/Excel is not included in the MVP; initial usage focuses on CLI/API reports only. The reporting layer will be designed so that adding one or more export formats (e.g. CSV suitable for Excel/Sheets) later is straightforward and backward-compatible.

**CLI – Auth flow – Your answer:** The CLI provides a `login` command that prompts for credentials once and stores the returned JWT access token in a file under the user’s home directory (e.g. `~/.credit-tracker/token`), outside the project repo. Subsequent CLI commands automatically read and send this token as a Bearer token; there is no need to pass `--token` on every call. The token file path is never committed (it lives outside the repo and is also covered by `.gitignore` patterns for safety), and the user can force re-login by deleting the token file or running `login` again.

**CLI – Framework – Your answer:** The CLI uses a traditional command-style interface built with Commander.js (or a similar mature command parser). Commands are structured as explicit subcommands like `credit login`, `credit ingest`, and `credit report`, with flags and options for non-interactive usage. Interactive “wizard” flows are not a focus for MVP; the priority is a predictable, scriptable CLI with clear help output.

**DevOps – Local PostgreSQL – Your answer:** For local development, the project provides a Docker Compose setup for PostgreSQL, and that is the primary supported path. Developers run `docker compose up db` (or equivalent) to get a Postgres instance with the expected version and configuration, matching production as closely as practical. Advanced users can still point `DATABASE_URL` at their own Postgres instance if they prefer, but the repo defaults, documentation, and examples all assume the Docker Compose–managed database to keep onboarding fast and environments consistent.

**DevOps – Migrations – Your answer:** Use Prisma Migrate for all schema changes from day one. The Prisma schema is the single source of truth; developers evolve it and run `prisma migrate dev` in development and `prisma migrate deploy` in CI/production. Direct, manual changes to the database schema are discouraged so that all environments stay in sync, migrations remain reviewable, and rollbacks are manageable.

---

## 4. Implementation plan assumptions (see IMPLEMENTATION_PLAN.md)

The following were assumed when drafting the implementation plan; if any are wrong, correct the plan and add the Q&A here.

- **CardMap storage:** Per-user card mapping is stored in the database as a `Card` model (userId, lastFourDigits, provider, owner, alias), not a static config file. Lookup at ingest uses the authenticated user + last4 derived from the file.
- **Merchant → category rules:** Stored per-user in the DB as `CategorizationRule` (userId, merchantPattern, categoryId), applied during ingest. Match type in MVP is exact (can be extended later).
- **Processed files:** Files are **copied** (not moved) to `PROCESSED_DIR` with the standard name; the original file is left unchanged.
- **Report date scope:** MVP reports use full calendar month (and optionally full year) only; no arbitrary date ranges in the first release.