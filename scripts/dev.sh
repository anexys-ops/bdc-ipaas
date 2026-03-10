#!/usr/bin/env bash
# Démarrage de la stack complète en local (Docker requis)
set -e
cd "$(dirname "$0")/.."

echo "==> Vérification de Docker..."
if ! command -v docker &>/dev/null; then
  echo "Docker n'est pas installé ou pas dans le PATH. Installez Docker Desktop ou ajoutez docker au PATH."
  exit 1
fi

echo "==> Démarrage PostgreSQL et Redis..."
docker compose -f docker/docker-compose.dev.yml up -d

echo "==> Attente du démarrage de PostgreSQL..."
for i in {1..30}; do
  if docker compose -f docker/docker-compose.dev.yml exec -T postgres pg_isready -U anexys -d anexys_master &>/dev/null; then
    break
  fi
  sleep 1
done

echo "==> Génération client Prisma et migrations..."
cd apps/api && pnpm run prisma:generate && pnpm run prisma:migrate && cd ../..

echo "==> Lancement de la stack (API + Frontend + Agent)..."
pnpm dev
