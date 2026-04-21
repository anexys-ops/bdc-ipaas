/**
 * Bibliothèque d’icônes logiciels : logos locaux (/public/logos) + marques via Iconify (collection simple-icons, teinte unifiée).
 */

/** Teinte slate-500 — cohérente sur fond clair. */
export const SOFTWARE_LOGO_TINT = '#64748b';

const ICONIFY_COLOR = encodeURIComponent(SOFTWARE_LOGO_TINT);

/** SVG harmonisé (Simple Icons via Iconify, couleur unifiée). */
export function harmonizedSimpleIconUrl(slug: string): string {
  const s = slug.trim().toLowerCase();
  return `https://api.iconify.design/simple-icons:${encodeURIComponent(s)}.svg?color=${ICONIFY_COLOR}`;
}

const LOCAL_LOGO_EXTENSIONS: Record<string, 'svg' | 'png'> = {};

const LOCAL_CONNECTOR_IDS = [
  'ebp-sdk',
  'ebp',
  'ebp-saas',
  'sage-100',
  'sage-x3',
  'sage-psc',
  'sage',
  'sellsy',
  'dolibarr',
] as const;

export function getLocalSoftwareLogoUrl(connectorId: string): string | null {
  if (!connectorId) return null;
  if (!(LOCAL_CONNECTOR_IDS as readonly string[]).includes(connectorId)) return null;
  const ext = LOCAL_LOGO_EXTENSIONS[connectorId] ?? 'svg';
  return `/logos/${connectorId}.${ext}`;
}

/**
 * Slug Simple Icons (vérifié via api.iconify.design) par ID connecteur.
 * Les IDs absents utilisent l’URL d’icône OpenAPI en secours.
 */
export const CONNECTOR_SIMPLE_ICON_SLUG: Record<string, string> = {
  airtable: 'airtable',
  amazon: 'amazon',
  asana: 'asana',
  datev: 'datev',
  dolibarr: 'dolibarr',
  'dynamics-365-business-central': 'microsoft',
  dynamics365: 'dynamics365',
  github: 'github',
  'google-sheets': 'googlesheets',
  hubspot: 'hubspot',
  mailchimp: 'mailchimp',
  notion: 'notion',
  odoo: 'odoo',
  'pa-odoo': 'odoo',
  'pa-sage': 'sage',
  prestashop: 'prestashop',
  quickbooks: 'quickbooks',
  sage: 'sage',
  'sage-100': 'sage',
  'sage-200-es': 'sage',
  'sage-psc': 'sage',
  'sage-x3': 'sage',
  salesforce: 'salesforce',
  shopify: 'shopify',
  slack: 'slack',
  stripe: 'stripe',
  trello: 'trello',
  twilio: 'twilio',
  woocommerce: 'woocommerce',
  xero: 'xero',
  zendesk: 'zendesk',
};

const UNIQUE_SIMPLE_ICON_SLUGS = Array.from(new Set(Object.values(CONNECTOR_SIMPLE_ICON_SLUG))).sort((a, b) =>
  a.localeCompare(b),
);

export type SoftwareLogoCatalogEntry = {
  id: string;
  label: string;
  url: string;
};

function localCatalogEntries(): SoftwareLogoCatalogEntry[] {
  return LOCAL_CONNECTOR_IDS.map((connectorId) => ({
    id: `local:${connectorId}`,
    label: `Logo local — ${connectorId}`,
    url: getLocalSoftwareLogoUrl(connectorId)!,
  }));
}

function simpleIconCatalogEntries(): SoftwareLogoCatalogEntry[] {
  return UNIQUE_SIMPLE_ICON_SLUGS.map((slug) => ({
    id: `si:${slug}`,
    label: `Marque (SVG) — ${slug}`,
    url: harmonizedSimpleIconUrl(slug),
  }));
}

let cachedCatalog: SoftwareLogoCatalogEntry[] | null = null;

/** Liste pour le sélecteur admin (tri par libellé). */
export function getSoftwareLogoCatalog(): SoftwareLogoCatalogEntry[] {
  if (!cachedCatalog) {
    cachedCatalog = [...localCatalogEntries(), ...simpleIconCatalogEntries()].sort((a, b) =>
      a.label.localeCompare(b.label, 'fr'),
    );
  }
  return cachedCatalog;
}

const catalogById = new Map<string, SoftwareLogoCatalogEntry>();

function ensureCatalogIndex(): void {
  if (catalogById.size > 0) return;
  for (const e of getSoftwareLogoCatalog()) {
    catalogById.set(e.id, e);
  }
}

export function getSoftwareLogoById(libraryLogoId: string | null | undefined): SoftwareLogoCatalogEntry | null {
  if (!libraryLogoId?.trim()) return null;
  ensureCatalogIndex();
  return catalogById.get(libraryLogoId.trim()) ?? null;
}

/**
 * URL d’affichage : entrée bibliothèque admin → logo local → marque harmonisée → icône OpenAPI.
 */
export function resolveMarketplaceLogoUrl(
  connectorId: string,
  apiIcon?: string | null,
  libraryLogoId?: string | null,
): string {
  const fromLib = getSoftwareLogoById(libraryLogoId);
  if (fromLib?.url) return fromLib.url;

  const local = getLocalSoftwareLogoUrl(connectorId);
  if (local) return local;

  const slug = CONNECTOR_SIMPLE_ICON_SLUG[connectorId];
  if (slug) return harmonizedSimpleIconUrl(slug);

  return apiIcon?.trim() ?? '';
}
