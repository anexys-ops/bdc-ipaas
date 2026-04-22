#!/bin/bash
# Usage: ./restart.sh [service1 service2 ...]
# Sans argument = relance toute la stack
set -e
cd "$(dirname "$0")"
ENV_FILE="../.env.production"
PROJECT="bdc-ipaas"

if [ $# -eq 0 ]; then
  echo "[restart] Relance complète de la stack..."
  docker compose --env-file "$ENV_FILE" --project-name "$PROJECT" up -d 2>&1 | grep -v 'level=warning'
else
  echo "[restart] Services : $*"
  for svc in "$@"; do
    name="anexys-$svc"
    docker stop "$name" 2>/dev/null || true
    docker rm "$name" 2>/dev/null || true
  done
  docker compose --env-file "$ENV_FILE" --project-name "$PROJECT" up -d --no-deps "$@" 2>&1 | grep -v 'level=warning'
fi
echo "[restart] Done."
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'NAME|anexys'
