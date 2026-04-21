import type { ConfiguredConnector, ConnectorOperation, MarketplaceConnector } from '../types';

const rawMode = (import.meta.env.VITE_CONNECTOR_MODE ?? 'FILE_ONLY') as string;
export const FILE_ONLY_MODE = rawMode.toUpperCase() === 'FILE_ONLY';

const rawAllowedConnectors = (import.meta.env.VITE_FILE_ONLY_CONNECTORS ?? '') as string;
const allowedConnectorIds = new Set(
  rawAllowedConnectors
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

const FILE_HINTS = ['file', 'fichier', 'upload', 'download', 'import', 'export'];
/** Transport réseau explicite : les formats CSV/JSON/TXT passent par le connecteur file-formats. */
const BLOCKED_HINTS = ['ftp', 'sftp'];

function containsAny(text: string, hints: string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

export function isFileConnectorAllowed(connectorId: string): boolean {
  if (!FILE_ONLY_MODE) return true;
  if (allowedConnectorIds.size === 0) return true;
  return allowedConnectorIds.has(connectorId.toLowerCase());
}

export function filterMarketplaceConnectors(connectors: MarketplaceConnector[]): MarketplaceConnector[] {
  return connectors.filter((connector) => isFileConnectorAllowed(connector.id));
}

export function filterConfiguredConnectors(connectors: ConfiguredConnector[]): ConfiguredConnector[] {
  return connectors.filter((connector) => isFileConnectorAllowed(connector.type));
}

export function isFileOperation(operation: ConnectorOperation): boolean {
  if (!FILE_ONLY_MODE) return true;

  const format = (operation.fileFormat ?? '').toLowerCase();
  if (format && !containsAny(format, BLOCKED_HINTS)) {
    return true;
  }

  const haystack = [operation.id, operation.label, operation.description, operation.path]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (containsAny(haystack, BLOCKED_HINTS)) {
    return false;
  }
  return containsAny(haystack, FILE_HINTS);
}
