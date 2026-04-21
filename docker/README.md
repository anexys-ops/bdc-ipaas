# Docker

## Lancer les services (recommandé)

**Depuis la racine du dépôt** :

```bash
cd /opt/bdc-ipaas
docker compose up -d
```

Le fichier `docker-compose.yml` à la racine inclut `docker/docker-compose.yml` et charge le `.env` à la racine (`DB_PASSWORD`, `VAULT_KEY`, `JWT_SECRET`, etc.). Si `.env` n'existe pas, copiez `.env.example` et renseignez au moins `DB_PASSWORD` et `VAULT_KEY`.

## Production (`docker-compose.prod.yml`)

**Toujours lancer depuis la racine** pour que les chemins `../` du fichier compose et `env_file` pointent correctement :

```bash
cd /opt/bdc-ipaas
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

Inclut `api`, `worker` (files d’attente BullMQ), `frontend`, `nginx`, `postgres`, `redis`, `benthos`. Migrations : `docker compose -f docker/docker-compose.prod.yml --env-file .env.production run --rm migrate` (profil `tools`).

Depuis un autre répertoire : `--env-file /chemin/absolu/.env.production`.

**Prérequis** : Docker Compose v2.20+ (directive `include` à la racine) ; variables minimales dans `.env.production` : `POSTGRES_PASSWORD`, `VAULT_KEY`.
