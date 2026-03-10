# Sellsy API v2 — REST

Documentation structurée à partir de la [référence officielle Sellsy API v2](https://docs.sellsy.com/api/v2/). L’API v2 est **REST** : une URL par ressource, méthodes HTTP GET / POST / PUT / PATCH / DELETE. [Changelog](https://docs.sellsy.com/api/v2/changelog.html).

## Accès

| Élément | Description |
|--------|-------------|
| **URL de base** | `https://api.sellsy.com/v2` |
| **Authentification** | OAuth2 (Authorization Code + PKCE ou Client Credentials) |
| **Headers** | `Authorization: Bearer <access_token>`, `Content-Type: application/json` |
| **Création d’app** | [Sellsy Developer — API v2](https://www.sellsy.com/developer/api-v2) (Client ID + Client Secret) |

### OAuth2

| Paramètre | Valeur |
|----------|--------|
| **Authorization URL** | `https://login.sellsy.com/oauth2/authorization` |
| **Token URL** | `https://login.sellsy.com/oauth2/access-tokens` |
| **PKCE** | Requis pour le flux Authorization Code |
| **Durée du token** | 3600 s (renouvelable via refresh token) |

## Réponses

- **200** : succès (GET, PUT, PATCH).
- **201** : créé (POST).
- **204** : succès sans corps (DELETE).
- **400** : données invalides.
- **401** : non authentifié.
- **403** : accès refusé.
- **404** : ressource non trouvée.

La pagination est en général **par curseur** : paramètres `after` et `limit` en query.

---

## Companies (sociétés — clients / prospects)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/companies` | Liste des sociétés |
| POST | `/companies` | Créer une société |
| POST | `/companies/search` | Rechercher (reference, archived, etc.) |
| GET | `/companies/{id}` | Détail d’une société |
| PUT | `/companies/{id}` | Modifier une société |
| DELETE | `/companies/{id}` | Supprimer une société |
| POST | `/companies/{id}/convert` | Convertir un prospect en client |

---

## Individuals (particuliers)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/individuals` | Liste des particuliers |
| POST | `/individuals` | Créer un particulier |
| POST | `/individuals/search` | Rechercher |
| GET | `/individuals/{id}` | Détail |
| PUT | `/individuals/{id}` | Modifier |
| POST | `/individuals/{id}/convert` | Convertir prospect en client |

---

## Contacts

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/contacts` | Liste des contacts |
| POST | `/contacts` | Créer un contact |
| GET | `/contacts/{id}` | Détail d’un contact |
| PATCH | `/contacts/{id}` | Modifier un contact |

---

## Documents — Devis (Estimates)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/estimates` | Liste des devis |
| POST | `/estimates` | Créer un devis |
| POST | `/estimates/search` | Rechercher des devis |
| GET | `/estimates/{id}` | Détail d’un devis |
| PUT | `/estimates/{id}` | Modifier un devis |

Endpoints complémentaires (statut, primes, signature électronique, etc.) : voir [référence v2](https://docs.sellsy.com/api/v2/).

---

## Documents — Factures (Invoices)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/invoices` | Liste des factures |
| POST | `/invoices` | Créer une facture |
| POST | `/invoices/search` | Rechercher (ex. filtre `is_progress_invoice`) |
| GET | `/invoices/{id}` | Détail d’une facture |
| PUT | `/invoices/{id}` | Modifier une facture |

Paiements, avoirs (deposits), factures de situation (progress invoices), etc. : voir la doc officielle.

---

## Documents — Commandes (Orders)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/orders` | Liste des commandes |
| POST | `/orders` | Créer une commande |
| POST | `/orders/search` | Rechercher des commandes |
| GET | `/orders/{id}` | Détail d’une commande |
| PUT | `/orders/{id}` | Modifier une commande |

---

## Documents — Livraisons (Deliveries)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/deliveries` | Liste des livraisons |
| POST | `/deliveries/search` | Rechercher des livraisons |
| GET | `/deliveries/{id}` | Détail d’une livraison |

---

## Documents — Avoirs (Credit-notes)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/credit-notes` | Liste des avoirs |
| POST | `/credit-notes` | Créer un avoir |
| GET | `/credit-notes/{id}` | Détail d’un avoir |

---

## Proposals (modèles et documents de proposition)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/proposals/models` | Liste des modèles de proposition |
| POST | `/proposals/models/search` | Rechercher des modèles |
| GET | `/proposals/models/{id}` | Détail d’un modèle |
| POST | `/proposals/models/{id}/generate-document` | Générer un document à partir du modèle |
| GET | `/proposals/documents/{id}` | Détail d’un document de proposition |

---

## Items (catalogue — produits / services)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/items` | Liste des produits / services |
| POST | `/items` | Créer un produit / service |
| POST | `/items/search` | Rechercher (nom, référence, archivé) |
| GET | `/items/{id}` | Détail d’un produit / service |
| PUT | `/items/{id}` | Modifier |
| GET | `/items/{id}/declinations` | Liste des déclinaisons |
| POST | `/items/{id}/declinations` | Rechercher / filtrer déclinaisons |

---

## Units (unités)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/units` | Liste des unités |
| POST | `/units` | Créer une unité |
| GET | `/units/{id}` | Détail d’une unité |
| PUT | `/units/{id}` | Modifier une unité |

---

## Taxes

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/taxes` | Liste des taxes |
| POST | `/taxes` | Créer une taxe |
| GET | `/taxes/{id}` | Détail d’une taxe |
| PUT | `/taxes/{id}` | Modifier une taxe |

Champs récents : `is_active`, `is_einvoicing_compliant` (facturation électronique).

---

## Opportunities (opportunités)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/opportunities` | Liste des opportunités |
| GET | `/opportunities/{id}` | Détail d’une opportunité |
| PATCH | `/opportunities/{id}` | Mise à jour partielle |

---

## Webhooks

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/webhooks` | Liste des webhooks |
| POST | `/webhooks` | Créer un webhook |
| GET | `/webhooks/{id}` | Détail |
| PUT | `/webhooks/{id}` | Modifier |
| DELETE | `/webhooks/{id}` | Supprimer |

---

## Recherche et compte

| Méthode | Chemin | Description |
|--------|--------|-------------|
| POST | `/search` | Recherche globale (filtre archived, etc.) |
| GET | `/account/addresses` | Adresses du compte |
| GET | `/bank-accounts` | Comptes bancaires |
| GET | `/payment-terms` | Délais de paiement |
| GET | `/settings/email` | Paramètres email |

---

## Synthèse : quoi tester par type

1. **Companies** : `GET /companies` puis `GET /companies/{id}` (avec un id connu).
2. **Individuals** : `GET /individuals`.
3. **Contacts** : `GET /contacts`.
4. **Documents** :  
   - Devis : `GET /estimates`  
   - Factures : `GET /invoices`  
   - Commandes : `GET /orders`  
   - Livraisons : `GET /deliveries`  
   - Avoirs : `GET /credit-notes`
5. **Proposals** : `GET /proposals/models`.
6. **Catalogue** : `GET /items`, `GET /units`, `GET /taxes`.
7. **Opportunités** : `GET /opportunities`.
8. **Compte** : `GET /account/addresses`, `GET /bank-accounts`, `GET /payment-terms`.

Les exemples d’appels prêts à l’emploi sont dans **test-operations.json**.

## Références

- [Référence API v2](https://docs.sellsy.com/api/v2/)
- [Changelog API v2](https://docs.sellsy.com/api/v2/changelog.html)
- [Centre d’aide — API v2](https://help.sellsy.com/fr/articles/5876614-api-v2)
