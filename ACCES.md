# Accès locaux — ANEXYS iPaaS

## URLs

| Service | URL | Description |
|--------|-----|-------------|
| **Front-office** | http://localhost:5173 | Application React (interface utilisateur) |
| **Back-office API** | http://localhost:3000 | API NestJS |
| **Documentation API (Swagger)** | http://localhost:3000/api/docs | Tester les endpoints et s’authentifier |

---

## Démarrer l’API (si « Impossible de joindre l’API »)

Le front doit pouvoir appeler `http://localhost:3000/api/v1`. Si ce message s’affiche, l’API n’est pas démarrée ou la base n’est pas prête.

### 1. Lancer Postgres et Redis (Docker)

```bash
cd docker && docker compose -f docker-compose.dev.yml up -d
```

Postgres : `anexys` / `anexys_dev_password` / `anexys_master` sur le port 5432.

### 2. Configurer et préparer l’API

```bash
cd apps/api
cp .env.example .env
# Éditer .env si besoin : DATABASE_URL=postgresql://anexys:anexys_dev_password@localhost:5432/anexys_master
pnpm run prisma:migrate
pnpm run prisma:seed
```

### 3. Démarrer l’API et le frontend

À la **racine du repo** :

```bash
pnpm dev
```

Cela lance l’API sur le port **3000** et le frontend sur **5173**. Rechargez http://localhost:5173 et reconnectez-vous.

**Alternative** (deux terminaux) :

- Terminal 1 : `cd apps/api && pnpm run dev`
- Terminal 2 : `cd apps/frontend && pnpm run dev`

### 4. Vérifier l’API

- Ouvrir http://localhost:3000/api/docs (Swagger) ou `curl http://localhost:3000/api/v1/marketplace`.
- Tester le login : `./scripts/test-login.sh` (depuis la racine du repo). En cas de succès : `HTTP 200 - Connexion OK`.
- Si le front tourne sur une autre machine ou un autre port, créer `apps/frontend/.env` avec :  
  `VITE_API_URL=http://<adresse-de-l-api>/api/v1`

---

## Premier accès (après seed)

Une fois le seed exécuté (voir ci‑dessous), vous pouvez vous connecter avec :

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@anexys.fr` |
| **Mot de passe** | `MotDePasse123!` |

**Créer le premier tenant + utilisateur** (une seule fois) :

```bash
cd apps/api && pnpm run prisma:seed
```

Puis ouvrir le **front-office** (http://localhost:5173) ou **Swagger** (http://localhost:3000/api/docs) et vous connecter avec les identifiants ci‑dessus.

---

## Sans seed

Il n’y a pas d’utilisateur par défaut. Il faut soit lancer le seed ci‑dessus, soit créer un tenant (Super Admin) et un utilisateur manuellement (base de données ou outil type Prisma Studio).

---

## Déploiement (serveur Debian)

Déploiement sur un serveur (ex. **86.104.252.67**, utilisateur **root**, SSH port **113**).  
**Domaine** : **https://ultimate.edicloud.app**

### Prérequis

- **Accès SSH** : de préférence par clé (pas de mot de passe dans le dépôt) :
  ```bash
  ssh-copy-id -p 113 root@86.104.252.67
  ```
  Sinon, au moment du déploiement : `export DEPLOY_SSH_PASSWORD='votre_mot_de_passe'` (ne jamais committer ce mot de passe).

### Déployer

À la **racine du repo** :

```bash
chmod +x scripts/deploy-to-server.sh
./scripts/deploy-to-server.sh
```

Le script :

1. Copie le code sur le serveur (`rsync` vers `/opt/anexys-ipaas` par défaut).
2. Crée `.env.production` depuis `docker/.env.production.example` si absent.
3. Lance Docker (installé si besoin) et `docker compose -f docker/docker-compose.prod.yml up -d --build`.
4. Lance les migrations Prisma.

**Important** : après le premier déploiement, éditez **sur le serveur** le fichier `.env.production` (mots de passe Postgres, JWT, etc.) puis relancez :

```bash
ssh -p 113 root@86.104.252.67 "cd /opt/anexys-ipaas && docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d"
```

### Premier accès en production (seed)

Pour créer l’utilisateur admin initial sur le serveur, deux possibilités :

- **Depuis votre machine** (tunnel SSH + seed local) : exposez temporairement Postgres sur le serveur (dans `docker-compose.prod.yml`, ajoutez sous le service `postgres` : `ports: - "127.0.0.1:5432:5432"`), puis :
  ```bash
  ssh -L 5432:localhost:5432 -p 113 root@86.104.252.67   # laisser ouvert
  ```
  Dans un autre terminal (avec le mot de passe Postgres défini dans `.env.production`) :
  ```bash
  cd apps/api && DATABASE_URL="postgresql://anexys:VOTRE_MOT_DE_PASSE@localhost:5432/anexys_master" pnpm run prisma:seed
  ```
  Puis remettez le service Postgres sans exposition de port et redémarrez.

- **Création manuelle** : utilisez l’API Swagger en production (https://ultimate.edicloud.app/api/docs) pour créer un tenant et un utilisateur si l’app le permet.

Après le seed, connexion avec : **admin@anexys.fr** / **MotDePasse123!** (à changer en production).
