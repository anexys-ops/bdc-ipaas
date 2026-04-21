# Scripts de seed

## Seed principal (tenant + utilisateur)

```bash
cd apps/api && pnpm run prisma:seed
```

Crée le tenant **demo**, la base `db_demo`, et l'utilisateur `admin@anexys.fr` / `MotDePasse123!`.

Prérequis : `DATABASE_URL` et optionnellement `VAULT_KEY` dans un fichier `.env`. Le script charge automatiquement `.env` depuis la racine du projet, le dossier `docker/`, puis `apps/api/` (dans cet ordre). **Avec Docker** : si votre base tourne dans un conteneur, utilisez `DATABASE_URL=postgresql://anexys:VOTRE_MOT_DE_PASSE@localhost:5432/anexys_master` (port exposé sur l'hôte).

---

## Seed données démo (connecteurs, mappings, planifications)

```bash
cd apps/api && pnpm run seed:demo
```

À lancer **après** le seed principal. Crée dans le tenant demo :

- **Connecteurs** : Sage Compta, Sage 100 (SBO), Sellsy CRM, Taskit, Docoon (PA), Dolibarr (configs factices pour démo).
- **Mappings** :
  - Sage → Sellsy (clients vers contacts)
  - Sage → Dolibarr (tiers)
  - Sage → Taskit (tâches)
  - Sage → Docoon (facturation électronique)
  - Sage 100 (SBO) → Dolibarr (tiers)
- **Planifications (flux)** : un flux CRON par mapping (horaires différents : 2h, 3h, 4h, 6h, 8h jours ouvrés).

Si des flux existent déjà dans le tenant, le script ne fait rien (évite les doublons).

**Variables** : le script charge `.env`, `.env.production`, `docker/.env`, `apps/api/.env` (racine = deux niveaux au-dessus de `apps/api`). Si `DATABASE_URL` contient `@postgres:`, elle est convertie en `@localhost:` pour exécution depuis l'hôte. Avec Docker : lancez d'abord les conteneurs pour que Postgres soit joignable sur `localhost:5432`.
