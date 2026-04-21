# Inspiration Ultimate – Fonctionnalités, front et back office

Référence : Unified API for Accounting, POS, Ecommerce & Invoicing.

## 1. Fonctionnalités à s’inspirer

### Produits / APIs unifiées
- **Unified APIs** : une intégration = accès à toutes les plateformes d’une catégorie.
- **Catégories** : Accounting, Invoicing & CRM, Ecommerce, POS, Payment, PMS.
- **Syncs** : Ecommerce Sync, POS Sync, Invoices Sync, PMS Sync, Payments Sync, Expenses Sync.
- **Ultimate for AI** : couche d’intégration pour agents IA (100+ apps financières, 1 clic, pas de maintenance).

### Expérience utilisateur
- **Activation en un clic** : connecter le logiciel des utilisateurs en un clic.
- **Scalabilité** : infrastructure pensée pour monter en charge sans limite.
- **Zéro maintenance** : les éditeurs se concentrent sur leur cœur de métier.

### Features opérationnelles
- **Create** : doc unifiée, SDKs, outils dev pour intégrer aux APIs.
- **Activate** : ajout de connecteurs en 1 clic, auth simple, onboarding avancé.
- **Monitor** : dashboard d’usage, logs de transactions, alertes, sécurité.

### Pays / marchés
- France, Belgique, Pays-Bas, Allemagne, Italie, Espagne, UK, Suisse, Nordics.

---

## 2. Front (inspiration Ultimate)

- **Hero** : titre percutant (« Connect to financial software in one click »), CTA « Book a demo ».
- **Trusted by** : logos clients.
- **Blocs avantages** : One-click activation, Unlimited scalability, No maintenance.
- **Produits** : cartes par catégorie (Accounting, Invoicing, Ecommerce, POS, Payment, PMS) avec lien « Learn more ».
- **Syncs** : liste des syncs avec court descriptif + lien « Learn more ».
- **Intégrations** : grille de logos par catégorie, lien « All integrations » / « Discover 100+ connectors ».
- **Ultimate for AI** : encart dédié avec lien « Learn more ».
- **Features** : Create, Activate, Monitor avec « LEARN MORE ».

À reproduire côté BDC iPaaS :
- Marketplace avec filtres par catégorie (Accounting, Invoicing, Ecommerce, POS, Payment, PMS, PA).
- Cartes connecteurs avec logo, nom, catégorie, statut (Live), étoiles, tarif.
- Page détail connecteur (description, endpoints, config).

---

## 3. Back office (inspiration Ultimate)

- **Gestion des connecteurs** : liste des logiciels par catégorie, statut (Live / Soon).
- **Overlay marketplace** : étoiles, tarif affiché, description, fichier API (déjà en place).
- **Monitoring** : tableau de bord d’usage, logs, alertes (à renforcer si besoin).

Éléments déjà présents dans BDC iPaaS :
- `MarketplaceManagementPage` : étoiles, tarif, description, apiJsonPath par connecteur.
- API admin : CRUD sur les items marketplace (connectorId, stars, priceLabel, description, apiJsonPath).

---

## 4. Liste des logiciels Ultimate (pour la marketplace)

| Nom | Catégorie | ID connecteur suggéré |
|-----|------------|------------------------|
| Abill | POS | abill |
| Acd | Accounting | acd |
| … (voir docs/ultimate-marketplace-software.json) |

Ce document sert de référence pour aligner la marketplace et le back office sur le modèle Ultimate.
