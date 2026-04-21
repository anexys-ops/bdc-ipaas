#!/usr/bin/env bash
# Installe Node.js 20 et pnpm sur la machine (Debian/Ubuntu).
# À exécuter en root ou avec sudo : bash scripts/install-node-pnpm.sh

set -e

echo "=== Installation de Node.js 20 et pnpm ==="

if command -v node &>/dev/null; then
  echo "Node déjà installé : $(node -v)"
  node -v
else
  # NodeSource pour Node.js 20 (Debian/Ubuntu)
  if [ -f /etc/debian_version ]; then
    apt-get update -qq
    apt-get install -y -qq curl
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
  else
    echo "Système non Debian/Ubuntu. Installez Node 20 manuellement : https://nodejs.org/"
    exit 1
  fi
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"

if ! command -v pnpm &>/dev/null; then
  echo "Installation de pnpm..."
  npm install -g pnpm@9
fi

echo "pnpm: $(pnpm -v)"
echo "=== Terminé. Vous pouvez lancer : cd /opt/bdc-ipaas && pnpm install && cd apps/api && pnpm run prisma:generate && pnpm run prisma:migrate && pnpm run prisma:seed && cd ../.. && pnpm dev ==="
