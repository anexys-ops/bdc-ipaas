#!/bin/bash
# Crée les dossiers et openapi.json minimaux pour les connecteurs Ultimate manquants.

set -e
CONNECTORS_ROOT="$(dirname "$0")/../connectors"
cd "$CONNECTORS_ROOT"

# Liste id|name|category (catégories alignées sur le projet: Accounting, Invoicing & CRM, Ecommerce, POS, Payment, PMS, ERP)
CONNECTORS=(
  "abill|Abill|POS"
  "acd|Acd|Accounting"
  "addictill|AddicTill|POS"
  "afas-software|Afas Software|Accounting"
  "amazon|Amazon|Ecommerce"
  "apitic|Apitic|POS"
  "atillasoft|AtillaSoft|POS"
  "axonaut|Axonaut|Invoicing & CRM"
  "bdp-net|Bdp Net|POS"
  "billit|Billit|Invoicing & CRM"
  "boond-manager|Boond Manager|Invoicing & CRM"
  "carrepos|CarréPOS|POS"
  "cashmag|CashMag|POS"
  "cashpad|Cashpad|POS"
  "cegid-loop|Cegid Loop|Accounting"
  "cegid-retail|Cegid Retail|POS"
  "cegid-revo|Cegid Revo|POS"
  "chargebee|Chargebee|Invoicing & CRM"
  "clyo|Clyo Systems|POS"
  "connectill|Connectill|POS"
  "datev|DATEV|Accounting"
  "evoliz|Evoliz|Invoicing & CRM"
  "exact|Exact|Accounting"
  "factomos|Factomos|Invoicing & CRM"
  "fastmag|Fastmag|POS"
  "freeagent|FreeAgent|Accounting"
  "fuga|Fuga|Invoicing & CRM"
  "fulll|Fulll|Accounting"
  "fulle|Fülle|POS"
  "gocardless|GoCardless|Payment"
  "harvest|Harvest|Invoicing & CRM"
  "hellocash|HelloCash|POS"
  "hiboutik|Hiboutik|POS"
  "holded|Holded|Accounting"
  "horus|Horus|Accounting"
  "hyperline|Hyperline|Invoicing & CRM"
  "innovorder|Innovorder|POS"
  "inqom|Inqom|Accounting"
  "jalia|Jalia|POS"
  "laddition|L'Addition|POS"
  "leo2|LEO2|POS"
  "last-app|Last.app|POS"
  "lexware-office|Lexware Office|Accounting"
  "lightspeed|Lightspeed|POS"
  "mews|Mews|PMS"
  "dynamics-365-business-central|Microsoft Dynamics 365 Business Central|Accounting"
  "pennylane|Pennylane|Accounting"
  "planity|Planity|POS"
  "qonto|Qonto|Payment"
  "sage-200-es|Sage 200 ES|Accounting"
  "tripletex|Tripletex|Accounting"
  "zelty|Zelty|POS"
  "a3erp|a3ERP|Accounting"
  "myunisoft|MyUnisoft|Accounting"
  "odoo|Odoo|Accounting"
)

for entry in "${CONNECTORS[@]}"; do
  IFS='|' read -r id name category <<< "$entry"
  dir="$id"
  if [ -d "$dir" ]; then
    echo "Skip (exists): $dir"
    continue
  fi
  mkdir -p "$dir"
  # Logo: clearbit si domaine connu, sinon placeholder
  domain=""
  case "$id" in
    pennylane) domain="pennylane.com";;
    qonto) domain="qonto.com";;
    datev) domain="datev.de";;
    exact) domain="exact.com";;
    holded) domain="holded.com";;
    hubspot) domain="hubspot.com";;
    harvest) domain="harvest.com";;
    chargebee) domain="chargebee.com";;
    gocardless) domain="gocardless.com";;
    lightspeed) domain="lightspeedhq.com";;
    mews) domain="mews.com";;
    odoo) domain="odoo.com";;
    *) domain="${id}.com";;
  esac
  icon="https://logo.clearbit.com/${domain}"
  cat > "$dir/openapi.json" << EOF
{
  "connector_meta": {
    "id": "$id",
    "name": "$name",
    "version": "1.0",
    "icon": "$icon",
    "category": "$category",
    "auth_type": "api_key",
    "docs_url": null,
    "config_instructions": "Référence Ultimate : configurer l'URL de base et la clé API selon la documentation du fournisseur."
  },
  "auth_config": {
    "base_url_param": "base_url",
    "api_key_header": "X-API-Key"
  },
  "operations": [
    {
      "id": "list_records",
      "label": "Lister les enregistrements (placeholder)",
      "type": "source",
      "method": "GET",
      "path": "/api/records",
      "output_schema": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" } } }
    }
  ]
}
EOF
  echo "Created: $dir ($name)"
done
echo "Done."
