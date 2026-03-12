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
- **Category model:** Do we need a `Category` table (id, name, userId or null for system, isSystem) so “custom” categories are per-user and predefined are system-wide?

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

### Testing & consistency

- **Test runner:** TECHNICAL_SPEC says Jest; .cursorrules say Vitest. Which do we use for MVP? (Recommendation: **Vitest** to align with .cursorrules.)

### DevOps & environment

- **Local PostgreSQL:** Should we provide a **Docker Compose** (or similar) for local PostgreSQL, or assume devs run Postgres themselves?
- **Migrations:** Use Prisma Migrate for schema changes from the start? (Assumed yes unless you prefer otherwise.)
