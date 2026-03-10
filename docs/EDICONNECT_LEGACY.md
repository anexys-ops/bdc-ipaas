# Référence ancien logiciel EDI-Connect

Document récapitulatif des routes, liens et informations extraits de l’ancien module **edi-connect-module** (Odoo) pour les reporter dans le nouveau projet ANEXYS iPaaS (bdc-ipaas).

---

## 1. Emplacements des anciens projets

| Projet / Dossier | Emplacement | Contenu |
|------------------|-------------|---------|
| **edi-connect-module** (Odoo) | `~/Desktop/edi-connect-module` | Module Odoo avec controllers, vue facture, export JSON |
| **EDICONNECT** (Nextcloud) | `~/Nextcloud/04-COMMUNICATION/EDICONNECT` | Ressources (images) uniquement |
| **EDIConnect_ultimate** | À préciser si autre chemin | Controllers à répliquer si vous avez ce repo ailleurs |

---

## 2. Routes / URLs de l’ancien module (Odoo)

### 2.1 Export facture en JSON

| Ancien (Odoo) | Description | Équivalent nouveau (bdc-ipaas) |
|---------------|-------------|---------------------------------|
| **GET** `/edi-connect/export_json/${active_id}` | Exporte une facture (account.move) en JSON. Ouverture dans un nouvel onglet (`target=new`). | **GET** `/api/v1/billing/invoices/:id` et **GET** `/api/v1/billing/invoices/:id/export` |

- **Modèle Odoo** : `account.move` (facture).
- **Action** : `ir.actions.act_url` — bouton « Exporter la Facture » sur le formulaire facture, après le bouton « Enregistrer le paiement ».

### 2.2 Controllers Python (référence)

Dans l’ancien module, le package controllers contient :

- `controllers/__init__.py` : imports `controllers` et `ordersController`.
- Les fichiers `controllers.py` et `ordersController.py` étaient prévus dans la même arborescence (parfois absents selon les copies).

Toute route côté Odoo passait par des contrôleurs HTTP Odoo (ex. `@http.route('/edi-connect/export_json/<int:active_id>')`). Le détail du code Python (nom exact des méthodes, paramètres) est à récupérer depuis le projet **EDIConnect_ultimate** si vous le localisez.

---

## 3. Vues et actions (Odoo)

### 3.1 Fichiers concernés

- **views/invoice.xml**
  - Action URL : `action_export_invoice_json` → URL `/edi-connect/export_json/${active_id}`.
  - Héritage de vue : `account.view_move_form` — ajout du bouton « Exporter la Facture » (`action_export_json`).

- **views/views.xml**
  - Menus / actions EDI-Connect (définitions commentées : list, window, server, menuitems).

- **views/templates.xml**
  - Templates (commentés).

---

## 4. Correspondance ancien → nouveau (bdc-ipaas)

| Fonctionnalité ancienne | Implémentation nouvelle |
|-------------------------|--------------------------|
| Export facture en JSON (1 facture par ID) | **GET** ` /api/v1/billing/invoices/:id` — détail facture en JSON. |
| Export explicite “export” (lien équivalent) | **GET** ` /api/v1/billing/invoices/:id/export` — même payload JSON, pour compatibilité avec l’usage “export”. |
| Liste des factures | **GET** ` /api/v1/billing/invoices` — déjà présent. |

Base URL API : `http://localhost:3000/api/v1` (voir `ACCES.md`).

---

## 5. À faire si vous retrouvez EDIConnect_ultimate

Si vous avez le projet **EDIConnect_ultimate** (ou un autre dépôt avec les vrais controllers) :

1. Lister tous les `@http.route` ou équivalents (Flask, FastAPI, etc.).
2. Noter pour chaque route : méthode HTTP, chemin, paramètres, description.
3. Mettre à jour ce document dans la section « Routes / URLs ».
4. Ajouter ou adapter les endpoints correspondants dans `apps/api` (NestJS) et les documenter ici dans la table de correspondance.

---

## 6. Résumé des liens utiles

- **Documentation API actuelle (Swagger)** : http://localhost:3000/api/docs  
- **Front-office** : http://localhost:5173  
- **Back-office API** : http://localhost:3000  

Ces URLs sont aussi décrites dans `ACCES.md` à la racine du projet.
