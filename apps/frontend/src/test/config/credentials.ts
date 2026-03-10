/**
 * Identifiants et URLs pour les tests (auth, E2E).
 * Les valeurs par défaut correspondent au seed (ACCES.md).
 * En CI ou autre env, utiliser VITE_TEST_USER_EMAIL, VITE_TEST_USER_PASSWORD, VITE_API_URL.
 */
export const TEST_CREDENTIALS = {
  email: import.meta.env.VITE_TEST_USER_EMAIL ?? 'admin@anexys.fr',
  password: import.meta.env.VITE_TEST_USER_PASSWORD ?? 'MotDePasse123!',
} as const;

export const TEST_API_BASE =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
