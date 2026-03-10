# Sellsy API v1 — Catalogue, Documents, Clients

Documentation extraite de [docs.sellsy.com/api/v1/documentation/methods](https://docs.sellsy.com/api/v1/documentation/methods) pour **Catalogue**, **Documents** et **Clients**. L’API v1 est en **RPC** : un seul endpoint POST avec `method` + `params`.

## Accès

| Élément | Description |
|--------|-------------|
| **URL** | `https://api.sellsy.com` (chemin exact à confirmer selon SDK / doc Sellsy) |
| **Méthode** | **POST** uniquement |
| **Corps** | JSON : `{ "method": "Namespace.method", "params": { ... } }` |
| **Auth** | OAuth 1.0 ou token selon configuration du compte (voir centre d’aide Sellsy) |

## Réponse standard

```json
{
  "response": { ... },
  "error": "",
  "status": "success"
}
```

En cas d’erreur : `"status": "error"` et `"error"` renseigné.

---

## Catalogue (produits / services)

### Méthodes disponibles

| Méthode | Description | Paramètres requis |
|--------|-------------|-------------------|
| `Catalogue.getList` | Liste produits ou services | `type` (item \| service) |
| `Catalogue.getOne` | Détail par ID | `type`, `id` |
| `Catalogue.getOneByRef` | Détail par référence | `type`, `ref` |
| `Catalogue.create` | Créer item/service | `type`, objet item ou service (name, tradename, unit, etc.) |
| `Catalogue.update` | Modifier | `type`, `id`, champs à modifier |
| `Catalogue.delete` | Supprimer | `type`, `id` |
| `Catalogue.updateOwner` | Changer propriétaire | `linkedid`, `ownerid` |
| `Catalogue.getVariations` | Déclinaisons d’un produit | `itemid` |
| `Catalogue.getVariation` | Une déclinaison | `itemid`, `declid` |
| `Catalogue.getVariationFields` | Champs de déclinaison (compte) | — |
| `Catalogue.getVariationFieldsItem` | Champs déclinaison d’un item | `itemid` |
| `Catalogue.createVariationField` | Créer champ déclinaison | name, syscode, fields |
| `Catalogue.updateVariationField` | Modifier champ | id, name, syscode, fields |
| `Catalogue.deleteVariationFields` | Supprimer champ | `id` |
| `Catalogue.deleteVariationCollection` | Supprimer valeur déclinaison | idf, collection |
| `Catalogue.activateVariations` | Activer déclinaisons | id, dec_field_1, dec_field_2, dec_field_3 |
| `Catalogue.createVariations` | Créer déclinaisons | itemid, type, idf1_id, variations[] |
| `Catalogue.updateVariation` | Modifier déclinaison | declid, itemid, type, variation |
| `Catalogue.deleteVariation` | Supprimer déclinaison | `id` |
| `Catalogue.getPrices` | Prix (évent. par déclinaison) | `type`, `id`, optionnel `declid` |
| `Catalogue.updatePrice` | Mettre à jour prix (catégorie tarifaire) | linkedtype, linkedid, rateCategory, etc. |
| `Catalogue.getBarCodes` | Codes-barres | `type`, `id` |
| `Catalogue.createBarCode` | Ajouter code-barre | type, id, barcode |
| `Catalogue.updateBarCode` | Modifier code-barre | id, barcode |
| `Catalogue.deleteBarCode` | Supprimer code-barre | id |
| `Catalogue.getCategories` | Liste catégories | — |
| `Catalogue.getCategory` | Une catégorie | id |
| `Catalogue.getParentCategories` | Catégories parentes | — |
| `Catalogue.getChildrenFromParentId` | Enfants d’une catégorie | parentId |
| `Catalogue.createCategory` | Créer catégorie | name, etc. |
| `Catalogue.updateCategory` | Modifier catégorie | id, ... |
| `Catalogue.deleteCategory` | Supprimer catégorie | id |
| `Catalogue.addPictureToGallery` | Ajouter image | itemid, image |
| `Catalogue.updateTranslations` | Traductions | ... |
| `Catalogue.updateSharingGroups` | Partage groupes | linkedid, groupsIds |

### Exemples pour tester le Catalogue

**Liste des produits (items)**  
```json
{ "method": "Catalogue.getList", "params": { "type": "item", "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Liste des services**  
```json
{ "method": "Catalogue.getList", "params": { "type": "service", "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Détail d’un produit**  
```json
{ "method": "Catalogue.getOne", "params": { "type": "item", "id": 249439 } }
```

**Catégories**  
```json
{ "method": "Catalogue.getCategories", "params": {} }
```

---

## Documents (devis, factures, commandes, etc.)

### Types de documents (`doctype`)

- `invoice` — Facture  
- `estimate` — Devis  
- `proforma` — Avoir / proforma  
- `delivery` — Bon de livraison  
- `order` — Commande  
- `model` — Modèle de document  

### Méthodes principales

| Méthode | Description | Paramètres requis |
|--------|-------------|-------------------|
| `Document.getList` | Liste de documents | `doctype` |
| `Document.getOne` | Détail d’un document | `doctype`, `docid` |
| `Document.getNextIdent` | Prochain numéro | `doctype` |
| `Document.create` | Créer document | doctype + document + rows (voir doc) |
| `Document.update` | Modifier | `doctype`, `docid`, champs |
| `Document.updateDeadlines` | Modifier échéances | doctype, docid, ... |
| `Document.updateOwner` | Changer propriétaire | linkedid, ownerid |
| `Document.updateFields` | Modifier champs | ... |
| `Document.getLinkedDocuments` | Documents liés | ... |
| `Document.getTree` | Arborescence | ... |
| `Document.updateStep` | Changer étape | ... |
| `Document.validate` | Valider | `doctype`, `docid` |
| `Document.updateDeliveryStep` | Étape livraison | ... |
| `Document.sendDocByMail` | Envoyer par mail | ... |
| `Document.getPaymentList` | Liste des paiements | `doctype`, `docid` |
| `Document.getForCopy` | Pour copie | ... |
| `Document.getModel` | Modèle | ... |
| `Document.getPayment` | Détail paiement | ... |
| `Document.createPayment` | Créer paiement | ... |
| `Document.deletePayment` | Supprimer paiement | ... |
| `Document.getPaymentUrl` | URL de paiement | ... |
| `Document.linkPurchase` | Lier achat | ... |
| `Document.updateSharingGroups` | Partage | ... |
| `Document.enablePublicLink` | Activer lien public | ... |
| `Document.disablePublicLink` | Désactiver lien public | ... |
| `Document.getPublicLink` | Lien public | ... |
| `Document.getPublicLink_v2` | Lien public (v2) | ... |
| `Document.getNumberingDraftStatus` | Statut numérotation brouillon | ... |

### Exemples pour tester les Documents (chaque type)

**Liste des factures**  
```json
{ "method": "Document.getList", "params": { "doctype": "invoice", "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Liste des devis**  
```json
{ "method": "Document.getList", "params": { "doctype": "estimate", "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Liste des commandes**  
```json
{ "method": "Document.getList", "params": { "doctype": "order", "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Liste des livraisons**  
```json
{ "method": "Document.getList", "params": { "doctype": "delivery", "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Liste des proformas**  
```json
{ "method": "Document.getList", "params": { "doctype": "proforma", "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Liste des modèles**  
```json
{ "method": "Document.getList", "params": { "doctype": "model", "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Détail d’un document**  
```json
{ "method": "Document.getOne", "params": { "doctype": "invoice", "docid": 11027 } }
```

**Prochain numéro (ex. facture)**  
```json
{ "method": "Document.getNextIdent", "params": { "doctype": "invoice" } }
```

---

## Clients (Customers)

### Méthodes disponibles

| Méthode | Description | Paramètres requis |
|--------|-------------|-------------------|
| `Client.getList` | Liste des clients | optionnel order, pagination, search |
| `Client.getOne` | Détail client | `clientid` |
| `Client.getAddress` | Une adresse | `clientid`, `addressid` |
| `Client.getContact` | Un contact | `clientid`, `contactid` |
| `Client.getBillingContact` | Contact de facturation | `clientid` |
| `Client.create` | Créer client | third (name obligatoire), optionnel contact, address |
| `Client.update` | Modifier | `clientid` + champs (comme create) |
| `Client.delete` | Supprimer | `clientid` |
| `Client.updateOwner` | Changer propriétaire | `linkedid`, `ownerid` |
| `Client.addAddress` | Ajouter adresse | `clientid`, `address` |
| `Client.addContact` | Ajouter contact | `clientid`, `contact` |
| `Client.updateAddress` | Modifier adresse | `clientid`, `addressid`, `address` |
| `Client.updateContact` | Modifier contact | `clientid`, `contactid`, `contact` |
| `Client.deleteAddress` | Supprimer adresse | `clientid`, `addressid` |
| `Client.deleteContact` | Supprimer contact | `clientid`, `contactid` |
| `Client.transformToProspect` | Transformer en prospect | thirdid |
| `Client.getBankAccountList` | Comptes bancaires | thirdid |
| `Client.updateContactPicture` | Photo contact | thirdid, contactid, image |
| `Client.updatePrefs` | Préférences client | thirdid, prefs |
| `Client.updateThirdPicture` | Logo société | thirdid |
| `Client.updateSharingGroups` | Partage groupes | linkedid, groupsIds |
| `Client.updateSharingStaffs` | Partage staffs | linkedid, staffsIds |
| `Client.getMargin` | Marge | clientid, period_start, period_end, currency |

### Exemples pour tester les Clients

**Liste des clients**  
```json
{ "method": "Client.getList", "params": { "pagination": { "pagenum": 1, "nbperpage": 10 } } }
```

**Détail d’un client**  
```json
{ "method": "Client.getOne", "params": { "clientid": 2739 } }
```

**Création client (société)**  
```json
{
  "method": "Client.create",
  "params": {
    "third": { "name": "Ma Société", "type": "corporation", "email": "contact@example.com" },
    "contact": { "name": "Dupont", "forename": "Jean", "email": "jean@example.com" }
  }
}
```

---

## Synthèse : quoi tester par type

1. **Catalogue**  
   - `Catalogue.getList` avec `type: item` puis `type: service`  
   - `Catalogue.getOne` (un id connu)  
   - `Catalogue.getCategories`  

2. **Documents**  
   - `Document.getList` pour chaque `doctype` : `invoice`, `estimate`, `order`, `delivery`, `proforma`, `model`  
   - `Document.getOne` pour un docid connu  
   - (Optionnel) `Document.getNextIdent` pour un doctype  

3. **Clients**  
   - `Client.getList`  
   - `Client.getOne` avec un clientid connu  
   - (Optionnel) `Client.create` en test  

Quand vous aurez la doc ou les endpoints de l’**API v2**, on pourra les ajouter à côté (dossier dédié ou même dépôt) et prévoir les mêmes types de tests.
