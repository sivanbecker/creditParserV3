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
