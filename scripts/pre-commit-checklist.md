# Pre-commit checklist: Phase 1.2 Admin API

Run these in order. Ensure `.env` exists and matches your DB (see `.env.example`).

---

## 1. Database: start DB and run migration

```bash
# Start PostgreSQL (if not already running)
docker compose up -d db

# Apply schema changes (adds User.isActive)
npm run db:migrate
# When prompted for migration name, use: add_user_is_active
# Or: npx prisma migrate dev --name add_user_is_active
```

---

## 2. Regenerate Prisma client (after migration)

```bash
npm run db:generate
# or: npx prisma generate
```

---

## 3. Unit tests

```bash
npm test
```

Expect: all test suites pass (e.g. 5 passed, 24 tests).

---

## 4. Lint (ESLint)

```bash
npm run lint
```

Expect: no ESLint errors.
---
## 5. Format (Prettier)

```bash
npm run format:check
```

Expect: all files match the Prettier formatting rules.
---
## 6. Build

```bash
npm run build
```

Expect: no TypeScript errors; `dist/` is created.

---

## 7. Start the server

```bash
npm start
```

Expect: e.g. `Server listening on port 3000`. Leave this running in one terminal for the next step.

---

## 8. Smoke test existing and new routes (curl)

Use a second terminal. Base URL: `http://localhost:3000` (or your `PORT` from `.env`).

### 8.1 Auth (existing)

```bash
# Register
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"this is a long random passphrase for smoke test 2026"}' | jq .

# Login (save token for next requests)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"this is a long random passphrase for smoke test 2026"}' | jq -r .token)
echo "Token: ${TOKEN:0:20}..."

# Protected route: /me
curl -s http://localhost:3000/me -H "Authorization: Bearer $TOKEN" | jq .
```

Expect: register 201, login 200 with `token`, /me 200 with `user: { id, email }`.

### 8.2 Admin routes (new) – without admin token

```bash
# No token → 401
curl -s http://localhost:3000/admin/users | jq .

# With normal user token → 403
curl -s http://localhost:3000/admin/users -H "Authorization: Bearer $TOKEN" | jq .
```

Expect: 401 and 403 with appropriate error messages.

### 8.3 Make a user admin and call admin routes

In Prisma Studio or psql, set the user as admin:

```bash
# Optional: open Prisma Studio to set isAdmin = true for smoke@example.com
npm run db:studio
# In another terminal, after setting isAdmin: true, login again and use new token for admin calls.
```

Or with psql:

```bash
# Get user id from /me response, then (replace USER_ID and run in psql or Prisma Studio):
# UPDATE "User" SET "isAdmin" = true WHERE id = 'USER_ID';
```

Then login again, set `TOKEN` to the new JWT, and run:

```bash
# List users (admin)
curl -s http://localhost:3000/admin/users -H "Authorization: Bearer $TOKEN" | jq .

# Create user (admin)
curl -s -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"other@example.com","password":"another long passphrase for smoke test 2026","isAdmin":false}' | jq .
```

Expect: 200 with user list, 201 with created user (no passwordHash).

---

## 9. Optional: run dev server instead of build + start

```bash
npm run dev
```

Then repeat the curl steps above against the dev server.

---

## Summary (copy-paste order)

```bash
docker compose up -d db
npm run db:migrate
npm run db:generate
npm test
npm run lint
npm run format:check
npm run build
npm start
# In another terminal: run curl commands from section 8
```

After all steps pass, you can commit.
