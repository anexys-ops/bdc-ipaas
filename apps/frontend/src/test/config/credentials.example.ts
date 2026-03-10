/**
 * Exemple de configuration des identifiants pour les tests automatisés.
 * Copier vers credentials.ts (ou utiliser variables d'environnement) et renseigner les valeurs.
 *
 * Après seed API : admin@anexys.fr / MotDePasse123!
 * Voir ACCES.md à la racine du projet.
 */
export const TEST_CREDENTIALS = {
  email: import.meta.env.VITE_TEST_USER_EMAIL ?? 'admin@anexys.fr',
  password: import.meta.env.VITE_TEST_USER_PASSWORD ?? 'MotDePasse123!',
} as const;

export const TEST_API_BASE =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
