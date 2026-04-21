# Module Flow — Spécification Fonctionnelle & API
## Ultimate EDI Platform — ultimate.edicloud.app

> **Version** : 1.0
> **Date** : 2026-03-31
> **Statut** : Draft — intégration plateforme Ultimate
> **Briques dépendantes** : Mapping ✅ · Connecteurs ✅ · **Flow** 🔧 (ce module)

---

## 1. Contexte et positionnement

### 1.1 Architecture globale Ultimate

```
┌─────────────────────────────────────────────────────────┐
│                  ultimate.edicloud.app                   │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │Connecteurs│───▶│   FLOW   │───▶│    Mapping       │   │
│  │  (✅ OK) │    │(ce module)│    │    (✅ OK)       │   │
│  └──────────┘    └────┬─────┘    └──────────────────┘   │
│                       │                                  │
│                       ▼                                  │
│              ┌─────────────────┐                         │
│              │ gate.edicloud.app│  ← Gateway EDI         │
│              │ (Benthos/Redis) │                         │
│              └─────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Rôle du module Flow

Le module **Flow** est la brique d'orchestration centrale. Il assure :

- La **définition des flux entrants** (webhooks, AS2, SFTP, API) et **sortants** (n8n, Dolibarr, Docoon, scripts)
- Le **routage intelligent** des messages EDI selon le type de document, le client, et le sous-client
- La **visibilité temps réel** sur l'état des flux (queue, lag, erreurs)
- La **gestion commerciale** des clients et de leurs tokens d'accès
- La **traçabilité complète** de chaque message de l'entrée à la sortie

---

## 2. Modèle de données

### 2.1 Entités principales

#### `Flow`
```json
{
  "id": "uuid",
  "name": "Flux Sabiana Factures",
  "client_id": "sabiana",
  "description": "Réception factures fournisseurs via webhook",
  "status": "active | inactive | error",
  "input": { "type": "webhook", "token": "sabiana_45e8eee1f44bce8200686377" },
  "output": { "type": "n8n", "url": "http://192.168.1.115:5678/webhook/..." },
  "stream": "ingress:global",
  "mapping_id": "uuid | null",
  "connector_id": "uuid | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "stats": {
    "total_messages": 43,
    "last_message_at": "ISO8601",
    "error_count": 0
  }
}
```

#### `FlowToken`
```json
{
  "token": "sabiana_45e8eee1f44bce8200686377",
  "client_id": "sabiana",
  "flow_id": "uuid",
  "enabled": true,
  "auth_type": "none | bearer | hmac",
  "stream": "ingress:global | ingress:toyo",
  "n8n_url": "http://192.168.1.115:5678/webhook/...",
  "webhook_url": "https://gate.edicloud.app/webhook?token=...",
  "created_at": "ISO8601"
}
```

#### `FlowRoute`
```json
{
  "id": "uuid",
  "token": "sabiana_45e8eee1f44bce8200686377",
  "route": "facture | commande | devis | livraison",
  "subclient_id": "store-01 | null",
  "destination_url": "http://...",
  "priority": 1,
  "redis_key": "router:token:{token}:route:{route}:n8n_url"
}
```

#### `FlowEvent` (historique)
```json
{
  "id": "1774893403548-0",
  "stream": "ingress:global",
  "token": "sabiana_45e8eee1f44bce8200686377",
  "client_id": "sabiana",
  "route": "facture",
  "subclient_id": "",
  "body": { "ref": "FAC-2026-001", "montant": 1500 },
  "received_at": "ISO8601",
  "delivered_at": "ISO8601 | null",
  "status": "delivered | pending | error | dropped"
}
```

#### `Client` (commercial)
```json
{
  "id": "uuid",
  "name": "Sabiana SAS",
  "slug": "sabiana",
  "plan": "starter | pro | enterprise",
  "max_flows": 5,
  "max_messages_per_month": 10000,
  "active": true,
  "contacts": [{ "email": "it@sabiana.fr", "role": "admin" }],
  "created_at": "ISO8601",
  "billing": {
    "messages_this_month": 43,
    "last_reset": "2026-03-01"
  }
}
```

---

## 3. API REST — Endpoints

Base URL : `https://ultimate.edicloud.app/api/v1`
Auth : `Bearer {token}` ou `Basic {base64}`

