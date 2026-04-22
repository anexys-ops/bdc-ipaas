declare global {
  interface Window {
    /** Injecté en prod par /keycloak-env.js (entrypoint Docker), avant le bundle. */
    __KEYCLOAK_CONFIG__?: { url?: string; realm?: string; clientId?: string };
  }
}

export interface KeycloakPublicConfig {
  url: string;
  realm: string;
  clientId: string;
}

/** Config SSO : 1) runtime (Docker) 2) build Vite (import.meta.env) */
export function getKeycloakSettings(): KeycloakPublicConfig | null {
  const w = typeof window !== 'undefined' ? window.__KEYCLOAK_CONFIG__ : undefined;
  if (w?.url?.trim() && w?.realm?.trim() && w?.clientId?.trim()) {
    return {
      url: w.url.trim().replace(/\/$/, ''),
      realm: w.realm.trim(),
      clientId: w.clientId.trim(),
    };
  }
  const url = import.meta.env.VITE_KEYCLOAK_URL?.trim();
  const realm = import.meta.env.VITE_KEYCLOAK_REALM?.trim();
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID?.trim();
  if (url && realm && clientId) {
    return { url: url.replace(/\/$/, ''), realm, clientId };
  }
  return null;
}

export function isKeycloakConfigured(): boolean {
  return getKeycloakSettings() !== null;
}
