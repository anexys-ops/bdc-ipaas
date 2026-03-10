#!/usr/bin/env bash
# Déploiement sur serveur Debian via SSH (port 113).
# Usage : depuis la racine du repo
#   ./scripts/deploy-to-server.sh
#
# Prérequis :
#   - Accès SSH (clé recommandée) : ssh-copy-id -p 113 root@86.104.252.67
#   - Ou mot de passe via variable : export DEPLOY_SSH_PASSWORD='...' (ne pas committer)

set -e

# --- Configuration (modifiable) ---
SERVER_HOST="${DEPLOY_HOST:-86.104.252.67}"
SERVER_USER="${DEPLOY_USER:-root}"
SERVER_PORT="${DEPLOY_PORT:-113}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/anexys-ipaas}"

# --- SSH ---
SSH_OPTS=(-o "StrictHostKeyChecking=accept-new" -o "ConnectTimeout=10" -p "$SERVER_PORT" "${SERVER_USER}@${SERVER_HOST}")

ssh_run() {
  if [[ -n "${DEPLOY_SSH_PASSWORD:-}" ]]; then
    sshpass -p "$DEPLOY_SSH_PASSWORD" ssh "${SSH_OPTS[@]}" "$@"
  else
    ssh "${SSH_OPTS[@]}" "$@"
  fi
}

ssh_run_cmd() {
  ssh_run "bash -s" "$@"
}

# --- Exclusions rsync ---
RSYNC_EXCLUDE=(
  --exclude '.git'
  --exclude 'node_modules'
  --exclude 'apps/*/node_modules'
  --exclude 'packages/*/node_modules'
  --exclude 'dist'
  --exclude 'apps/*/dist'
  --exclude '.env'
  --exclude '.env.local'
  --exclude '*.log'
  --exclude 'playwright-report'
  --exclude '.turbo'
)

echo ">>> Cible : ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT} -> ${REMOTE_DIR}"
echo ">>> Vérification connexion SSH..."
if ! ssh_run "echo OK" 2>/dev/null; then
  echo "Erreur : impossible de se connecter. Vérifiez clé SSH ou DEPLOY_SSH_PASSWORD."
  exit 1
fi

echo ">>> Création du répertoire distant..."
ssh_run "mkdir -p $REMOTE_DIR"

echo ">>> Copie des fichiers (rsync)..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
rsync -avz --delete "${RSYNC_EXCLUDE[@]}" -e "ssh -p $SERVER_PORT -o StrictHostKeyChecking=accept-new" \
  "$REPO_ROOT/" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/"

echo ">>> Vérification Docker sur le serveur..."
ssh_run "command -v docker >/dev/null 2>&1 || (apt-get update && apt-get install -y docker.io docker-compose-v2 2>/dev/null || apt-get install -y docker.io; systemctl enable --now docker)"

echo ">>> Création .env.production si absent..."
ssh_run "cd $REMOTE_DIR && if [[ ! -f .env.production ]]; then cp docker/.env.production.example .env.production && echo 'Fichier .env.production créé depuis exemple — ÉDITEZ-LE avec les vrais mots de passe puis relancez le déploiement.'; fi"

echo ">>> Lancement des conteneurs (docker compose)..."
ssh_run "cd $REMOTE_DIR && docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build"

echo ">>> Application des migrations (une fois)..."
ssh_run "cd $REMOTE_DIR && docker compose -f docker/docker-compose.prod.yml exec -T api npx prisma migrate deploy --schema=./src/prisma/schema.prisma" 2>/dev/null || echo "    (migrations déjà à jour ou à lancer manuellement)"

echo ""
echo ">>> Déploiement terminé."
echo ">>> Accès : http://${SERVER_HOST}:80 (ou https si vous mettez un reverse proxy)."
echo ">>> Premier accès : voir ACCES.md section « Déploiement » pour créer l’admin initial (seed)."
