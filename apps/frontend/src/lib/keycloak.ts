import Keycloak from 'keycloak-js';
import { getKeycloakSettings, isKeycloakConfigured } from './keycloak-config';

let instance: Keycloak | null = null;

export function getKeycloak(): Keycloak {
  if (!isKeycloakConfigured()) {
    throw new Error('Keycloak non configuré (VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID)');
  }
  if (!instance) {
    const cfg = getKeycloakSettings()!;
    instance = new Keycloak({
      url: cfg.url,
      realm: cfg.realm,
      clientId: cfg.clientId,
    });
  }
  return instance;
}
