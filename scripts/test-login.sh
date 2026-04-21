#!/usr/bin/env bash
# Test rapide du login API (après avoir démarré l'API et exécuté le seed).
# Usage: ./scripts/test-login.sh [URL_BASE]
# Exemple: ./scripts/test-login.sh http://localhost:3000/api/v1

set -e
BASE="${1:-http://localhost:3000/api/v1}"
URL="${BASE}/auth/login"
EMAIL="${TEST_USER_EMAIL:-admin@anexys.fr}"
PASSWORD="${TEST_USER_PASSWORD:-MotDePasse123!}"

echo "Test login: POST $URL"
echo "Email: $EMAIL"
RES=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

BODY=$(echo "$RES" | head -n -1)
CODE=$(echo "$RES" | tail -n 1)

if [ "$CODE" = "200" ]; then
  echo "HTTP $CODE - Connexion OK"
  echo "$BODY" | head -c 200
  echo "..."
  exit 0
else
  echo "HTTP $CODE - Échec"
  echo "$BODY"
  exit 1
fi
