# ANEXYS iPaaS — Spécifications complètes pour agents Cursor

> Cahier des charges technique complet. Les agents Cursor doivent lire ce fichier en entier avant de commencer.

---

## INSTRUCTIONS POUR CURSOR

Tu es un agent de développement senior full-stack. Tu vas construire une plateforme iPaaS (Integration Platform as a Service) multi-tenant de A à Z, appelée ANEXYS iPaaS.

**Règles absolues :**
- TypeScript strict partout, jamais de `any`
- Tests unitaires Jest obligatoires avec chaque module
- Commentaires en français sur les fonctions métier complexes
- Respecter l'architecture définie ci-dessous sans dévier
- Jamais de credentials en clair — toujours chiffré AES-256-GCM via VaultService
- Chaque module doit être indépendant et testable isolément
- Utiliser les versions exactes des packages indiquées

---

## 1. STACK TECHNIQUE OBLIGATOIRE

### Backend
```
Runtime         : Node.js 20 LTS
Framework       : NestJS 10
Langage         : TypeScript 5.3 (strict mode)
ORM             : Prisma 5
Base de données : PostgreSQL 16
Queue           : BullMQ 5 + Redis 7
Auth            : JWT (access 15min + refresh 7j, httpOnly cookie)
Chiffrement     : AES-256-GCM (secrets), bcrypt (passwords)
Validation      : class-validator + class-transformer
Docs API        : Swagger / OpenAPI auto-généré (@nestjs/swagger)
Tests           : Jest + Supertest
Logs            : Winston + Loki
File watching   : chokidar 3
```

### Frontend
```
Framework       : React 18 + Vite 5
Langage         : TypeScript 5.3
Styles          : TailwindCSS 3
State           : Zustand 4
Requêtes        : TanStack Query v5
Mapping visuel  : React Flow 11
Formulaires     : React Hook Form + Zod
Graphiques      : Recharts
Notifications   : Sonner
Tests           : Vitest + React Testing Library
```

### Agent Desktop (Windows / macOS)
```
Runtime         : Node.js 20 LTS
Compilation     : pkg (binaire standalone)
Langage         : TypeScript 5.3
WebSocket       : ws 8 (avec reconnexion auto)
File watcher    : chokidar 3
Windows Service : node-windows
macOS Daemon    : node-mac
Config locale   : conf 12 (chiffré)
Logs            : winston (rotation 10MB)
```

### Infrastructure
```
Conteneurs      : Docker + Docker Compose v2
Reverse Proxy   : Nginx (SSL, routing sous-domaine par tenant)
Monitoring      : Grafana + Loki + Prometheus
Secrets         : Variables d'environnement + AES-256 en DB
```

---

## 2. STRUCTURE DU MONOREPO

```
anexys-ipaas/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── tenants/
│   │   │   │   ├── users/
│   │   │   │   ├── groups/
│   │   │   │   ├── connectors/
│   │   │   │   ├── flows/
│   │   │   │   ├── mappings/
│   │   │   │   ├── engine/
│   │   │   │   ├── workers/
│   │   │   │   ├── edifact/
│   │   │   │   ├── billing/
│   │   │   │   ├── marketplace/
│   │   │   │   ├── notifications/
│   │   │   │   ├── audit/
│   │   │   │   ├── vault/
│   │   │   │   └── agents/
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── decorators/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── filters/
│   │   │   │   └── pipes/
│   │   │   └── prisma/
│   │   │       ├── schema.prisma
│   │   │       └── tenant.prisma
│   │   └── test/
│   │
│   ├── frontend/
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── auth/
│   │       │   ├── dashboard/
│   │       │   ├── marketplace/
│   │       │   ├── flows/
│   │       │   ├── mapping/
│   │       │   ├── connectors/
│   │       │   ├── billing/
│   │       │   ├── users/
│   │       │   └── settings/
│   │       ├── components/
│   │       │   ├── mapping/
│   │       │   ├── flow/
│   │       │   ├── connector/
│   │       │   └── ui/
│   │       ├── stores/
│   │       ├── hooks/
│   │       ├── api/
│   │       └── types/
│   │
│   └── agent/
│       ├── src/
│       │   ├── main.ts
│       │   ├── watcher.ts
│       │   ├── uploader.ts
│       │   ├── downloader.ts
│       │   ├── websocket.ts
│       │   ├── config.ts
│       │   └── service/
│       │       ├── windows.ts
│       │       └── macos.ts
│       └── installer/
│           ├── windows/
│           └── macos/
│
├── connectors/
│   ├── sellsy/
│   │   ├── openapi.json
│   │   └── auth.config.json
│   ├── ebp/
│   │   ├── openapi.json
│   │   └── auth.config.json
│   ├── dolibarr/
│   │   ├── openapi.json
│   │   └── auth.config.json
│   ├── prestashop/
│   │   ├── openapi.json
│   │   └── auth.config.json
│   ├── woocommerce/
│   │   ├── openapi.json
│   │   └── auth.config.json
│   └── ftp-sftp/
│       ├── openapi.json
│       └── auth.config.json
│
├── packages/
│   ├── shared-types/
│   ├── edifact/
│   └── mapping-engine/
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── nginx/nginx.conf
│
└── .cursor/
    └── rules
```

---

## 3. SCHÉMAS PRISMA

### Master DB — `schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/master"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id               String           @id @default(uuid())
  slug             String           @unique
  name             String
  dbName           String           @unique
  dbConnectionHash String
  plan             Plan             @default(FREE)
  isActive         Boolean          @default(true)
  stripeCustomerId String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  users            User[]
  usageMetrics     UsageMetric[]
  billingInvoices  BillingInvoice[]
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

