# EBP Token Manager

Petit service web pour gerer les refresh tokens EBP par client.

## Ce que fait cette version

- stocke les tokens dans MariaDB
- recharge automatiquement les dossiers `clients/*/client.json`
- permet de coller le premier refresh token une seule fois
- rafraichit automatiquement les tokens avant expiration
- garde un historique simple des refresh
- envoie le JSON recu vers deux webhooks optionnels par client

## Demarrage

1. Copier `.env.example` vers `.env`
2. Renseigner au minimum :
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `MARIADB_PASSWORD`
   - `MARIADB_ROOT_PASSWORD`
   - `EBP_CLIENT_SECRET`
3. Lancer :

```bash
docker compose up -d --build
```

4. Ouvrir `http://localhost:8081`

## Logique par client

Chaque client peut etre cree de deux facons :

- dans l'interface web
- avec un dossier `clients/<slug>/client.json`

Exemple minimal :

```json
{
  "slug": "cano-concept",
  "name": "CANO CONCEPT",
  "enabled": true,
  "initial_refresh_token": "..."
}
```

## Ports

- application web : `8081`
- MariaDB : interne Docker uniquement

## Remarques

- l'acces web peut etre protege par Keycloak via `oauth2-proxy`
- le certificat wildcard `*.apps-dev.fr` peut etre reutilise sur le reverse proxy nginx existant
- si le refresh token tourne a chaque appel, cette application le remplace automatiquement en base
- si EBP renvoie `invalid_grant`, le client passe en erreur dans l'interface et attend une re-auth manuelle
