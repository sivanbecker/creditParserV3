#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='your password' ./admin-routes-checker.sh"
  echo "Optional: BASE_URL=http://localhost:3000 (default)"
  exit 1
fi

export LC_ALL=C

random_string() {
  head -c 32 /dev/urandom | base64 | tr -dc 'a-z0-9' | head -c 10
}

random_password() {
  head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32
}

extract_json() {
  local key="$1"
  local body="$2"
  node -e "
    try {
      const key = process.argv[1];
      const body = process.argv[2];
      const data = JSON.parse(body);
      const val = data[key];
      if (val === undefined) process.exit(1);
      console.log(val);
    } catch {
      process.exit(1);
    }
  " "${key}" "${body}"
}

echo "Admin email:    ${ADMIN_EMAIL}"
echo "Base URL:       ${BASE_URL}"
echo

echo "1) Logging in as admin..."
LOGIN_RESPONSE=$(
  curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}"
)

LOGIN_BODY="$(printf '%s\n' "${LOGIN_RESPONSE}" | sed '$d')"
LOGIN_STATUS="$(printf '%s\n' "${LOGIN_RESPONSE}" | tail -n1)"

echo "Login status: ${LOGIN_STATUS}"
echo "Login body:"
echo "${LOGIN_BODY}"
echo

if [ "${LOGIN_STATUS}" != "200" ]; then
  echo "Admin login failed (check ADMIN_EMAIL and ADMIN_PASSWORD). Aborting."
  exit 1
fi

TOKEN="$(extract_json token "${LOGIN_BODY}")"
if [ -z "${TOKEN}" ]; then
  echo "Failed to extract token from login response. Aborting."
  exit 1
fi

echo "Extracted token (first 32 chars): ${TOKEN:0:32}..."
echo

echo "2) GET /admin/users (list users)..."
LIST_RESPONSE=$(
  curl -sS -w "\n%{http_code}" -X GET "${BASE_URL}/admin/users" \
    -H "Authorization: Bearer ${TOKEN}"
)
LIST_BODY="$(printf '%s\n' "${LIST_RESPONSE}" | sed '$d')"
LIST_STATUS="$(printf '%s\n' "${LIST_RESPONSE}" | tail -n1)"

echo "Status: ${LIST_STATUS}"
echo "Body:"
echo "${LIST_BODY}"
echo

if [ "${LIST_STATUS}" != "200" ]; then
  echo "GET /admin/users failed. Aborting."
  exit 1
fi

NEW_EMAIL="$(random_string)@example.com"
NEW_PASSWORD="$(random_password)"
echo "3) POST /admin/users (create user: ${NEW_EMAIL})..."
CREATE_RESPONSE=$(
  curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/admin/users" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"${NEW_PASSWORD}\",\"isAdmin\":false}"
)
CREATE_BODY="$(printf '%s\n' "${CREATE_RESPONSE}" | sed '$d')"
CREATE_STATUS="$(printf '%s\n' "${CREATE_RESPONSE}" | tail -n1)"

echo "Status: ${CREATE_STATUS}"
echo "Body:"
echo "${CREATE_BODY}"
echo

if [ "${CREATE_STATUS}" != "201" ]; then
  echo "POST /admin/users failed. Aborting."
  exit 1
fi

USER_ID="$(extract_json id "${CREATE_BODY}")"
if [ -z "${USER_ID}" ]; then
  echo "Failed to extract new user id. Aborting."
  exit 1
fi

echo "Created user id: ${USER_ID}"
echo

echo "4) PATCH /admin/users/${USER_ID} (set isAdmin: true)..."
PATCH_RESPONSE=$(
  curl -sS -w "\n%{http_code}" -X PATCH "${BASE_URL}/admin/users/${USER_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"isAdmin":true}'
)
PATCH_BODY="$(printf '%s\n' "${PATCH_RESPONSE}" | sed '$d')"
PATCH_STATUS="$(printf '%s\n' "${PATCH_RESPONSE}" | tail -n1)"

echo "Status: ${PATCH_STATUS}"
echo "Body:"
echo "${PATCH_BODY}"
echo

if [ "${PATCH_STATUS}" != "200" ]; then
  echo "PATCH /admin/users/:id failed. Aborting."
  exit 1
fi

echo "5) GET /admin/users again (confirm new user in list)..."
LIST2_RESPONSE=$(
  curl -sS -w "\n%{http_code}" -X GET "${BASE_URL}/admin/users" \
    -H "Authorization: Bearer ${TOKEN}"
)
LIST2_BODY="$(printf '%s\n' "${LIST2_RESPONSE}" | sed '$d')"
LIST2_STATUS="$(printf '%s\n' "${LIST2_RESPONSE}" | tail -n1)"

echo "Status: ${LIST2_STATUS}"
echo "Body:"
echo "${LIST2_BODY}"
echo

if [ "${LIST2_STATUS}" != "200" ]; then
  echo "Second GET /admin/users failed. Aborting."
  exit 1
fi

if ! node -e "
  const id = process.argv[1];
  const body = process.argv[2];
  const data = JSON.parse(body);
  if (!Array.isArray(data) || !data.some(u => u.id === id)) {
    process.exit(1);
  }
" "${USER_ID}" "${LIST2_BODY}" 2>/dev/null; then
  echo "New user ${USER_ID} not found in user list. Aborting."
  exit 1
fi

echo "Admin route check completed successfully."
