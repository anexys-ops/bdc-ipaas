# Logos des connecteurs

Ce dossier contient les logos affichés pour chaque logiciel.

**Logos réels (téléchargés) :**
- **Sage** (sage.svg, sage-100.svg, sage-x3.svg, sage-psc.svg) : Wikimedia Commons – Sage Group logo.
- **EBP / Cegid** (ebp.svg, ebp-sdk.svg, ebp-saas.svg) : Wikimedia Commons – Cegid logo 2018 (EBP fait partie de Cegid).
- **Dolibarr** (dolibarr.png) : Wikimedia Commons – logo officiel Dolibarr.
- **Connecteurs SaaS courants** (SVG) : worldvectorlogo.com et/ou jsDelivr (simple-icons) pour Shopify, Salesforce, HubSpot, Stripe, Slack, Notion, Airtable, Google Sheets, WooCommerce, PrestaShop, Zendesk, Mailchimp, GitHub, Xero, QuickBooks, Pipedrive, Trello, Twilio, Asana, Odoo — voir ticket Linear BDC-81 pour la liste cible et les sources.

**Placeholder :**
- **Sellsy** (sellsy.svg) : placeholder texte ; remplacer par le logo officiel si besoin.

Les logos sont affichés avec des tailles cohérentes (object-contain) dans le marketplace, la page détail et la liste des connecteurs. Pour ajouter un nouveau connecteur : ajoutez son `id` dans `src/lib/connector-logos.ts` et déposez le fichier `{id}.svg` ou `{id}.png` ici.