model User {
  id            String         @id @default(uuid())
  tenantId      String
  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  email         String
  passwordHash  String
  firstName     String
  lastName      String
  role          Role           @default(VIEWER)
  isActive      Boolean        @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime       @default(now())
  userGroups    UserGroup[]
  refreshTokens RefreshToken[]

  @@unique([tenantId, email])
}

enum Role {
  SUPER_ADMIN
  ADMIN
  OPERATOR
  VIEWER
}

model Group {
  id          String            @id @default(uuid())
  tenantId    String
  name        String
  description String?
  createdAt   DateTime          @default(now())
  userGroups  UserGroup[]
  permissions GroupPermission[]
}

model GroupPermission {
  id           String  @id @default(uuid())
  groupId      String
  group        Group   @relation(fields: [groupId], references: [id])
  resourceType String  // flow | connector | mapping | report
  resourceId   String? // NULL = tous
  action       String  // read | write | execute | delete
}

model UserGroup {
  userId  String
  groupId String
  user    User   @relation(fields: [userId], references: [id])
  group   Group  @relation(fields: [groupId], references: [id])

  @@id([userId, groupId])
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model UsageMetric {
  id               String   @id @default(uuid())
  tenantId         String
  tenant           Tenant   @relation(fields: [tenantId], references: [id])
  periodStart      DateTime
  periodEnd        DateTime
  flowsExecuted    Int      @default(0)
  recordsProcessed BigInt   @default(0)
  apiCallsMade     Int      @default(0)
  updatedAt        DateTime @updatedAt

  @@unique([tenantId, periodStart])
}

model BillingInvoice {
  id              String        @id @default(uuid())
  tenantId        String
  tenant          Tenant        @relation(fields: [tenantId], references: [id])
  stripeInvoiceId String?
  periodStart     DateTime
  periodEnd       DateTime
  plan            Plan
  baseAmount      Decimal       @db.Decimal(10, 2)
  usageAmount     Decimal       @db.Decimal(10, 2)
  totalAmount     Decimal       @db.Decimal(10, 2)
  status          InvoiceStatus @default(DRAFT)
  paidAt          DateTime?
  createdAt       DateTime      @default(now())
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  FAILED
}

model AuditLog {
  id         String   @id @default(uuid())
  tenantId   String
  userId     String?
  action     String
  resource   String
  resourceId String?
  before     Json?
  after      Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
}
```

### Tenant DB — `tenant.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/tenant"
}

datasource db {
  provider = "postgresql"
  url      = env("TENANT_DATABASE_URL")
}

model Connector {
  id           String            @id @default(uuid())
  type         String
  name         String
  configHash   String
  isActive     Boolean           @default(true)
  lastTestedAt DateTime?
  lastTestOk   Boolean?
  createdAt    DateTime          @default(now())
  flows        Flow[]            @relation("SourceConnector")
  destinations FlowDestination[]
}

model Flow {
  id                String        @id @default(uuid())
  name              String
  description       String?
  sourceConnectorId String
  sourceConnector   Connector     @relation("SourceConnector", fields: [sourceConnectorId], references: [id])
  triggerType       TriggerType
  triggerConfig     Json
  environment       Environment   @default(STAGING)
  isActive          Boolean       @default(false)
  version           Int           @default(1)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  destinations      FlowDestination[]
  executions        FlowExecution[]
  versions          FlowVersion[]
}

enum TriggerType {
  CRON
  WEBHOOK
  MANUAL
  FILE_WATCH
  AGENT_WATCH
}

enum Environment {
  STAGING
  PRODUCTION
}

model FlowVersion {
  id        String   @id @default(uuid())
  flowId    String
  flow      Flow     @relation(fields: [flowId], references: [id])
  version   Int
  snapshot  Json
  createdAt DateTime @default(now())
}

model FlowDestination {
  id          String    @id @default(uuid())
  flowId      String
  flow        Flow      @relation(fields: [flowId], references: [id])
  connectorId String
  connector   Connector @relation(fields: [connectorId], references: [id])
  mappingId   String?
  mapping     Mapping?  @relation(fields: [mappingId], references: [id])
  orderIndex  Int       @default(0)
  isActive    Boolean   @default(true)
}

model Mapping {
  id                String            @id @default(uuid())
  name              String
  sourceSchema      Json
  destinationSchema Json
  rules             Json
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  destinations      FlowDestination[]
  lookupTables      LookupTable[]
}

model LookupTable {
  id        String   @id @default(uuid())
  mappingId String
  mapping   Mapping  @relation(fields: [mappingId], references: [id])
  name      String
  data      Json
  createdAt DateTime @default(now())
}

model FlowExecution {
  id            String          @id @default(uuid())
  flowId        String
  flow          Flow            @relation(fields: [flowId], references: [id])
  environment   Environment
  status        ExecutionStatus @default(PENDING)
  triggerSource String
  isDryRun      Boolean         @default(false)
  startedAt     DateTime        @default(now())
  finishedAt    DateTime?
  recordsIn     Int             @default(0)
  recordsOut    Int             @default(0)
  recordsFailed Int             @default(0)
  errorMessage  String?
  logs          ExecutionLog[]
}

enum ExecutionStatus {
  PENDING
  RUNNING
  SUCCESS
  PARTIAL
  FAILED
  DRY_RUN_OK
}

model ExecutionLog {
  id          String        @id @default(uuid())
  executionId String
  execution   FlowExecution @relation(fields: [executionId], references: [id])
  level       LogLevel
  message     String
  recordIndex Int?
  data        Json?
  createdAt   DateTime      @default(now())
}

enum LogLevel {
  INFO
  WARN
  ERROR
}