---

### 3.1 Flows

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/flows` | Liste tous les flux |
| `POST` | `/flows` | Créer un flux |
| `GET` | `/flows/:id` | Détail d'un flux |
| `PUT` | `/flows/:id` | Modifier un flux |
| `DELETE` | `/flows/:id` | Supprimer un flux |
| `POST` | `/flows/:id/enable` | Activer |
| `POST` | `/flows/:id/disable` | Désactiver |
| `GET` | `/flows/:id/stats` | Statistiques du flux |
| `GET` | `/flows/:id/events` | Historique des messages |

**Créer un flux — `POST /flows`**
```json
{
  "name": "Flux Factures Sabiana",
  "client_id": "sabiana",
  "input": {
    "type": "webhook",
    "stream": "ingress:global",
    "auth_type": "none"
  },
  "output": {
    "type": "n8n",
    "url": "http://192.168.1.115:5678/webhook/3877fd6e-..."
  },
  "mapping_id": null,
  "connector_id": null
}
```

**Réponse `201`**
```json
{
  "ok": true,
  "flow": {
    "id": "flow_abc123",
    "token": "sabiana_45e8eee1f44bce8200686377",
    "webhook_url": "https://gate.edicloud.app/webhook?token=sabiana_45e8eee1f44bce8200686377"
  }
}
```

---

### 3.2 Tokens

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/tokens` | Liste tous les tokens |
| `POST` | `/tokens` | Générer un token |
| `DELETE` | `/tokens/:token` | Révoquer un token |
| `POST` | `/tokens/:token/enable` | Activer |
| `POST` | `/tokens/:token/disable` | Désactiver |
| `GET` | `/tokens/:token/test` | Tester la connectivité |

**Générer un token — `POST /tokens`**
```json
{
  "flow_id": "flow_abc123",
  "client_id": "sabiana",
  "stream": "ingress:global",
  "n8n_url": "http://192.168.1.115:5678/webhook/...",
  "auth_type": "none"
}
```

---

### 3.3 Routes (routage par type de document)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/routes?token=:token` | Routes d'un token |
| `POST` | `/routes` | Créer une route |
| `DELETE` | `/routes/:id` | Supprimer une route |

**Créer une route — `POST /routes`**
```json
{
  "token": "sabiana_45e8eee1f44bce8200686377",
  "route": "facture",
  "subclient_id": null,
  "destination_url": "http://192.168.1.115:5678/webhook/factures/..."
}
```

**Priorité de routage (Benthos worker) :**
```
1. token + subclient + route  →  router:token:{t}:subclient:{s}:route:{r}:n8n_url
2. token + route              →  router:token:{t}:route:{r}:n8n_url
3. token + subclient          →  router:token:{t}:subclient:{s}:n8n_url
4. token (défaut)             →  router:token:{t}:n8n_url
```

---

### 3.4 Queue & Monitoring

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/queue/streams` | Liste des streams Redis actifs |
| `GET` | `/queue/:stream` | État d'un stream (lag, pending, consumers) |
| `GET` | `/queue/:stream/events` | Derniers messages du stream |
| `POST` | `/queue/:stream/purge` | Vider un stream (admin) |
| `GET` | `/monitoring/health` | Santé globale du gateway |

**Réponse `GET /queue/:stream`**
```json
{
  "stream": "ingress:global",
  "exists": true,
  "len": 43,
  "consumer_group": "gate-workers",
  "lag": 0,
  "pending": 0,
  "entries_read": 43,
  "last_delivered_id": "1774894080123-0",
  "consumers": [
    {
      "name": "worker-1",
      "pending": 0,
      "idle_ms": 1233,
      "inactive_ms": 202332
    }
  ]
}
```

---

### 3.5 Clients (Commercial)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/clients` | Liste des clients |
| `POST` | `/clients` | Créer un client |
| `GET` | `/clients/:id` | Détail client |
| `PUT` | `/clients/:id` | Modifier |
| `GET` | `/clients/:id/flows` | Flux du client |
| `GET` | `/clients/:id/usage` | Consommation du mois |
| `GET` | `/clients/:id/invoice` | Générer une facture |

