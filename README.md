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

# Démarrer les services Docker (PostgreSQL, Redis)
docker compose -f docker/docker-compose.dev.yml up -d

# Générer les clients Prisma
cd apps/api
pnpm run prisma:generate

# Appliquer les migrations
pnpm run prisma:migrate

# Démarrer l'API en mode développement
pnpm run dev
```

## Variables d'environnement

Copier `.env.example` vers `.env` et configurer les valeurs :

```bash
cp apps/api/.env.example apps/api/.env
```

## Sprints de développement

Voir `CURSOR_SPEC.md` pour les détails complets.

- **Sprint 1** ✅ : Infrastructure (monorepo, NestJS, Prisma, Auth, Tenants, Vault)
- **Sprint 2** : Connecteurs & Marketplace
- **Sprint 3** : Flow Engine
- **Sprint 4** : Mapping Visuel
- **Sprint 5** : Agent Desktop
- **Sprint 6** : EDIFACT
- **Sprint 7** : Billing
- **Sprint 8** : Production

---

*ANEXYS iPaaS — v1.0.0*