model AgentToken {
  id         String    @id @default(uuid())
  name       String
  tokenHash  String    @unique
  watchPaths Json
  isActive   Boolean   @default(true)
  lastSeenAt DateTime?
  createdAt  DateTime  @default(now())
}
```

---

## 4. MODULES NESTJS

### 4.1 Auth
- `POST /api/v1/auth/login` → access_token (15min) + refresh_token (7j, httpOnly)
- `POST /api/v1/auth/refresh` → renouvelle access_token
- `POST /api/v1/auth/logout` → révoque refresh_token
- `TenantGuard` : extrait tenantId du JWT, injecte le bon PrismaClient tenant
- `RolesGuard` : vérifie Role ET GroupPermission (resource + action)
- `@CurrentUser()` : décorateur injectant le user courant
- `@CurrentTenant()` : décorateur injectant le tenant courant
- `@Roles(Role.ADMIN)` : décorateur restriction par rôle

### 4.2 Tenants
- `POST /api/v1/tenants` — Super Admin uniquement
  - Créer la DB PostgreSQL `db_{slug}`
  - Appliquer les migrations Prisma tenant automatiquement
  - Chiffrer la connection string via VaultService
- `GET /api/v1/tenants` — Super Admin
- `PATCH /api/v1/tenants/:id`
- `TenantDatabaseService` : Map<tenantId, PrismaClient> — pool de connexions dynamique

### 4.3 Connectors + ConnectorRegistry
- Au démarrage : scanner `CONNECTORS_PATH/**/*.openapi.json`
- chokidar watch : hot-reload si fichier modifié ou ajouté
- Stocker les définitions parsées en mémoire (Map) + en DB
- `GET /api/v1/marketplace` → tous connecteurs disponibles
- `GET /api/v1/marketplace/:type` → détail + opérations
- `GET /api/v1/connectors` → connecteurs configurés du tenant
- `POST /api/v1/connectors` → chiffrer config via VaultService
- `POST /api/v1/connectors/:id/test` → tester la connexion réelle
- `PATCH /api/v1/connectors/:id`
- `DELETE /api/v1/connectors/:id`

### 4.4 Flow Engine (cœur)
Pipeline : **EXTRACT → TRANSFORM → FAN-OUT → LOAD → LOG**

**EXTRACT (streaming obligatoire)**
- Ne jamais charger un fichier complet en mémoire
- CSV : `csv-parse` en mode streaming, chunks de 500 lignes max
- API paginée : itération automatique (cursor ou offset selon openapi.json)
- Retourner un `Readable` Node.js

**TRANSFORM**
- Appliquer les règles de mapping sur chaque record
- Types de règles : `from` (copie), `formula` (expression), `value` (constante), `lookup` (table)
- Fonctions disponibles : `UPPER`, `LOWER`, `CONCAT`, `IF`, `DATE_FORMAT`, `REPLACE`, `TRIM`, `SPLIT`, `LOOKUP`
- Erreur sur un record → logger + continuer (ne pas tout arrêter)
- Mode `isDryRun` → transformer mais ne pas écrire

**FAN-OUT**
- `Promise.allSettled` vers N destinations en parallèle
- Logger succès/échec par destination indépendamment

**LOAD**
- Écrire via l'adaptateur du connecteur destination
- Retry : 3 tentatives, backoff exponentiel (1s, 3s, 9s)
- Dead Letter Queue pour records définitivement en échec

**Jobs BullMQ**
- Un job par FlowExecution
- Max 5 jobs simultanés par tenant
- CRON : BullMQ Scheduler
- Webhook : `POST /api/v1/webhooks/:tenantSlug/:flowId` → crée job immédiat

### 4.5 EDIFACT
Messages V1 : `ORDERS`, `INVOIC`, `DESADV`, `PRICAT`, `RECADV`

```
EdifactParser.parse(raw: string): EdifactDocument
EdifactGenerator.generate(type: MessageType, data: object): string
EdifactValidator.validate(doc: EdifactDocument): ValidationResult
```

Mapping interne :
- `ORDERS` → `{ orderId, buyerCode, orderDate, lines: [{ean, qty, unitPrice}] }`
- `INVOIC` → `{ invoiceId, invoiceDate, dueDate, lines: [{ref, qty, price, vat}] }`
- `DESADV` → `{ shipmentId, deliveryDate, lines: [{ean, qty}] }`
- `PRICAT` → `{ products: [{ean, ref, label, price, minQty}] }`
- `RECADV` → `{ receiptId, lines: [{ean, qtyReceived, qtyDamaged}] }`

Réception :
- `POST /api/v1/edifact/as2/receive` → AS2
- SFTP polling configurable

### 4.6 Billing
Plans et quotas :
| Plan | Flux/mois | Records/mois | Connecteurs |
|------|-----------|--------------|-------------|
| FREE | 50 | 10 000 | 2 max |
| PRO | 500 | 500 000 | Tous |
| ENTERPRISE | ∞ | ∞ | Tous |

Dépassement : +0,50€/1 000 records, +2€/10 flux

Stripe :
- Créer customer Stripe à création tenant
- CRON fin de mois → calculer usage → `stripe.invoices.create()`
- Stripe Meters pour usage-based billing
- Webhook : `invoice.paid`, `invoice.payment_failed`
- `GET /api/v1/billing/usage`
- `GET /api/v1/billing/invoices`
- `POST /api/v1/billing/subscribe/:plan`
- Alerte email à 80% quota + blocage jobs FREE à 100%

### 4.7 Agent Desktop
**Côté API — AgentGateway (NestJS WebSocket Gateway)**
- Authentifier l'agent via token au handshake WebSocket
- Recevoir fichiers uploadés → déclencher FlowExecution
- Pousser fichiers à télécharger vers l'agent

**Protocole WebSocket (JSON)**

Agent → Serveur :
```json
{ "type": "auth", "token": "..." }
{ "type": "file_start", "filename": "clients.csv", "size": 1024000 }
{ "type": "file_chunk", "chunkIndex": 0, "data": "<base64>" }
{ "type": "file_end", "filename": "clients.csv", "checksum": "sha256:..." }
{ "type": "heartbeat" }
```

Serveur → Agent :
```json
{ "type": "auth_ok", "agentId": "...", "tenantId": "..." }
{ "type": "auth_error", "message": "Token invalide" }
{ "type": "file_receive_start", "filename": "output.csv", "size": 5000 }
{ "type": "file_receive_chunk", "data": "<base64>" }
{ "type": "file_receive_end", "filename": "output.csv" }
{ "type": "ack", "filename": "clients.csv", "executionId": "..." }
```

**Côté agent compilé**
- `chokidar` surveille les dossiers configurés
- Nouveau fichier dans dossier `upload` → envoyer en chunks via WebSocket
- Fichier reçu → écrire dans dossier `download`
- Reconnexion auto WebSocket (backoff exponentiel)
- Fichier envoyé → déplacer dans `sent/`
- Windows : installer comme Windows Service (node-windows)
- macOS : installer comme LaunchDaemon (node-mac)
- Compilation : `pkg` → binaires `agent-win.exe`, `agent-macos`, `agent-linux`

Endpoints REST agents :
- `GET /api/v1/agents` — liste agents du tenant
- `POST /api/v1/agents` — créer token agent
- `DELETE /api/v1/agents/:id` — révoquer

### 4.8 Vault (Secrets)
```typescript
// Chiffrement AES-256-GCM
// Clé : variable env VAULT_KEY (32 bytes hex — jamais en DB)

