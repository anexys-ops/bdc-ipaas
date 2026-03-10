# Dolibarr — API REST

Résumé des endpoints et des accès nécessaires pour l’API REST Dolibarr.

## Instance cible (exemple)

| Élément | Valeur |
|--------|--------|
| **URL de base** | `https://bdcloud.luxgreen.net/api/index.php` |
| **Explorateur Swagger** | [https://bdcloud.luxgreen.net/api/index.php/explorer/#/](https://bdcloud.luxgreen.net/api/index.php/explorer/#/) |
| **Spec complète (Swagger 2.0)** | Fichier `swagger-from-instance.json` dans ce dossier (généré avec l’en-tête `DOLAPIKEY`) |

Pour régénérer la spec à jour :  
`curl -H "DOLAPIKEY: <votre_clé>" "https://bdcloud.luxgreen.net/api/index.php/explorer/swagger.json" -o swagger-from-instance.json`

**Sécurité** : ne jamais commiter la clé API. Utiliser une variable d’environnement (ex. `DOLAPIKEY`) ou un coffre de secrets.

## Accès nécessaires

| Élément | Description |
|--------|-------------|
| **URL de base** | `https://votre-instance.fr/api/index.php` (ex. `https://bdcloud.luxgreen.net/api/index.php`) |
| **Authentification** | Clé API (DOLAPIKEY) dans l’en-tête HTTP |
| **Activation** | Configuration → Modules/Applications → activer « Web services REST API » |
| **Clé API** | Menu utilisateur (en haut à droite) → onglet « Clé API » → Générer ou régénérer |

## Headers requis

- **`DOLAPIKEY`** (obligatoire) : clé API de l’utilisateur.
- **`Content-Type: application/json`** : pour les requêtes POST/PUT avec corps.
- **`DOLAPIENTITY`** (optionnel) : en multi-société, identifiant de l’entité (vide = première société).

## Endpoints principaux

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET/POST | `/login` | Obtenir un token (déconseillé ; préférer la clé API) |
| GET | `/thirdparties` | Liste des tiers (clients/fournisseurs) |
| POST | `/thirdparties` | Créer un tiers |
| GET/PUT/DELETE | `/thirdparties/{id}` | Détail / modification / suppression d’un tiers |
| GET | `/products` | Liste des produits |
| POST | `/products` | Créer un produit |
| GET/PUT/DELETE | `/products/{id}` | Détail / modification / suppression d’un produit |
| GET | `/orders` | Liste des commandes |
| POST | `/orders` | Créer une commande (puis ajouter les lignes via `/orders/{id}/lines`) |
| POST | `/orders/{id}/lines` | Ajouter des lignes à une commande |
| POST | `/orders/{id}/validate` | Valider une commande |
| GET | `/invoices` | Liste des factures |
| POST | `/invoices` | Créer une facture |
| GET | `/invoices/{id}` | Détail d’une facture |
| GET | `/dictionarycountries` | Liste des pays (référentiel) |

## Paramètres de requête courants

- **`sortfield`** : champ de tri (ex. `t.rowid`, `rowid`).
- **`sortorder`** : `ASC` ou `DESC`.
- **`limit`** / **`page`** : pagination.
- **`mode`** (tiers) : `1` = clients, `2` = fournisseurs.
- **`sqlfilters`** : filtres (ex. `(t.nom:=:'NomSociété')`). Format dépend de l’endpoint ; voir l’explorateur API.

## Liste complète des endpoints (Dolibarr REST API Explorer)

Base URL : `/api/index.php`. Tous les endpoints ci-dessous sont protégés par **DOLAPIKEY** (sauf `/login`).

---

### accountancy

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/accountancy/exportdata` | Export données comptables |

---

### agendaevents

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/agendaevents` | Liste des événements agenda |
| POST | `/agendaevents` | Créer un événement |
| GET | `/agendaevents/{id}` | Détail d’un événement |
| PUT | `/agendaevents/{id}` | Modifier un événement |
| DELETE | `/agendaevents/{id}` | Supprimer un événement |

---

### bankaccounts

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/bankaccounts` | Liste des comptes bancaires |
| POST | `/bankaccounts` | Créer un compte |
| GET | `/bankaccounts/{id}` | Détail d’un compte |
| PUT | `/bankaccounts/{id}` | Modifier un compte |
| DELETE | `/bankaccounts/{id}` | Supprimer un compte |

---

### categories

| Méthode | Chemin | Description |
|--------|--------|-------------|
| (voir spec) | `/categories` | Catégories (produits, tiers, etc.) |

---

### contacts

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/contacts` | Liste des contacts |
| POST | `/contacts` | Créer un contact |
| GET | `/contacts/{id}` | Détail d’un contact |
| PUT | `/contacts/{id}` | Modifier un contact |
| DELETE | `/contacts/{id}` | Supprimer un contact |
| GET | `/contacts/{id}/categories` | Catégories d’un contact |
| PUT | `/contacts/{id}/categories/{category_id}` | Ajouter une catégorie à un contact |
| DELETE | `/contacts/{id}/categories/{category_id}` | Retirer une catégorie d’un contact |
| POST | `/contacts/{id}/createUser` | Créer un compte utilisateur à partir du contact |
| GET | `/contacts/email/{email}` | Détail d’un contact par email |

---

### documents

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/documents` | Liste des documents d’un élément (par ID ou Ref) |
| DELETE | `/documents` | Supprimer un document |
| PUT | `/documents/builddoc` | Construire un document |
| GET | `/documents/download` | Télécharger un document |
| POST | `/documents/upload` | Envoyer un document |

---

### invoices (factures clients)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/invoices` | Liste des factures |
| POST | `/invoices` | Créer une facture |
| GET | `/invoices/{id}` | Détail d’une facture |
| PUT | `/invoices/{id}` | Modifier une facture |
| DELETE | `/invoices/{id}` | Supprimer une facture |
| GET | `/invoices/{id}/lines` | Lignes d’une facture |
| POST | `/invoices/{id}/lines` | Ajouter une ligne |
| PUT | `/invoices/{id}/lines/{lineid}` | Modifier une ligne |
| DELETE | `/invoices/{id}/lines/{lineid}` | Supprimer une ligne |
| GET | `/invoices/{id}/payments` | Paiements d’une facture |
| POST | `/invoices/{id}/payments` | Ajouter un paiement (reste à payer) |
| GET | `/invoices/{id}/discount` | Remise sur la facture |
| POST | `/invoices/{id}/contacts` | Ajouter un contact à une facture |
| POST | `/invoices/{id}/contact/{contactid}/{type}` | Ajouter un type de contact |
| DELETE | `/invoices/{id}/contact/{contactid}/{type}` | Supprimer un type de contact |
| POST | `/invoices/{id}/validate` | Valider une facture |
| POST | `/invoices/{id}/settodraft` | Repasser en brouillon |
| POST | `/invoices/{id}/settopaid` | Marquer comme payée |
| POST | `/invoices/{id}/settounpaid` | Marquer comme non payée |
| POST | `/invoices/{id}/markAsCreditAvailable` | Créer une remise (crédit disponible) pour avoir / acompte |
| POST | `/invoices/{id}/usecreditnote/{discountid}` | Utiliser un avoir pour les paiements |
| POST | `/invoices/{id}/usediscount/{discountid}` | Ajouter une ligne de remise (remise absolue existante) |
| POST | `/invoices/createfromorder/{orderid}` | Créer une facture à partir d’une commande |
| PUT | `/invoices/payments/{id}` | Modifier un paiement |
| POST | `/invoices/paymentsdistributed` | Ajouter un paiement (plusieurs factures, partiel ou total) |
| GET | `/invoices/ref/{ref}` | Détail d’une facture par ref |
| GET | `/invoices/ref_ext/{ref_ext}` | Détail d’une facture par ref_ext |
| GET | `/invoices/templates/{id}` | Détail d’un modèle de facture |

---

### login

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/login` | Login (token) — déconseillé |
| POST | `/login` | Login (token) — déconseillé ; utiliser DOLAPIKEY |

---

### multicurrencies

| Méthode | Chemin | Description |
|--------|--------|-------------|
| (voir spec) | `/multicurrencies` | Devises |

---

### orders (commandes clients)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/orders` | Liste des commandes |
| POST | `/orders` | Créer une commande |
| GET | `/orders/{id}` | Détail d’une commande |
| PUT | `/orders/{id}` | Modifier une commande (sans les lignes) |
| DELETE | `/orders/{id}` | Supprimer une commande |
| GET | `/orders/{id}/lines` | Lignes d’une commande |
| POST | `/orders/{id}/lines` | Ajouter une ligne |
| PUT | `/orders/{id}/lines/{lineid}` | Modifier une ligne |
| DELETE | `/orders/{id}/lines/{lineid}` | Supprimer une ligne |
| GET | `/orders/{id}/contacts` | Contacts d’une commande |
| POST | `/orders/{id}/contact/{contactid}/{type}` | Ajouter un type de contact |
| DELETE | `/orders/{id}/contact/{contactid}/{type}` | Retirer un type de contact |
| POST | `/orders/{id}/validate` | Valider une commande |
| POST | `/orders/{id}/settodraft` | Repasser en brouillon |
| POST | `/orders/{id}/reopen` | Marquer comme validée (ouverte) |
| POST | `/orders/{id}/close` | Clôturer (livrée) |
| POST | `/orders/{id}/setinvoiced` | Marquer comme facturée |
| GET | `/orders/{id}/shipment` | Expéditions de la commande |
| POST | `/orders/{id}/shipment/{warehouse_id}` | Créer une expédition pour la commande |
| POST | `/orders/createfromproposal/{proposalid}` | Créer une commande à partir d’une proposition |
| GET | `/orders/ref/{ref}` | Détail par ref |
| GET | `/orders/ref_ext/{ref_ext}` | Détail par ref_ext |

---

### products (produits / catalogue)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/products` | Liste des produits |
| POST | `/products` | Créer un produit |
| GET | `/products/{id}` | Détail d’un produit |
| PUT | `/products/{id}` | Modifier un produit |
| DELETE | `/products/{id}` | Supprimer un produit |
| GET | `/products/{id}/categories` | Catégories d’un produit |
| GET | `/products/{id}/purchase_prices` | Prix d’achat |
| POST | `/products/{id}/purchase_prices` | Ajouter / mettre à jour prix d’achat |
| DELETE | `/products/{id}/purchase_prices/{priceid}` | Supprimer un prix d’achat |
| GET | `/products/{id}/selling_multiprices/per_customer` | Prix par client |
| GET | `/products/{id}/selling_multiprices/per_quantity` | Prix par quantité |
| GET | `/products/{id}/selling_multiprices/per_segment` | Prix par segment |
| GET | `/products/{id}/stock` | Données de stock du produit |
| GET | `/products/{id}/subproducts` | Sous-produits |
| POST | `/products/{id}/subproducts/add` | Ajouter un sous-produit |
| DELETE | `/products/{id}/subproducts/remove/{subproduct_id}` | Retirer un sous-produit |
| GET | `/products/{id}/variants` | Variantes du produit |
| POST | `/products/{id}/variants` | Ajouter une variante |
| GET | `/products/attributes` | Liste des attributs |
| POST | `/products/attributes` | Créer un attribut |
| GET | `/products/attributes/{id}` | Détail d’un attribut |
| PUT | `/products/attributes/{id}` | Modifier un attribut |
| DELETE | `/products/attributes/{id}` | Supprimer un attribut |
| GET | `/products/attributes/{id}/values` | Valeurs d’un attribut |
| POST | `/products/attributes/{id}/values` | Ajouter une valeur |
| GET | `/products/attributes/{id}/values/ref/{ref}` | Valeur par ref |
| DELETE | `/products/attributes/{id}/values/ref/{ref}` | Supprimer valeur par ref |
| GET | `/products/attributes/ref/{ref}` | Attribut par ref |
| GET | `/products/attributes/ref/{ref}/values` | Valeurs par ref d’attribut |
| GET | `/products/attributes/ref_ext/{ref_ext}` | Attribut par ref_ext |
| GET | `/products/attributes/values/{id}` | Valeur par id |
| PUT | `/products/attributes/values/{id}` | Modifier une valeur |
| DELETE | `/products/attributes/values/{id}` | Supprimer une valeur |
| GET | `/products/barcode/{barcode}` | Détail d’un produit par code-barre |
| GET | `/products/purchase_prices` | Liste de tous les prix d’achat |
| GET | `/products/ref/{ref}` | Détail par ref |
| GET | `/products/ref/{ref}/variants` | Variantes par ref produit |
| POST | `/products/ref/{ref}/variants` | Ajouter variante par ref |
| GET | `/products/ref_ext/{ref_ext}` | Détail par ref_ext |
| GET | `/products/variants/{id}` | Détail variante |
| PUT | `/products/variants/{id}` | Modifier une variante |
| DELETE | `/products/variants/{id}` | Supprimer une variante |

---

### proposals (propositions commerciales / devis)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/proposals` | Liste des propositions |
| POST | `/proposals` | Créer une proposition |
| GET | `/proposals/{id}` | Détail d’une proposition |
| PUT | `/proposals/{id}` | Modifier une proposition (sans les lignes) |
| DELETE | `/proposals/{id}` | Supprimer une proposition |
| GET | `/proposals/{id}/lines` | Lignes d’une proposition |
| POST | `/proposals/{id}/lines` | Ajouter des lignes |
| POST | `/proposals/{id}/line` | Ajouter une ligne |
| PUT | `/proposals/{id}/lines/{lineid}` | Modifier une ligne |
| DELETE | `/proposals/{id}/lines/{lineid}` | Supprimer une ligne |
| POST | `/proposals/{id}/contact/{contactid}/{type}` | Ajouter un type de contact |
| DELETE | `/proposals/{id}/contact/{contactid}/{type}` | Retirer un type de contact |
| POST | `/proposals/{id}/validate` | Valider une proposition |
| POST | `/proposals/{id}/settodraft` | Repasser en brouillon |
| POST | `/proposals/{id}/close` | Clôturer (accepter / refuser) |
| POST | `/proposals/{id}/setinvoiced` | Marquer comme facturée |
| GET | `/proposals/ref/{ref}` | Détail par ref |
| GET | `/proposals/ref_ext/{ref_ext}` | Détail par ref_ext |

---

### receptions (réceptions marchandises)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/receptions` | Liste des réceptions |
| POST | `/receptions` | Créer une réception |
| GET | `/receptions/{id}` | Détail d’une réception |
| PUT | `/receptions/{id}` | Modifier une réception |
| DELETE | `/receptions/{id}` | Supprimer une réception |
| DELETE | `/receptions/{id}/lines/{lineid}` | Supprimer une ligne |
| POST | `/receptions/{id}/validate` | Valider une réception |
| POST | `/receptions/{id}/close` | Clôturer (livrée) |

---

### setup

| Méthode | Chemin | Description |
|--------|--------|-------------|
| (voir spec) | `/setup` | Paramétrage |

---

### shipments (expéditions)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/shipments` | Liste des expéditions |
| POST | `/shipments` | Créer une expédition |
| GET | `/shipments/{id}` | Détail d’une expédition |
| PUT | `/shipments/{id}` | Modifier une expédition |
| DELETE | `/shipments/{id}` | Supprimer une expédition |
| DELETE | `/shipments/{id}/lines/{lineid}` | Supprimer une ligne |
| POST | `/shipments/{id}/validate` | Valider une expédition |
| POST | `/shipments/{id}/close` | Clôturer (livrée) |

---

### status

| Méthode | Chemin | Description |
|--------|--------|-------------|
| (voir spec) | `/status` | Statuts |

---

### stockmovements

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/stockmovements` | Liste des mouvements de stock |
| POST | `/stockmovements` | Créer un mouvement de stock |

---

### supplierinvoices (factures fournisseurs)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/supplierinvoices` | Liste des factures fournisseurs |
| POST | `/supplierinvoices` | Créer une facture fournisseur |
| GET | `/supplierinvoices/{id}` | Détail d’une facture fournisseur |
| PUT | `/supplierinvoices/{id}` | Modifier une facture fournisseur |
| DELETE | `/supplierinvoices/{id}` | Supprimer une facture fournisseur |
| GET | `/supplierinvoices/{id}/lines` | Lignes |
| POST | `/supplierinvoices/{id}/lines` | Ajouter une ligne |
| PUT | `/supplierinvoices/{id}/lines/{lineid}` | Modifier une ligne |
| DELETE | `/supplierinvoices/{id}/lines/{lineid}` | Supprimer une ligne |
| GET | `/supplierinvoices/{id}/payments` | Paiements |
| POST | `/supplierinvoices/{id}/payments` | Ajouter un paiement |
| POST | `/supplierinvoices/{id}/validate` | Valider une facture |

---

### supplierorders (commandes fournisseurs)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/supplierorders` | Liste des commandes fournisseurs |
| POST | `/supplierorders` | Créer une commande fournisseur |
| GET | `/supplierorders/{id}` | Détail d’une commande fournisseur |
| PUT | `/supplierorders/{id}` | Modifier une commande fournisseur |
| DELETE | `/supplierorders/{id}` | Supprimer une commande fournisseur |
| GET | `/supplierorders/{id}/contacts` | Contacts de la commande |
| POST | `/supplierorders/{id}/contact/{contactid}/{type}/{source}` | Ajouter un type de contact |
| DELETE | `/supplierorders/{id}/contact/{contactid}/{type}/{source}` | Retirer un type de contact |
| POST | `/supplierorders/{id}/validate` | Valider une commande |
| POST | `/supplierorders/{id}/approve` | Approuver une commande |
| POST | `/supplierorders/{id}/makeorder` | Envoyer la commande au fournisseur |
| POST | `/supplierorders/{id}/receive` | Réceptionner la commande (répartition produits) |

---

### supplierproposals

| Méthode | Chemin | Description |
|--------|--------|-------------|
| (voir spec) | `/supplierproposals` | Propositions fournisseurs |

---

### thirdparties (tiers / clients / fournisseurs)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/thirdparties` | Liste des tiers |
| POST | `/thirdparties` | Créer un tiers |
| GET | `/thirdparties/{id}` | Détail d’un tiers |
| PUT | `/thirdparties/{id}` | Modifier un tiers |
| DELETE | `/thirdparties/{id}` | Supprimer un tiers |
| GET | `/thirdparties/{id}/bankaccounts` | Comptes bancaires du tiers |
| POST | `/thirdparties/{id}/bankaccounts` | Créer un compte bancaire |
| PUT | `/thirdparties/{id}/bankaccounts/{bankaccount_id}` | Modifier un compte bancaire |
| DELETE | `/thirdparties/{id}/bankaccounts/{bankaccount_id}` | Supprimer un compte bancaire |
| GET | `/thirdparties/{id}/categories` | Catégories client |
| PUT | `/thirdparties/{id}/categories/{category_id}` | Ajouter une catégorie client |
| DELETE | `/thirdparties/{id}/categories/{category_id}` | Retirer une catégorie client |
| GET | `/thirdparties/{id}/supplier_categories` | Catégories fournisseur |
| PUT | `/thirdparties/{id}/supplier_categories/{category_id}` | Ajouter une catégorie fournisseur |
| DELETE | `/thirdparties/{id}/supplier_categories/{category_id}` | Retirer une catégorie fournisseur |
| GET | `/thirdparties/{id}/fixedamountdiscounts` | Remises fixes (acomptes, avoirs, offres…) |
| GET | `/thirdparties/{id}/gateways` | Passerelle(s) attachée(s) |
| POST | `/thirdparties/{id}/gateways` | Créer une passerelle |
| PUT | `/thirdparties/{id}/gateways/{site}` | Créer / remplacer une passerelle pour un site |
| PATCH | `/thirdparties/{id}/gateways/{site}` | Mettre à jour une passerelle |
| DELETE | `/thirdparties/{id}/gateways/{site}` | Supprimer une passerelle |
| DELETE | `/thirdparties/{id}/gateways` | Supprimer toutes les passerelles |
| GET | `/thirdparties/{id}/generateBankAccountDocument/{companybankid}/{model}` | Générer un document (ex. mandat SEPA) |
| GET | `/thirdparties/{id}/getinvoicesqualifiedforcreditnote` | Factures éligibles à un avoir |
| GET | `/thirdparties/{id}/getinvoicesqualifiedforreplacement` | Factures éligibles à remplacement |
| PUT | `/thirdparties/{id}/merge/{idtodelete}` | Fusionner un tiers dans un autre |
| GET | `/thirdparties/{id}/outstandinginvoices` | Factures impayées |
| GET | `/thirdparties/{id}/outstandingorders` | Commandes en attente |
| GET | `/thirdparties/{id}/outstandingproposals` | Propositions en attente |
| GET | `/thirdparties/{id}/representatives` | Représentants du tiers |
| PUT | `/thirdparties/{id}/setpricelevel/{priceLevel}` | Définir le niveau de prix |
| GET | `/thirdparties/barcode/{barcode}` | Détail d’un tiers par code-barre |
| GET | `/thirdparties/email/{email}` | Détail d’un tiers par email |

---

### tickets

| Méthode | Chemin | Description |
|--------|--------|-------------|
| (voir spec) | `/tickets` | Support / tickets |

---

### users

| Méthode | Chemin | Description |
|--------|--------|-------------|
| (voir spec) | `/users` | Utilisateurs |

---

### warehouses (entrepôts)

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/warehouses` | Liste des entrepôts |
| POST | `/warehouses` | Créer un entrepôt |
| GET | `/warehouses/{id}` | Détail d’un entrepôt |
| PUT | `/warehouses/{id}` | Modifier un entrepôt |
| DELETE | `/warehouses/{id}` | Supprimer un entrepôt |

---

*Détail des paramètres, schémas et réponses : **`swagger-from-instance.json`** ou explorateur [bdcloud.luxgreen.net/api/index.php/explorer/#/](https://bdcloud.luxgreen.net/api/index.php/explorer/#/).*

## Explorateur API

Instance bdcloud : [https://bdcloud.luxgreen.net/api/index.php/explorer/#/](https://bdcloud.luxgreen.net/api/index.php/explorer/#/)

Coller la clé API (DOLAPIKEY) en haut à droite pour lister et tester tous les endpoints disponibles selon les modules activés.

## Réponses

- **200** : succès (corps = objet(s) ou ID selon l’endpoint).
- **403** : accès refusé.
- **404** : ressource non trouvée.
- **500** : erreur serveur (réponse peut contenir `{"error": {"code": "...", "message": "..."}}`).

## Références

- [Module Web Services API REST (wiki Dolibarr)](https://wiki.dolibarr.org/index.php/Module_Web_Services_API_REST_(developer))
- [Documentation développeur](https://www.dolibarr.org/developer-documentation.php)
