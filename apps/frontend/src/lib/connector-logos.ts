export {
  resolveMarketplaceLogoUrl,
  getSoftwareLogoCatalog,
  getSoftwareLogoById,
  harmonizedSimpleIconUrl,
  SOFTWARE_LOGO_TINT,
} from './software-logo-library';

import { resolveMarketplaceLogoUrl } from './software-logo-library';

/** Résolution automatique (sans entrée bibliothèque admin). */
export function getConnectorLogoUrl(connectorId: string, apiIcon?: string | null): string {
  return resolveMarketplaceLogoUrl(connectorId, apiIcon, null);
}