encrypt(plaintext: string): string          // → base64(iv + authTag + ciphertext)
decrypt(ciphertext: string): string
encryptObject(obj: Record<string, any>): string
decryptObject(ciphertext: string): Record<string, any>

// OAuth2 auto-refresh :
// Avant chaque appel API → vérifier expiration token
// Si expiré → appeler refresh endpoint → mettre à jour tokens chiffrés en DB
```

### 4.9 Audit Log
- Interceptor global loggant toute action mutante (POST/PATCH/DELETE)
- Stocker : userId, tenantId, action, resource, resourceId, before, after, ip, userAgent
- Rétention configurable par tenant (défaut 12 mois)
- `GET /api/v1/audit` → filtrable par date, user, resource

---

## 5. FRONTEND

### MappingEditor (composant clé)
**Mode Drag & Drop (React Flow)**
- Panneau gauche : champs source avec types
- Panneau droit : champs destination (requis/optionnels)
- Connexion par glisser-déposer
- Couleurs : vert = mappé ✅, orange = optionnel ⚠️, rouge = requis manquant ❌
- Clic sur une connexion → ajouter transformation

**Mode Formules**
- Tableau : Champ destination | Type | Formule | Prévisualisation
- Autocomplétion des champs source + fonctions
- Prévisualisation temps réel via `POST /api/v1/mappings/preview` (5 premières lignes)
- Auto-save toutes les 30 secondes

### Flow Builder (wizard 5 étapes)
1. Choisir source (connecteur + opération)
2. Configurer déclencheur (CRON / Webhook / Manuel / Agent)
3. Ajouter destinations (1 à N) + mapping par destination
4. Dry Run → aperçu 10 lignes transformées sans écriture
5. Activer (STAGING ou PRODUCTION)

### Dashboard Tenant
- Flux actifs / total
- Records traités ce mois + barre progression vers quota
- Graphe 7 derniers jours (Recharts LineChart)
- 10 dernières exécutions : Flux | Déclencheur | Env | Début | Durée | Records | Statut
- Filtres : par flux, statut, environnement, date
- Bouton "Relancer" sur exécutions en échec

### Marketplace
- Grille de cards par catégorie : CRM, Facturation, E-commerce, Fichiers, EDI, Desktop
- Badge "Actif" si connecteur déjà configuré
- Page détail : opérations SOURCE + DESTINATION, formulaire config généré depuis `auth.config.json`

---

## 6. FICHIERS CONNECTEURS

### `connectors/sellsy/openapi.json`
```json
{
  "connector_meta": {
    "id": "sellsy",
    "name": "Sellsy",
    "version": "2.0",
    "icon": "sellsy.svg",
    "category": "CRM / Facturation",
    "auth_type": "oauth2",
    "docs_url": "https://api.sellsy.com/doc/v2/"
  },
  "auth_config": {
    "token_url": "https://login.sellsy.com/oauth2/access-tokens",
    "scopes": ["invoices.read", "invoices.write", "contacts.read", "contacts.write", "opportunities.read"]
  },
  "operations": [
    {
      "id": "list_invoices",
      "label": "Récupérer les factures",
      "type": "source",
      "method": "GET",
      "path": "/invoices",
      "pagination": "cursor",
      "pagination_param": "after",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "invoiceNumber": { "type": "string" },
          "status": { "type": "string", "enum": ["draft","sent","paid","cancelled"] },
          "amount": { "type": "number" },
          "currency": { "type": "string" },
          "dueDate": { "type": "string", "format": "date" },
          "clientId": { "type": "string" },
          "clientName": { "type": "string" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    },
    {
      "id": "list_estimates",
      "label": "Récupérer les devis",
      "type": "source",
      "method": "GET",
      "path": "/opportunities",
      "pagination": "cursor",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "reference": { "type": "string" },
          "status": { "type": "string" },
          "amount": { "type": "number" },
          "clientId": { "type": "string" },
          "clientName": { "type": "string" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      }
    },
    {
      "id": "list_contacts",
      "label": "Récupérer les clients/contacts",
      "type": "source",
      "method": "GET",
      "path": "/contacts",
      "pagination": "cursor",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "civility": { "type": "string" },
          "firstName": { "type": "string" },
          "lastName": { "type": "string" },
          "email": { "type": "string" },
          "phone": { "type": "string" },
          "company": { "type": "string" },
          "address": { "type": "string" },
          "city": { "type": "string" },
          "zipCode": { "type": "string" },
          "country": { "type": "string" }
        }
      }
    },
    {
      "id": "create_contact",
      "label": "Créer un contact/client",
      "type": "destination",
      "method": "POST",
      "path": "/contacts",
      "input_schema": {
        "type": "object",
        "required": ["lastName", "email"],
        "properties": {
          "civility": { "type": "string" },
          "firstName": { "type": "string" },
          "lastName": { "type": "string" },
          "email": { "type": "string", "format": "email" },
          "phone": { "type": "string" },
          "company": { "type": "string" },
          "address": { "type": "string" },
          "city": { "type": "string" },
          "zipCode": { "type": "string" },
          "country": { "type": "string" }
        }
      }
    },
    {
      "id": "create_invoice",
      "label": "Créer une facture",
      "type": "destination",
      "method": "POST",
      "path": "/invoices",
      "input_schema": {
        "type": "object",
        "required": ["clientId", "lines"],
        "properties": {
          "clientId": { "type": "string" },
          "dueDate": { "type": "string", "format": "date" },
          "currency": { "type": "string", "default": "EUR" },
          "lines": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "label": { "type": "string" },
                "quantity": { "type": "number" },
                "unitPrice": { "type": "number" },
                "vatRate": { "type": "number" }
              }
            }
          }
        }
      }
    }
  ]
}
```

### `connectors/ebp/openapi.json`
```json
{
  "connector_meta": {
    "id": "ebp",
    "name": "EBP",
    "version": "1.0",
    "icon": "ebp.svg",
    "category": "ERP / Comptabilité",
    "auth_type": "api_key",
    "modes": ["saas_api", "desktop_csv"],
    "docs_url": "https://developer.ebp.com/"
  },
  "auth_config": {
    "api_key_header": "X-API-Key",
    "base_url_param": "base_url"
  },
  "operations": [
    {
      "id": "list_customers",
      "label": "Récupérer les clients",
      "type": "source",
      "method": "GET",
      "path": "/customers",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "code": { "type": "string" },
          "name": { "type": "string" },
          "address1": { "type": "string" },
          "address2": { "type": "string" },
          "zipCode": { "type": "string" },
          "city": { "type": "string" },
          "country": { "type": "string" },
          "email": { "type": "string" },
          "phone": { "type": "string" },
          "vatNumber": { "type": "string" }
        }
      }
    },
    {
      "id": "list_products",
      "label": "Récupérer les articles",
      "type": "source",
      "method": "GET",
      "path": "/items",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "reference": { "type": "string" },
          "label": { "type": "string" },
          "price": { "type": "number" },
          "vatRate": { "type": "number" },
          "stock": { "type": "number" },
          "ean": { "type": "string" }
        }
      }
    },
    {
      "id": "list_invoices",
      "label": "Récupérer les factures",
      "type": "source",
      "method": "GET",
      "path": "/invoices",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "number": { "type": "string" },
          "customerId": { "type": "string" },
          "date": { "type": "string", "format": "date" },
          "dueDate": { "type": "string", "format": "date" },
          "totalHT": { "type": "number" },
          "totalTTC": { "type": "number" },
          "status": { "type": "string" }
        }
      }
    },
    {
      "id": "import_csv_epiece",
      "label": "Importer fichier EPIECE (Desktop)",
      "type": "destination",
      "method": "FILE",
      "file_format": "csv",
      "file_encoding": "windows-1252",
      "file_separator": ";",
      "file_pattern": "EPIECE_{date}.csv",
      "input_schema": {
        "type": "object",
        "required": ["reference", "label", "price"],
        "properties": {
          "reference": { "type": "string", "maxLength": 20 },
          "label": { "type": "string", "maxLength": 60 },
          "price": { "type": "number" },
          "vatRate": { "type": "number" },
          "stock": { "type": "number" },
          "ean": { "type": "string", "maxLength": 13 }
        }
      }
    },
    {
      "id": "import_csv_eligne",
      "label": "Importer fichier ELIGNE (Desktop)",
      "type": "destination",
      "method": "FILE",
      "file_format": "csv",
      "file_encoding": "windows-1252",
      "file_separator": ";",
      "file_pattern": "ELIGNE_{date}.csv",
      "input_schema": {
        "type": "object",
        "required": ["pieceRef", "lineRef", "qty", "unitPrice"],
        "properties": {
          "pieceRef": { "type": "string" },
          "lineRef": { "type": "string" },
          "label": { "type": "string" },
          "qty": { "type": "number" },
          "unitPrice": { "type": "number" },
          "vatRate": { "type": "number" }
        }
      }
    }
  ]
}
```

### `connectors/dolibarr/openapi.json`
```json
{
  "connector_meta": {
    "id": "dolibarr",
    "name": "Dolibarr",
    "version": "1.0",
    "icon": "dolibarr.svg",
    "category": "ERP / CRM",
    "auth_type": "api_key",
    "docs_url": "https://wiki.dolibarr.org/index.php/API"
  },
  "auth_config": {
    "api_key_header": "DOLAPIKEY",
    "base_url_param": "base_url"
  },
  "operations": [
    {
      "id": "list_thirdparties",
      "label": "Récupérer les tiers (clients/fournisseurs)",
      "type": "source",
      "method": "GET",
      "path": "/thirdparties",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "ref": { "type": "string" },
          "name": { "type": "string" },
          "client": { "type": "number", "description": "1=client, 0=non" },
          "fournisseur": { "type": "number" },
          "email": { "type": "string" },
          "phone": { "type": "string" },
          "address": { "type": "string" },
          "zip": { "type": "string" },
          "town": { "type": "string" },
          "country_code": { "type": "string" },
          "tva_intra": { "type": "string" }
        }
      }
    },
    {
      "id": "list_products",
      "label": "Récupérer les produits",
      "type": "source",
      "method": "GET",
      "path": "/products",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "ref": { "type": "string" },
          "label": { "type": "string" },
          "price": { "type": "number" },
          "tva_tx": { "type": "number" },
          "stock_reel": { "type": "number" },
          "barcode": { "type": "string" }
        }
      }
    },
    {
      "id": "list_invoices",
      "label": "Récupérer les factures",
      "type": "source",
      "method": "GET",
      "path": "/invoices",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "ref": { "type": "string" },
          "socid": { "type": "string" },
          "date": { "type": "number", "description": "timestamp UNIX" },
          "date_lim_reglement": { "type": "number" },
          "total_ht": { "type": "number" },
          "total_ttc": { "type": "number" },
          "statut": { "type": "number" }
        }
      }
    },
    {
      "id": "create_thirdparty",
      "label": "Créer un tiers",
      "type": "destination",
      "method": "POST",
      "path": "/thirdparties",
      "input_schema": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string" },
          "client": { "type": "number", "default": 1 },
          "email": { "type": "string" },
          "phone": { "type": "string" },
          "address": { "type": "string" },
          "zip": { "type": "string" },
          "town": { "type": "string" },
          "country_code": { "type": "string", "default": "FR" },
          "tva_intra": { "type": "string" }
        }
      }
    },
    {
      "id": "create_invoice",
      "label": "Créer une facture",
      "type": "destination",
      "method": "POST",
      "path": "/invoices",
      "input_schema": {
        "type": "object",
        "required": ["socid", "lines"],
        "properties": {
          "socid": { "type": "string" },
          "date": { "type": "number" },
          "lines": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "fk_product": { "type": "string" },
                "label": { "type": "string" },
                "qty": { "type": "number" },
                "subprice": { "type": "number" },
                "tva_tx": { "type": "number" }
              }
            }
          }
        }
      }
    }
  ]
}
```

### `connectors/prestashop/openapi.json`
```json
{
  "connector_meta": {
    "id": "prestashop",
    "name": "PrestaShop",
    "version": "1.7",
    "icon": "prestashop.svg",
    "category": "E-commerce",
    "auth_type": "api_key",
    "docs_url": "https://devdocs.prestashop-project.org/8/webservice/"
  },
  "auth_config": {
    "auth_method": "basic",
    "username_param": "api_key",
    "password_value": "",
    "base_url_param": "shop_url"
  },
  "operations": [
    {
      "id": "list_customers",
      "label": "Récupérer les clients",
      "type": "source",
      "method": "GET",
      "path": "/api/customers",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "firstname": { "type": "string" },
          "lastname": { "type": "string" },
          "email": { "type": "string" },
          "birthday": { "type": "string" },
          "newsletter": { "type": "boolean" },
          "active": { "type": "boolean" },
          "date_add": { "type": "string" }
        }
      }
    },
    {
      "id": "list_products",
      "label": "Récupérer les produits",
      "type": "source",
      "method": "GET",
      "path": "/api/products",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "reference": { "type": "string" },
          "name": { "type": "string" },
          "price": { "type": "number" },
          "quantity": { "type": "number" },
          "ean13": { "type": "string" },
          "active": { "type": "boolean" },
          "description_short": { "type": "string" }
        }
      }
    },
    {
      "id": "list_orders",
      "label": "Récupérer les commandes",
      "type": "source",
      "method": "GET",
      "path": "/api/orders",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "reference": { "type": "string" },
          "id_customer": { "type": "string" },
          "total_paid": { "type": "number" },
          "total_products_wt": { "type": "number" },
          "current_state": { "type": "string" },
          "date_add": { "type": "string" }
        }
      }
    },
    {
      "id": "create_product",
      "label": "Créer un produit",
      "type": "destination",
      "method": "POST",
      "path": "/api/products",
      "input_schema": {
        "type": "object",
        "required": ["name", "price"],
        "properties": {
          "reference": { "type": "string" },
          "name": { "type": "string" },
          "price": { "type": "number" },
          "quantity": { "type": "number", "default": 0 },
          "ean13": { "type": "string" },
          "active": { "type": "boolean", "default": true },
          "description_short": { "type": "string" },
          "id_category_default": { "type": "string" }
        }
      }
    },
    {
      "id": "update_stock",
      "label": "Mettre à jour le stock",
      "type": "destination",
      "method": "PUT",
      "path": "/api/stock_availables/{id}",
      "input_schema": {
        "type": "object",
        "required": ["id", "quantity"],
        "properties": {
          "id": { "type": "string" },
          "quantity": { "type": "number" }
        }
      }
    }
  ]
}
```

### `connectors/woocommerce/openapi.json`
```json
{
  "connector_meta": {
    "id": "woocommerce",
    "name": "WooCommerce",
    "version": "3.0",
    "icon": "woocommerce.svg",
    "category": "E-commerce",
    "auth_type": "oauth1",
    "docs_url": "https://woocommerce.github.io/woocommerce-rest-api-docs/"
  },
  "auth_config": {
    "consumer_key_param": "consumer_key",
    "consumer_secret_param": "consumer_secret",
    "base_url_param": "shop_url"
  },
  "operations": [
    {
      "id": "list_customers",
      "label": "Récupérer les clients",
      "type": "source",
      "method": "GET",
      "path": "/wp-json/wc/v3/customers",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "number" },
          "email": { "type": "string" },
          "first_name": { "type": "string" },
          "last_name": { "type": "string" },
          "username": { "type": "string" },
          "billing": {
            "type": "object",
            "properties": {
              "address_1": { "type": "string" },
              "city": { "type": "string" },
              "postcode": { "type": "string" },
              "country": { "type": "string" },
              "phone": { "type": "string" }
            }
          },
          "date_created": { "type": "string" }
        }
      }
    },
    {
      "id": "list_products",
      "label": "Récupérer les produits",
      "type": "source",
      "method": "GET",
      "path": "/wp-json/wc/v3/products",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "number" },
          "name": { "type": "string" },
          "sku": { "type": "string" },
          "price": { "type": "string" },
          "regular_price": { "type": "string" },
          "stock_quantity": { "type": "number" },
          "manage_stock": { "type": "boolean" },
          "status": { "type": "string" },
          "categories": { "type": "array" }
        }
      }
    },
    {
      "id": "list_orders",
      "label": "Récupérer les commandes",
      "type": "source",
      "method": "GET",
      "path": "/wp-json/wc/v3/orders",
      "pagination": "offset",
      "output_schema": {
        "type": "object",
        "properties": {
          "id": { "type": "number" },
          "number": { "type": "string" },
          "status": { "type": "string" },
          "total": { "type": "string" },
          "customer_id": { "type": "number" },
          "billing": { "type": "object" },
          "line_items": { "type": "array" },
          "date_created": { "type": "string" }
        }
      }
    },
    {
      "id": "create_product",
      "label": "Créer un produit",
      "type": "destination",
      "method": "POST",
      "path": "/wp-json/wc/v3/products",
      "input_schema": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string" },
          "sku": { "type": "string" },
          "regular_price": { "type": "string" },
          "stock_quantity": { "type": "number" },
          "manage_stock": { "type": "boolean", "default": true },
          "status": { "type": "string", "default": "publish" },
          "description": { "type": "string" }
        }
      }
    },
    {
      "id": "update_product",
      "label": "Mettre à jour un produit",
      "type": "destination",
      "method": "PUT",
      "path": "/wp-json/wc/v3/products/{id}",
      "input_schema": {
        "type": "object",
        "required": ["id"],
        "properties": {
          "id": { "type": "number" },
          "regular_price": { "type": "string" },
          "stock_quantity": { "type": "number" },
          "status": { "type": "string" }
        }
      }
    }
  ]
}
```

### `connectors/ftp-sftp/openapi.json`
```json
{
  "connector_meta": {
    "id": "ftp-sftp",
    "name": "FTP / SFTP / CSV",
    "version": "1.0",
    "icon": "ftp.svg",
    "category": "Fichiers",
    "auth_type": "basic",
    "docs_url": null
  },
  "auth_config": {
    "protocol_param": "protocol",
    "host_param": "host",
    "port_param": "port",
    "username_param": "username",
    "password_param": "password",
    "private_key_param": "private_key"
  },
  "operations": [
    {
      "id": "read_csv_file",
      "label": "Lire un fichier CSV",
      "type": "source",
      "method": "FILE_READ",
      "description": "Lit un fichier CSV depuis FTP/SFTP ou chemin local et retourne les lignes",
      "config_schema": {
        "type": "object",
        "required": ["path"],
        "properties": {
          "path": { "type": "string", "description": "Chemin du fichier ex: /exports/clients.csv" },
          "separator": { "type": "string", "default": ";", "description": "Séparateur de colonnes" },
          "encoding": { "type": "string", "default": "utf-8", "enum": ["utf-8", "windows-1252", "iso-8859-1"] },
          "hasHeader": { "type": "boolean", "default": true },
          "skipLines": { "type": "number", "default": 0 }
        }
      },
      "output_schema": {
        "type": "object",
        "description": "Dynamique — colonnes déduites du header CSV"
      }
    },
    {
      "id": "watch_directory",
      "label": "Surveiller un dossier (file watch)",
      "type": "trigger",
      "method": "FILE_WATCH",
      "description": "Déclenche un flux dès qu'un nouveau fichier apparaît dans le dossier",
      "config_schema": {
        "type": "object",
        "required": ["path"],
        "properties": {
          "path": { "type": "string" },
          "pattern": { "type": "string", "default": "*.csv", "description": "Glob pattern" },
          "moveAfter": { "type": "boolean", "default": true, "description": "Déplacer le fichier dans processed/ après lecture" }
        }
      }
    },
    {
      "id": "write_csv_file",
      "label": "Écrire un fichier CSV",
      "type": "destination",
      "method": "FILE_WRITE",
      "description": "Génère et dépose un fichier CSV sur FTP/SFTP",
      "config_schema": {
        "type": "object",
        "required": ["path"],
        "properties": {
          "path": { "type": "string", "description": "Dossier de destination" },
          "filename": { "type": "string", "description": "Nom du fichier. Supporte variables: {date}, {time}, {flowId}" },
          "separator": { "type": "string", "default": ";" },
          "encoding": { "type": "string", "default": "utf-8" },
          "includeHeader": { "type": "boolean", "default": true }
        }
      },
      "input_schema": {
        "type": "object",
        "description": "Dynamique — colonnes définies par le mapping"
      }
    },
    {
      "id": "agent_watch",
      "label": "Surveiller un dossier local (via Agent Desktop)",
      "type": "trigger",
      "method": "AGENT_WATCH",
      "description": "Nécessite l'Agent Desktop installé sur le poste client",
      "config_schema": {
        "type": "object",
        "required": ["agentId", "watchPath"],
        "properties": {
          "agentId": { "type": "string", "description": "ID de l'agent desktop enregistré" },
          "watchPath": { "type": "string", "description": "Chemin local sur le poste client" },
          "pattern": { "type": "string", "default": "*.csv" }
        }
      }
    }
  ]
}
```

---

## 7. VARIABLES D'ENVIRONNEMENT

```env
NODE_ENV=production
PORT=3000