**Créer un client — `POST /clients`**
```json
{
  "name": "Sabiana SAS",
  "slug": "sabiana",
  "plan": "pro",
  "contacts": [{ "email": "it@sabiana.fr", "role": "admin" }],
  "max_flows": 10,
  "max_messages_per_month": 50000
}
```

---

### 3.6 Historique & Traçabilité

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/events` | Tous les événements (filtrable) |
| `GET` | `/events/:id` | Détail d'un événement |
| `POST` | `/events/:id/retry` | Rejouer un message échoué |
| `GET` | `/events/export` | Export CSV/JSON |

**`GET /events` — Paramètres de filtre**
```
?token=sabiana_xxx
?stream=ingress:global
?status=error
?from=2026-03-01&to=2026-03-31
?route=facture
?client_id=sabiana
?limit=100&offset=0
```

---

## 4. Intégration Gateway (gate.edicloud.app)

### 4.1 Flux entrant (Ingress)

```
Client HTTP POST
  └─▶ https://gate.edicloud.app/webhook?token={TOKEN}
        └─▶ Nginx (extrait X-Gate-Token du query param)
              └─▶ Benthos Ingress :4196
                    └─▶ Validation token → Redis
                    └─▶ Push → Redis Stream (ingress:global ou ingress:toyo)
                          └─▶ Benthos Worker
                                └─▶ Lua script → lookup n8n_url (4 niveaux)
                                └─▶ POST → destination (n8n / Dolibarr / Docoon)
```

### 4.2 Convention d'URL entrante

| Type | URL Pattern | Usage |
|------|------------|-------|
| Webhook | `gate.edicloud.app/webhook?token={TOKEN}` | API générique |
| HTTP source | `gate.edicloud.app/http/{source}/{doc_type}` | Route par source |
| AS2 | `gate.edicloud.app/as2/{partenaire}` | EDI AS2 |
| SFTP | `gate.edicloud.app/sftp/{client}` | Dépôt fichier |
| Hook produit | `gate.edicloud.app/hook/{produit}` | Docoon, Taskit, QuickEDI |

### 4.3 Synchronisation Redis

Le module Flow écrit dans Redis (`gate-router-redis` sur `192.168.1.114:6379`) :

| Clé Redis | Valeur | Description |
|-----------|--------|-------------|
| `router:tokens` | SET | Ensemble des tokens actifs |
| `router:token:{t}:enabled` | `1` / `0` | Statut actif |
| `router:token:{t}:client_id` | string | Identifiant client |
| `router:token:{t}:stream` | `ingress:global` | Stream cible |
| `router:token:{t}:n8n_url` | URL interne | Destination défaut |
| `router:token:{t}:auth_type` | `none` / `bearer` | Auth |
| `router:token:{t}:route:{r}:n8n_url` | URL | Override par route |
| `router:token:{t}:subclient:{s}:route:{r}:n8n_url` | URL | Override fin |

> ⚠️ **Important** : Toujours utiliser l'URL interne (`http://192.168.1.11X:5678/webhook/...`) et non l'URL publique, car le worker Benthos est sur le réseau interne `192.168.1.114` et ne peut pas résoudre l'IP publique en hairpin.

---

## 5. Interface d'administration

### 5.1 Écrans principaux

| Écran | Route | Description |
|-------|-------|-------------|
| Dashboard | `/admin` | Vue globale : flux actifs, messages/h, erreurs |
| Flux | `/admin/flows` | Liste et création des flux |
| Tokens | `/admin/tokens` | Gestion des tokens d'accès |
| Routes | `/admin/routes` | Surcharges de routage par document |
| Queue | `/admin/queue` | État Redis temps réel |
| Clients | `/admin/clients` | Gestion commerciale |
| Historique | `/admin/events` | Log des messages |
| Monitoring | `/admin/monitoring` | Santé des workers Benthos |

### 5.2 Dashboard — KPIs affichés

- Flux actifs / total
- Messages traités (24h, 7j, 30j)
- Taux d'erreur (%)
- Lag Redis (par stream)
- Workers Benthos actifs
- Clients actifs
- Messages pending

### 5.3 Permissions

| Rôle | Droits |
|------|--------|
| `super_admin` | Accès total + gestion infra |
| `admin` | CRUD flows, tokens, clients |
| `support` | Lecture + retry messages |
| `client` | Lecture de ses propres flux uniquement |

---

## 6. Interface commerciale

