# Sellsy — Requêtes équivalentes (curl)

Quand l’« Aperçu des données » échoue avec une erreur API externe (ex. 404), le message d’erreur affiché dans l’interface contient désormais **le curl équivalent** à la requête envoyée par l’API (token masqué).

## Exemple de requêtes envoyées par l’app

### 1. Obtenir un token (Client Credentials)

```bash
curl -X POST 'https://login.sellsy.com/oauth2/access-tokens' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials&client_id=VOTRE_CLIENT_ID&client_secret=VOTRE_CLIENT_SECRET'
```

### 2. Récupérer les factures (list_invoices)

```bash
curl -X GET 'https://api.sellsy.com/v2/invoices?limit=50' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

### 3. Récupérer les contacts (list_contacts)

```bash
curl -X GET 'https://api.sellsy.com/v2/contacts?limit=50' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

Remplacez `<ACCESS_TOKEN>` par le token obtenu à l’étape 1.

## En cas de 404 Not Found

- Vérifiez que l’**URL de base** configurée est bien `https://api.sellsy.com/v2` (sans slash final dans la config, l’app ajoute le chemin `/invoices` ou `/contacts`).
- Vérifiez que votre **application Sellsy** (Developer) a les scopes `invoices.read` et/ou `contacts.read` selon l’opération.
- Testez le curl à la main avec le même token : si le curl échoue aussi en 404, le problème vient du compte Sellsy ou de l’API ; si le curl fonctionne, le problème peut venir de l’URL construite côté app (signaler en ouvrant une issue avec le curl affiché dans l’erreur).

## Où voir le curl dans l’app

Dans l’interface, sur la page du connecteur configuré (SellSy_Dias), lorsque vous cliquez sur « Récupérer les factures » ou « Récupérer les clients/contacts » et qu’une erreur API externe se produit, le message d’erreur contient une ligne du type :

```
Pour reproduire (curl):
curl -X GET 'https://api.sellsy.com/v2/invoices?limit=50' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

Utilisez ce bloc pour reproduire la requête en ligne de commande en remplaçant `<ACCESS_TOKEN>` par votre token.