# Master DB
DATABASE_URL=postgresql://anexys:password@postgres-master:5432/anexys_master

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_ACCESS_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Vault
VAULT_KEY=<exactement 32 bytes hex>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<api key>
SMTP_FROM=noreply@anexys.fr

# Connecteurs
CONNECTORS_PATH=/app/connectors

# Frontend
FRONTEND_URL=https://app.anexys.fr
```

---

## 8. DOCKER COMPOSE

```yaml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on: [api, frontend]

  frontend:
    build: { context: ./apps/frontend }
    environment:
      VITE_API_URL: https://app.anexys.fr/api

  api:
    build: { context: ./apps/api }
    env_file: .env
    volumes:
      - ./connectors:/app/connectors
    depends_on: [postgres-master, redis]

  worker:
    build: { context: ./apps/api }
    command: node dist/worker.js
    env_file: .env
    deploy:
      replicas: 2
    depends_on: [postgres-master, redis]

  postgres-master:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: anexys_master
      POSTGRES_USER: anexys
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_master_data:/var/lib/postgresql/data
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]

  grafana:
    image: grafana/grafana:latest
    ports: ["3001:3000"]
    volumes: [grafana_data:/var/lib/grafana]

  loki:
    image: grafana/loki:latest
    ports: ["3100:3100"]