### 6.1 Gestion clients

- Création/modification client avec plan tarifaire
- Attribution automatique d'un slug (utilisé dans les tokens)
- Limite de flux et de messages configurables par plan
- Contacts multiples avec rôles

### 6.2 Plans tarifaires suggérés

| Plan | Flux max | Msg/mois | Routes | Support |
|------|----------|----------|--------|---------|
| Starter | 2 | 5 000 | 5 | Email |
| Pro | 10 | 50 000 | 50 | Email + Chat |
| Enterprise | Illimité | Illimité | Illimité | Dédié |

### 6.3 Comptage et facturation

- Compteur de messages incrémenté à chaque entrée dans Redis Stream
- Reset automatique le 1er du mois
- Export CSV consommation pour facturation externe
- Endpoint `GET /clients/:id/invoice?month=2026-03` pour générer une vue facturation

### 6.4 Alertes automatiques

- Alerte email/Slack à 80% du quota mensuel
- Alerte si token inactif depuis > 7 jours
- Alerte si lag Redis > 100 messages
- Alerte si taux d'erreur > 5% sur 1h

---

## 7. Produits ANEXYS — Intégrations spécifiques

| Produit | Webhook entrant | Destination sortante |
|---------|----------------|---------------------|
| **Docoon** | `gate.edicloud.app/hook/docoon` | Dolibarr API |
| **Quick EDI** | `gate.edicloud.app/hook/quickedi` | n8n + Dolibarr |
| **Taskit** | `gate.edicloud.app/hook/taskit` | n8n |
| **iSales** | `gate.edicloud.app/http/isales/{type}` | CRM / ERP |

### Mapping des routes par produit

```yaml
# Docoon → types de documents EDI
routes:
  - route: facture      → n8n: /webhook/docoon/facture
  - route: avoir        → n8n: /webhook/docoon/avoir
  - route: commande     → n8n: /webhook/docoon/commande

# Quick EDI → partenaires
routes:
  - subclient: toyo     → stream: ingress:toyo
  - subclient: butagaz  → n8n: /webhook/quickedi/butagaz
```

---

## 8. Sécurité

### 8.1 Authentification des webhooks entrants

| Type | Mécanisme | Config Redis |
|------|-----------|-------------|
| `none` | Token dans URL suffit | `auth_type=none` |
| `bearer` | Header `Authorization: Bearer {val}` | `auth_type=bearer`, `auth_value={val}` |
| `hmac` | Signature HMAC-SHA256 du body | `auth_type=hmac`, `auth_secret={secret}` |

### 8.2 Sécurité interne

- Redis accessible uniquement sur le réseau interne `192.168.1.0/24`
- Les workers Benthos utilisent toujours les URLs internes (pas de sortie sur IP publique)
- Rotation des tokens via l'API (révocation + re-génération sans interruption)
- Logs d'audit de toutes les actions admin

---

## 9. Dead Letter Queue (DLQ)

Les messages échoués après 6 tentatives sont écrits dans `/var/dlq/` (JSON).

### Structure fichier DLQ

```json
{
  "message_id": "1774893403548-0",
  "token": "sabiana_45e8eee1f44bce8200686377",
  "stream": "ingress:global",
  "route": "facture",
  "body": { "ref": "FAC-001" },
  "error": "HTTP 404: webhook not registered",
  "attempts": 6,
  "first_attempt": "2026-03-30T17:56:56Z",
  "last_attempt": "2026-03-30T18:02:00Z"
}
```

### API DLQ

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/dlq` | Liste des messages en DLQ |
| `GET` | `/dlq/:id` | Détail |
| `POST` | `/dlq/:id/retry` | Rejouer manuellement |
| `DELETE` | `/dlq/:id` | Supprimer définitivement |

---

## 10. Séquence de création d'un flux (UX Flow)

```
1. Admin crée le Client          →  POST /clients
2. Admin crée le Flow            →  POST /flows
   └─ Le système génère le token automatiquement
   └─ Écrit dans Redis (gate-router-redis)
3. Admin configure les Routes    →  POST /routes (optionnel)
4. Client reçoit :
   └─ Token d'accès
   └─ Webhook URL : https://gate.edicloud.app/webhook?token={TOKEN}
