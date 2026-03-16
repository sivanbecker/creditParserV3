#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

export LC_ALL=C

random_string() {
  head -c 32 /dev/urandom | base64 | tr -dc 'a-z0-9' | head -c 10
}

random_password() {
  head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32
}

EMAIL="$(random_string)@example.com"
PASSWORD="$(random_password)"

echo "Using email:    ${EMAIL}"
echo "Using password: ${PASSWORD}"
echo

echo "1) Registering user..."
REGISTER_RESPONSE=$(
  curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
)

REGISTER_BODY="$(printf '%s\n' "${REGISTER_RESPONSE}" | sed '$d')"
REGISTER_STATUS="$(printf '%s\n' "${REGISTER_RESPONSE}" | tail -n1)"

echo "Register status: ${REGISTER_STATUS}"
echo "Register body:"
echo "${REGISTER_BODY}"
echo

if [ "${REGISTER_STATUS}" != "201" ]; then
  echo "Register failed, aborting."
  exit 1
fi

echo "2) Logging in..."
LOGIN_RESPONSE=$(
  curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
)

LOGIN_BODY="$(printf '%s\n' "${LOGIN_RESPONSE}" | sed '$d')"
LOGIN_STATUS="$(printf '%s\n' "${LOGIN_RESPONSE}" | tail -n1)"

echo "Login status: ${LOGIN_STATUS}"
echo "Login body:"
echo "${LOGIN_BODY}"
echo

if [ "${LOGIN_STATUS}" != "200" ]; then
  echo "Login failed, aborting."
  exit 1
fi

TOKEN="$(
  node -e '
    try {
      const body = process.argv[1];
      const data = JSON.parse(body);
      const token = data.token;
      if (!token) {
        process.exit(1);
      }
      console.log(token);
    } catch {
      process.exit(1);
    }
  ' "${LOGIN_BODY}"
)"

if [ -z "${TOKEN}" ]; then
  echo "Failed to extract token from login response, aborting."
  exit 1
fi

echo "Extracted token (first 32 chars): ${TOKEN:0:32}..."
echo

echo "3) Calling /me with Bearer token..."
ME_RESPONSE=$(
  curl -sS -w "\n%{http_code}" -X GET "${BASE_URL}/me" \
    -H "Authorization: Bearer ${TOKEN}"
)

ME_BODY="$(printf '%s\n' "${ME_RESPONSE}" | sed '$d')"
ME_STATUS="$(printf '%s\n' "${ME_RESPONSE}" | tail -n1)"

echo "Me status: ${ME_STATUS}"
echo "Me body:"
echo "${ME_BODY}"
echo

if [ "${ME_STATUS}" != "200" ]; then
  echo "/me failed."
  exit 1
fi

echo "Auth route check completed successfully."

