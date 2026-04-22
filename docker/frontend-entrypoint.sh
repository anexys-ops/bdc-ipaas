#!/bin/sh
# Génère /keycloak-env.js pour activer le SSO sans repasser par un build Vite
# (les VITE_* ne sont pas toujours présents au moment du docker build).
set -e

html_root=/usr/share/nginx/html
out="$html_root/keycloak-env.js"

json_escape() {
  # Échappement minimal JSON pour des URLs / identifiants sans caractères de contrôle
  printf '%s' "$1" | sed 's/\\/\\\\/g;s/"/\\"/g'
}

u="$VITE_KEYCLOAK_URL"
r="$VITE_KEYCLOAK_REALM"
c="$VITE_KEYCLOAK_CLIENT_ID"

if [ -n "$u" ] && [ -n "$r" ] && [ -n "$c" ]; then
  uj=$(json_escape "$u")
  rj=$(json_escape "$r")
  cj=$(json_escape "$c")
  printf 'window.__KEYCLOAK_CONFIG__={url:"%s",realm:"%s",clientId:"%s"};\n' \
    "$uj" "$rj" "$cj" >"$out"
else
  echo '/* pas de config Keycloak en variables d’environnement */ window.__KEYCLOAK_CONFIG__=undefined;' >"$out"
fi

exec nginx -g "daemon off;"
