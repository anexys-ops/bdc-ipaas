import Keycloak from 'keycloak-js';
import { isKeycloakConfigured } from './keycloak-config';

let instance: Keycloak | null = null;

export function getKeycloak(): Keycloak {
  if (!isKeycloakConfigured()) {
    throw new Error('Keycloak non configuré (VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID)');
  }
  if (!instance) {
    instance = new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL!.replace(/\/$/, ''),
      realm: import.meta.env.VITE_KEYCLOAK_REALM!,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID!,
    });
  }
  return instance;
}