5. Client envoie son premier message
6. Admin vérifie dans Queue/Events que le message est passé
7. Activation → POST /flows/:id/enable
```

---

## 11. Variables d'environnement — Services

### gate-admin (proxy :100)
```env
PORT=8088
ADMIN_USER=admin
ADMIN_PASS=***
REDIS_URL=redis://192.168.1.114:6379   # gate-router-redis sur Benthos VM
```

### Benthos Ingress (VM :114)
```env
# ingress.yaml → redis://host.docker.internal:6379
# Lit les tokens depuis gate-router-redis
```

### Benthos Worker (VM :114)
```env
WORKER_NAME=worker-1
# worker.yaml → redis://host.docker.internal:6379
# Lua script lookup 4 niveaux de priorité
```

---

## 12. Checklist d'intégration

- [ ] API Flow CRUD connectée à Redis (`gate-router-redis` sur `192.168.1.114`)
- [ ] Synchronisation bi-directionnelle : Ultimate ↔ Redis clés `router:token:*`
- [ ] Endpoint `/ready` et `/health` exposés
- [ ] Compteur de messages en temps réel (incrément sur push Redis)
- [ ] Alertes quota (80% + dépassement)
- [ ] Interface DLQ avec retry manuel
- [ ] Export historique CSV
- [ ] Rôles et permissions (admin / support / client)
- [ ] Rotation token sans interruption de flux
- [ ] Tests webhook intégrés (bouton "Tester" depuis l'UI)
- [ ] Webhooks n8n → URL interne `http://192.168.1.11X:5678` (pas URL publique)

---

## 13. Module CSV Marketplace (ingestion fichiers + mapping + livraison)

### 13.1 Objectif

Permettre de recevoir des fichiers métier depuis la Marketplace (CSV, JSON, TXT, XML, EDI brut), de les rattacher automatiquement au bon client via token, de parser selon un profil configurable, puis de mapper vers le format attendu par le connecteur de destination avant livraison.

### 13.2 Pipeline cible

```
Source (Webhook/AS2/Mail/FTP/SFTP/FTPS/API)
  └─▶ Authentification token + identification client
        └─▶ Détection type fichier + métadonnées
              └─▶ Parsing (encodage/header/séparateur/taille/tests premières lignes)
                    └─▶ Normalisation (dataset canonique)
                          └─▶ Mapping (vers schéma connecteur destination)
                                └─▶ Delivery (API/Webhook/FTP/SFTP/FTPS/AS2/Mail)
                                      └─▶ Traçabilité + DLQ
```

### 13.3 Règle de tri client

Le tri d'un fichier entrant se fait en priorité :

1. `token` (obligatoire) -> lien unique vers `flow_id` et `client_id`
2. Contrôle de cohérence `client_name`/`client_slug` (si fourni dans header/body/nom de fichier)
3. En cas d'ambiguité -> message en `pending_manual_review`

Clés Redis suggérées :

- `router:token:{t}:client_id`
- `router:token:{t}:client_slug`
- `router:token:{t}:flow_id`
- `router:token:{t}:parser_profile_id`
- `router:token:{t}:mapping_id`
- `router:token:{t}:destination_profile_id`

### 13.4 Modèle de configuration (nouveaux objets)

#### `FlowInputProfile`
```json
{
  "id": "uuid",
  "flow_id": "uuid",
  "source_type": "webhook | ftp | sftp | ftps | as2 | mail | api",
  "accepted_formats": ["csv", "json", "txt", "xml", "edi"],
  "max_file_size_mb": 25,
  "filename_pattern": ".*",
  "auth": {
    "token_required": true,
    "auth_type": "none | bearer | hmac"
  }
}
```

#### `FlowParserProfile`
```json
{
  "id": "uuid",
  "flow_id": "uuid",
  "format": "csv | json | txt | xml | edi",
  "encoding": "utf-8 | iso-8859-1 | windows-1252 | auto",
  "csv": {
    "delimiter": ", | ; | \\t | auto",
    "quote_char": "\"",
    "escape_char": "\\\\",
    "header": true,
    "skip_lines": 0
  },
  "txt": {
    "line_break": "lf | crlf | auto",
    "fixed_width": false
  },
  "sample": {
    "enabled": true,
    "sample_lines": 20,
    "validation_rules": [
      { "field": "invoice_number", "required": true },
      { "field": "amount", "type": "number" }
    ]
  }
}
```