volumes:
  postgres_master_data:
  redis_data:
  grafana_data:
```

---

## 9. ORDRE DE DÉVELOPPEMENT

**Sprint 1 — Infrastructure (sem. 1-2)**
1. Monorepo (turborepo)
2. NestJS + TypeScript strict
3. Prisma Master DB + migrations
4. Module Auth (JWT + guards + decorators)
5. Module Tenants + TenantDatabaseService (pool dynamique)
6. VaultService (AES-256-GCM)
7. Tests unitaires Auth + Tenants

**Sprint 2 — Connecteurs & Marketplace (sem. 3-4)**
1. ConnectorRegistry + OpenAPI loader + chokidar hot-reload
2. Module Connectors CRUD + test connexion
3. Module Marketplace
4. Frontend : Auth + Marketplace + Connectors

**Sprint 3 — Flow Engine (sem. 5-7)**
1. MappingEngine package (tous transformers + formules)
2. Module Flows CRUD + versioning
3. Flow Engine streaming : Extract → Transform → Fan-out → Load
4. BullMQ workers + CRON + Webhook endpoint
5. Module Executions + logs
6. Frontend : Flow Builder + Dashboard

**Sprint 4 — Mapping Visuel (sem. 8-9)**
1. MappingEditor drag & drop (React Flow)
2. FormulaEditor autocomplétion
3. Preview endpoint + temps réel
4. LookupTable editor

**Sprint 5 — Agent Desktop (sem. 10-11)**
1. AgentGateway WebSocket (NestJS)
2. Agent TypeScript (watcher + upload + download)
3. Protocole WebSocket complet
4. Compilation pkg (Windows + macOS)
5. Installation Windows Service + macOS LaunchDaemon
6. Frontend : gestion agents + tokens

**Sprint 6 — EDIFACT (sem. 12)**
1. Package edifact (parser + generator + validator)
2. ORDERS, INVOIC, DESADV, PRICAT, RECADV
3. Réception AS2 + SFTP
4. Intégration Flow Engine

**Sprint 7 — Billing (sem. 13-14)**
1. UsageMetric interceptor global
2. Plans, quotas, blocage FREE
3. Stripe customer + invoices + meters + webhook
4. Frontend : Billing + dashboard conso

**Sprint 8 — Production (sem. 15-16)**
1. Audit Log module + RGPD
2. Notifications (alertes échec, quota 80%)
3. Monitoring Grafana + Loki
4. Tests E2E complets
5. Swagger docs finalisés
6. Docker Compose production hardening

---

## 10. FICHIER `.cursor/rules`

```
Tu développes ANEXYS iPaaS — plateforme d'intégration multi-tenant.
Stack : NestJS 10 + React 18 + TypeScript 5.3 strict + PostgreSQL 16 + BullMQ + Redis 7.

RÈGLES OBLIGATOIRES :
1. TypeScript strict — jamais de `any`, utiliser `unknown` si nécessaire
2. Chaque module NestJS = module.ts + service.ts + controller.ts + dto/ + *.spec.ts
3. Tous credentials via VaultService.encrypt() — jamais en clair
4. Tous endpoints : @UseGuards(AuthGuard, RolesGuard) + @ApiOperation() Swagger
5. Multi-tenant : TenantDatabaseService.getClient(tenantId) pour accéder à la DB tenant
6. Gros fichiers : TOUJOURS streaming Node.js — jamais readFileSync ou tableau complet
7. Commenter en français les fonctions métier complexes
8. Tests Jest obligatoires pour chaque service
9. Routes préfixées : /api/v1/...
10. Erreurs : toujours utiliser les exceptions NestJS (BadRequestException, etc.)
11. DTOs : toujours class-validator + class-transformer
12. Logs : utiliser LoggerService NestJS, jamais console.log
```

---

*ANEXYS iPaaS — Document confidentiel — v2.0 — Mars 2026*
