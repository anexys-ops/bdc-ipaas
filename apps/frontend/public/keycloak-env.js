/* En dev : le SSO utilise Vite (import.meta.env). En prod Docker, ce fichier est
   écrasé au démarrage du conteneur (voir docker/frontend-entrypoint.sh). */
if (typeof window !== 'undefined') {
  window.__KEYCLOAK_CONFIG__ = undefined;
}
