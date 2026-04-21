#!/usr/bin/env bash
# Test d’intégration : POST CSV sur Benthos (/ingest/csv) → fichier partagé → exécution flux FILE_WATCH
# (connecteur fichiers plats) → mapping → upload FTP (connecteur ftp-sftp, opération upload_file).
#
# Prérequis :
#   docker compose --profile e2e up -d postgres redis api worker benthos ftp-test
#   (rebuild api/worker après changement moteur) ; tenant demo + admin@anexys.fr seedés.
#
# Variables : API_URL (défaut http://localhost:3000/api/v1), BENTHOS_URL (défaut http://localhost:4195)

set -euo pipefail

API="${API_URL:-http://localhost:3000/api/v1}"
BENTHOS="${BENTHOS_URL:-http://localhost:4195}"

command -v jq >/dev/null || { echo "jq est requis"; exit 1; }
command -v curl >/dev/null || { echo "curl est requis"; exit 1; }

echo "→ Login API"
TOKEN=$(curl -fsS -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@anexys.fr","password":"MotDePasse123!"}' | jq -r .accessToken)
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Échec login (tenant demo / utilisateur seed ?)"
  exit 1
fi
AUTH=( -H "Authorization: Bearer $TOKEN" )

echo "→ Connecteurs (création si absent)"
CEXIST=$(curl -fsS "$API/connectors" "${AUTH[@]}")
F_SRC=$(echo "$CEXIST" | jq -r '.[] | select(.name=="E2E fichiers plats") | .id' | head -1)
F_FTP=$(echo "$CEXIST" | jq -r '.[] | select(.name=="E2E FTP test") | .id' | head -1)
if [[ -z "$F_SRC" ]]; then
  F_SRC=$(curl -fsS -X POST "$API/connectors" "${AUTH[@]}" -H 'Content-Type: application/json' \
    -d '{"type":"file-formats","name":"E2E fichiers plats","config":{}}' | jq -r .id)
fi
if [[ -z "$F_FTP" ]]; then
  F_FTP=$(curl -fsS -X POST "$API/connectors" "${AUTH[@]}" -H 'Content-Type: application/json' \
    -d '{"type":"ftp-sftp","name":"E2E FTP test","config":{"base_url":"ftp://ftp-test:21","username":"anexys","password":"anexys","upload_path":""}}' | jq -r .id)
fi

echo "→ Mapping"
MEXIST=$(curl -fsS "$API/mappings" "${AUTH[@]}")
MID=$(echo "$MEXIST" | jq -r '.[] | select(.name=="E2E CSV vers FTP") | .id' | head -1)
if [[ -z "$MID" ]]; then
  MID=$(jq -n \
    --arg src "$F_SRC" \
    --arg dst "$F_FTP" \
    '{
      name: "E2E CSV vers FTP",
      sourceConnectorId: $src,
      sourceOperationId: "read_csv_file",
      destinationConnectorId: $dst,
      destinationOperationId: "upload_file",
      sourceSchema: { type: "object", properties: { a: { type: "string" }, b: { type: "string" } } },
      destinationSchema: { type: "object", properties: { col_a: { type: "string" }, col_b: { type: "string" } } },
      rules: [
        { type: "from", destinationField: "col_a", sourceField: "a" },
        { type: "from", destinationField: "col_b", sourceField: "b" }
      ]
    }' | curl -fsS -X POST "$API/mappings" "${AUTH[@]}" -H 'Content-Type: application/json' -d @- | jq -r .id)
fi

echo "→ Flux FILE_WATCH"
FLIST=$(curl -fsS "$API/flows" "${AUTH[@]}")
FID=$(echo "$FLIST" | jq -r '.[] | select(.name=="E2E Benthos HTTP→CSV→FTP") | .id' | head -1)
if [[ -z "$FID" ]]; then
  FID=$(jq -n \
    --arg src "$F_SRC" \
    '{
      name: "E2E Benthos HTTP→CSV→FTP",
      sourceConnectorId: $src,
      triggerType: "FILE_WATCH",
      triggerConfig: {
        inputPath: "/pipeline/inbound/ingress.csv",
        parser: { delimiter: ",", "hasHeader": true }
      }
    }' | curl -fsS -X POST "$API/flows" "${AUTH[@]}" -H 'Content-Type: application/json' -d @- | jq -r .id)
fi

NDEST=$(curl -fsS "$API/flows/$FID" "${AUTH[@]}" | jq '.destinations | length')
if [[ "$NDEST" -eq 0 ]]; then
  curl -fsS -X POST "$API/flows/$FID/destinations" "${AUTH[@]}" -H 'Content-Type: application/json' \
    -d "$(jq -n --arg c "$F_FTP" --arg m "$MID" '{connectorId:$c,mappingId:$m,orderIndex:0}')" >/dev/null
fi

curl -fsS -X POST "$API/flows/$FID/activate" "${AUTH[@]}" >/dev/null || true

echo "→ Ingestion HTTP → Benthos → /pipeline/inbound/ingress.csv"
curl -fsS -X POST "$BENTHOS/ingest/csv" -H 'Content-Type: text/csv; charset=utf-8' --data-binary $'a,b\n1,2\n'

echo "→ Exécution du flux"
EXEC=$(curl -fsS -X POST "$API/flows/$FID/execute" "${AUTH[@]}" | jq -r .executionId)
echo "   executionId=$EXEC"

for _ in $(seq 1 45); do
  ST=$(curl -fsS "$API/executions/$EXEC" "${AUTH[@]}" | jq -r .status)
  echo "   status=$ST"
  if [[ "$ST" == "SUCCESS" ]]; then
    echo "OK — CSV mappé déposé sur FTP (conteneur ftp-test, utilisateur anexys)."
    exit 0
  fi
  if [[ "$ST" == "FAILED" || "$ST" == "PARTIAL" ]]; then
    echo "Échec — derniers logs :"
    curl -fsS "$API/executions/$EXEC/logs" "${AUTH[@]}" | jq .
    exit 1
  fi
  sleep 1
done

echo "Timeout en attendant SUCCESS"
exit 1
