#!/bin/sh
# Exécuter les migrations Prisma via Docker (sans avoir Node/npx sur l'hôte).
# À lancer depuis la racine du repo : ./docker/run-migrate.sh
# Ou depuis docker/ : ./run-migrate.sh
# Nécessite que les variables (DB_PASSWORD, etc.) soient définies (fichier .env à la racine ou dans docker/).

set -e
cd "$(dirname "$0")/.."

# Charger .env si présent (pour docker compose)
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi
if [ -f docker/.env ]; then
  set -a
  . ./docker/.env
  set +a
fi

docker compose -f docker/docker-compose.yml --profile tools run --rm migrate
