Scripts SQL optionnels exécutés au premier démarrage de PostgreSQL (docker-entrypoint-initdb.d).
Laisser ce dossier vide si les migrations Prisma suffisent.

02-keycloak.sql : crée la base `keycloak` pour le conteneur Keycloak (docker-compose.prod).
Sur un volume Postgres déjà initialisé avant l’ajout de ce script, créer la base à la main :
  docker compose -f docker/docker-compose.prod.yml exec postgres psql -U anexys -d postgres -c "CREATE DATABASE keycloak;"
