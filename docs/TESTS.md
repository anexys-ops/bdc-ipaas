# Guide des tests automatisés — ANEXYS iPaaS

Ce document décrit les modules de tests, les accès (credentials), et comment exécuter les différents types de tests.

## Structure des tests

### Frontend (Vitest + React Testing Library)

| Dossier / Fichier | Rôle |
|-------------------|------|
| `apps/frontend/src/test/config/` | Configuration centralisée : credentials, liste des routes |
| `apps/frontend/src/test/auth/` | Vérification des **tokens** et des **endpoints d’auth** (login, refresh, structure des réponses) |
| `apps/frontend/src/test/routes/` | **Mapping des routes** : chaque route déclarée rend la bonne page, redirections |
| `apps/frontend/src/test/navigation/` | **Liens et boutons** : menu, liens du layout, bouton déconnexion, aria-expanded |
| `apps/frontend/src/test/utils/test-wrapper.tsx` | Wrapper QueryClient + (optionnel) Router pour les tests composants |
| `apps/frontend/src/test/setup.ts` | Setup global (jest-dom, mock localStorage pour zustand persist) |

### API (Jest + Supertest)

| Fichier | Rôle |
|---------|------|
| `apps/api/src/modules/auth/auth.controller.spec.ts` | **Tokens et auth** : login (200/401), refresh (200/401), logout (204), logout-all (204), structure des réponses |

### E2E (Playwright)

| Dossier / Fichier | Rôle |
|-------------------|------|
| `apps/frontend/e2e/auth.spec.ts` | Connexion, redirection après login, accès /dashboard sans auth |
| `apps/frontend/e2e/navigation.spec.ts` | **Navigation** : tous les liens du menu, menu déroulant, Déconnexion |
| `apps/frontend/e2e/links.spec.ts` | **Liens** : page d’accueil, login → marketplace, route inconnue → pas de 404 |
| `apps/frontend/e2e/fixtures/auth.ts` | Fixture optionnelle « utilisateur authentifié » pour E2E |
| `apps/frontend/playwright.config.ts` | Config Playwright (baseURL, webServer, trace, screenshot) |

## Accès et credentials

- **Fichier de config des credentials (tests)** : `apps/frontend/src/test/config/credentials.ts`
- **Exemple (documentation)** : `apps/frontend/src/test/config/credentials.example.ts`
- **Identifiants par défaut (après seed)** : voir `ACCES.md` à la racine — `admin@anexys.fr` / `MotDePasse123!`

Variables d’environnement optionnelles (E2E ou tests d’intégration) :

- `VITE_TEST_USER_EMAIL` — email de test
- `VITE_TEST_USER_PASSWORD` — mot de passe de test
- `VITE_API_URL` — URL de l’API (ex. `http://localhost:3000/api/v1`)

Pour les tests **auth (tokens)** côté frontend qui appellent l’API réelle : si l’API n’est pas joignable, les tests sont ignorés (pas d’échec). Lancer l’API + seed pour les faire jouer.

## Commandes

```bash
# Tests unitaires / intégration frontend
pnpm --filter @anexys/frontend test
# ou depuis apps/frontend
pnpm run test
pnpm run test -- --run   # une seule exécution (sans watch)

# Tests API (auth controller, etc.)
pnpm --filter @anexys/api test
# ou depuis apps/api
pnpm run test
pnpm run test -- auth.controller.spec

# E2E Playwright (démarre le serveur frontend si besoin)
cd apps/frontend && pnpm run test:e2e
# avec UI
pnpm run test:e2e:ui
```

## Vérifications couvertes

1. **Tokens** : endpoints login/refresh/logout retournent les bons codes (200, 401, 204) et la structure attendue (accessToken, user).
2. **Mapping des routes** : routes publiques/privées, redirection non authentifié → /login, route inconnue → /.
3. **Navigation et boutons** : liens du menu (Tableau de bord, Flux, Connecteurs, Mappings, Audit, Marketplace), menu déroulant (Mon compte, Ma clé API, Facturation, Déconnexion), aria-expanded.
4. **Liens** : pas de 404 sur les liens testés (accueil, login, marketplace, route inconnue).

Pour toute question sur une librairie de test ou une bonne pratique, s’appuyer sur la doc officielle (Vitest, Playwright, Testing Library) et les recommandations à jour.
