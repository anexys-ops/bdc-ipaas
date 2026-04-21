export function isKeycloakConfigured(): boolean {
  const url = import.meta.env.VITE_KEYCLOAK_URL?.trim();
  const realm = import.meta.env.VITE_KEYCLOAK_REALM?.trim();
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID?.trim();
  return Boolean(url && realm && clientId);
}
