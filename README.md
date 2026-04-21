# ANEXYS iPaaS

Plateforme iPaaS (Integration Platform as a Service) multi-tenant.

## Stack Technique

- **Backend** : NestJS 10 + TypeScript 5.3 (strict) + Prisma 5 + PostgreSQL 16
- **Frontend** : React 18 + Vite 5 + TailwindCSS 3 + Zustand 4
- **Agent Desktop** : Node.js + WebSocket + chokidar
- **Infrastructure** : Docker + Redis 7 + BullMQ 5

## Structure du Monorepo

```
├── apps/
│   ├── api/          # Backend NestJS
│   ├── frontend/     # Frontend React
│   └── agent/        # Agent Desktop
├── packages/
│   ├── shared-types/ # Types partagés
│   ├── edifact/      # Parser EDIFACT
│   └── mapping-engine/
├── connectors/       # Définitions OpenAPI des connecteurs
└── docker/           # Configuration Docker
```

## Démarrage rapide

```bash
# Installer les dépendances
pnpm install

# Démarrer les services Docker (PostgreSQL, Redis, API, frontend, nginx)
# Depuis la racine : le .env à la racine est chargé automatiquement
docker compose up -d

# Générer les clients Prisma et appliquer les migrations
cd apps/api
pnpm run prisma:generate
pnpm run prisma:migrate
cd ../..

# Démarrer l'API + Frontend (agent optionnel : pnpm dev:all)
pnpm dev
```

**Alternative (tout-en-un)** : depuis la racine, `./scripts/dev.sh` démarre Docker, applique les migrations puis lance `pnpm dev` (nécessite Docker dans le PATH).

**Frontend seul** (sans base) : `pnpm dev:frontend` — interface sur http://localhost:5173

## Variables d'environnement

Copier `.env.example` vers `.env` et configurer les valeurs :

```bash
cp apps/api/.env.example apps/api/.env
```

## Sprints de développement

Voir `CURSOR_SPEC.md` pour les détails complets.

- **Sprint 1** ✅ : Infrastructure (monorepo, NestJS, Prisma, Auth, Tenants, Vault)
- **Sprint 2** ✅ : Connecteurs & Marketplace (OpenAPI, hot-reload)
- **Sprint 3** ✅ : Flow Engine (BullMQ, CRON, Webhook, execution logs)
- **Sprint 4** ✅ : Mapping Visuel (Preview, LookupTables)
- **Sprint 5** ✅ : Agent Desktop (WebSocket Gateway, CLI)
- **Sprint 6** ✅ : EDIFACT (Parser/Generator/Validator)
- **Sprint 7** ✅ : Billing (Stripe, Plans, Quotas)
- **Sprint 8** ✅ : Production (Audit, Notifications, Docker)

## Tests

```bash
# Exécuter tous les tests
pnpm test

# Tests API uniquement
cd apps/api && pnpm test

# Tests packages
cd packages/mapping-engine && pnpm test
cd packages/edifact && pnpm test
```

**95 tests** passent au total (74 API + 13 mapping-engine + 8 EDIFACT).

## Déploiement Docker

```bash
# Production
docker compose -f docker/docker-compose.yml up -d

# Développement (PostgreSQL + Redis uniquement)
docker compose -f docker/docker-compose.dev.yml up -d
```

---

*ANEXYS iPaaS — v1.0.0*