#### `FlowDestinationProfile`
```json
{
  "id": "uuid",
  "flow_id": "uuid",
  "delivery_type": "connector_api | webhook | ftp | sftp | ftps | as2 | mail",
  "retry_policy": { "max_attempts": 6, "backoff": "exponential" },
  "connector_api": { "connector_id": "uuid", "operation": "createInvoice" },
  "webhook": { "url": "https://target/webhook", "method": "POST" },
  "ftp": { "host": "ftp.example.com", "port": 21, "path": "/in", "passive": true },
  "sftp": { "host": "sftp.example.com", "port": 22, "path": "/in", "private_key_ref": "vault://..." },
  "ftps": { "host": "ftps.example.com", "port": 990, "path": "/in", "implicit_tls": true },
  "as2": { "partner_id": "PARTNER_A", "as2_url": "https://as2.partner/as2" },
  "mail": { "to": ["edi@partner.com"], "subject_template": "Flux {{client}} - {{date}}" }
}
```

### 13.5 Tests de parsing (pré-validation)

Avant activation d'un flux fichier, exécuter un test sur les premières lignes :

- Détection encodage (`auto` si activé)
- Détection séparateur CSV (virgule/point-virgule/tabulation)
- Validation présence header attendu
- Contrôle taille fichier (`max_file_size_mb`)
- Validation schéma minimal (champs obligatoires)
- Aperçu utilisateur (20 premières lignes transformées en JSON canonique)

Statuts possibles :

- `parser_ok`
- `parser_warning` (ex: encodage fallback)
- `parser_error` (flux bloqué tant que non corrigé)

### 13.6 API REST à prévoir

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/flows/:id/input-profile` | Créer/mettre à jour le profil d'entrée |
| `POST` | `/flows/:id/parser-profile` | Créer/mettre à jour le profil parser |
| `POST` | `/flows/:id/destination-profile` | Créer/mettre à jour la destination |
| `POST` | `/flows/:id/parser/test` | Tester parsing sur un fichier échantillon |
| `POST` | `/flows/:id/ingest` | Endpoint universel d'ingestion fichier |
| `GET` | `/flows/:id/files` | Historique fichiers reçus |
| `GET` | `/files/:file_id/preview` | Prévisualisation normalisée |
| `POST` | `/files/:file_id/replay` | Rejouer un fichier |

### 13.7 Enchaînement avec Mapping

Après parsing, le moteur doit produire un objet canonique tabulaire/document :

- `records[]` normalisés
- `metadata` (encoding, delimiter, headers_detected, line_count, file_hash)
- `routing_context` (token, client_id, flow_id, source_type)

Le module Mapping s'appuie ensuite sur `mapping_id` du flow pour :

- Mapper les champs sources vers les champs du connecteur cible
- Appliquer les transformations (date, devise, normalisation montants)
- Produire un payload final compatible destination

### 13.8 Destinations à couvrir (MVP + extension)

MVP recommandé :

- `connector_api`
- `webhook`
- `sftp`

Extension v2 :

- `ftp`
- `ftps`
- `as2`
- `mail`

### 13.9 UX configuration Flow (assistant en 6 étapes)

1. Sélection client + génération token
2. Choix source (`webhook`, `ftp`, `sftp`, `ftps`, `as2`, `mail`, `api`)
3. Upload fichier de test
4. Paramétrage parser (encodage, header, séparateur, règles)
5. Sélection mapping + connecteur cible
6. Choix destination + test de livraison

### 13.10 Checklist d'implémentation technique

- [ ] Ajouter entités `FlowInputProfile`, `FlowParserProfile`, `FlowDestinationProfile`, `FlowFile`
- [ ] Stocker empreinte fichier (`sha256`) pour idempotence
- [ ] Implémenter `parser/test` avec preview premières lignes
- [ ] Ajouter UI de configuration parser (CSV/JSON/TXT)
- [ ] Créer adaptateurs livraison `webhook`, `ftp`, `sftp`, `ftps`, `as2`, `mail`
- [ ] Brancher sortie parser vers module Mapping existant
- [ ] Ajouter observabilité par fichier (received -> parsed -> mapped -> delivered)
- [ ] Support replay fichier et DLQ fichier
