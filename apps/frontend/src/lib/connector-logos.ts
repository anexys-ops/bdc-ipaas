/**
 * Connecteurs pour lesquels un logo local est disponible dans public/logos/.
 * Fichiers réels téléchargés (Sage, Cegid/EBP, Dolibarr) ou placeholder (Sellsy).
 */
const CONNECTORS_WITH_LOCAL_LOGO = [
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

/** Extension par connecteur (dolibarr en PNG, le reste en SVG). */
const LOGO_EXTENSION: Record<string, string> = {
  dolibarr: 'png',
};

/**
 * Retourne l’URL du logo à afficher pour un connecteur.
 * Priorité : logo local (public/logos/{id}.svg ou .png), sinon icône fournie par l’API.
 */
export function getConnectorLogoUrl(connectorId: string, apiIcon?: string | null): string {
  if (!connectorId) return apiIcon || '';
  const useLocal =
    CONNECTORS_WITH_LOCAL_LOGO.includes(connectorId as (typeof CONNECTORS_WITH_LOCAL_LOGO)[number]);
  if (useLocal) {
    const ext = LOGO_EXTENSION[connectorId] ?? 'svg';
    return `/logos/${connectorId}.${ext}`;
  }
  return apiIcon?.trim() || '';
}
