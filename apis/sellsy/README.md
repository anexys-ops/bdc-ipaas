# Sellsy — API v2

Résumé des endpoints et des accès nécessaires pour l’API REST v2 Sellsy.

## Accès nécessaires

| Élément | Description |
|--------|-------------|
| **URL de base** | `https://api.sellsy.com/v2` |
| **Authentification** | OAuth2 (Authorization Code avec PKCE ou Client Credentials) |
| **Création d’app** | [Sellsy Developer — API v2](https://www.sellsy.com/developer/api-v2) pour obtenir **Client ID** et **Client Secret** |
| **ID Compte** | Identifiant du compte Sellsy (ex. 215318) |

## OAuth2

| Paramètre | Valeur |
|----------|--------|
| **Authorization URL** | `https://login.sellsy.com/oauth2/authorization` |
| **Token URL** | `https://login.sellsy.com/oauth2/access-tokens` |
| **Refresh** | Même URL que Token URL (refresh token) |
| **PKCE** | Requis pour le flux Authorization Code |
| **Durée du token** | 3600 s (renouvelable via refresh token) |

Types d’application : **Private** (compte), **Personal** (staff), **Public** (tous comptes, validation requise).

## Headers requis

- **`Authorization: Bearer <access_token>`** pour chaque requête API.
- **`Content-Type: application/json`** pour les corps POST/PATCH.

## Endpoints principaux

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/contacts` | Liste des contacts (pagination par curseur `after`) |
| POST | `/contacts` | Créer un contact (lastName, email requis) |
| GET | `/contacts/{id}` | Détail d’un contact |
| PATCH | `/contacts/{id}` | Modifier un contact |
| GET | `/invoices` | Liste des factures |
| POST | `/invoices` | Créer une facture (clientId, lines requis) |
| GET | `/invoices/{id}` | Détail d’une facture |
| PATCH | `/invoices/{id}` | Modifier une facture |
| GET | `/documents` | Liste des documents (devis, factures, achats) |
| GET | `/documents/{id}` | Détail d’un document |
| GET | `/clients` | Liste des clients |
| GET | `/clients/{id}` | Détail d’un client |
| GET | `/opportunities` | Liste des opportunités |
| GET | `/opportunities/funnels` | Tunnels (funnels) d’opportunités |

## Pagination

Pagination par curseur : paramètre **`after`** (valeur retournée dans la réponse) et **`limit`**.

## Réponses

- **200 / 201** : succès.
- **400** : données invalides.
- **401** : non authentifié ou token expiré.
- **403** : accès refusé (droits ou scope insuffisant).
- **404** : ressource non trouvée.

## Sécurité des identifiants

Ne jamais commiter **Client Secret** ou **tokens** dans le dépôt. Utiliser des variables d’environnement ou un coffre (vault).  
Pour les tests, garder le Client ID / Client Secret dans un fichier local non versionné (ex. `.env`) et le charger côté application.

## Références

- [Documentation API v2](https://docs.sellsy.com/api/v2/)
- [Méthodes (référence détaillée)](https://api.sellsy.com/documentation/methods) — partie v1 ; la v2 est REST.
- [Centre d’aide — API v2](https://help.sellsy.com/fr/articles/5876614-api-v2)
- [Types d’accès API](https://help.sellsy.com/fr/articles/5876615-types-d-acces-api)
