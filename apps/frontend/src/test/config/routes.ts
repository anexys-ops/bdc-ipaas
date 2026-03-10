/**
 * Liste canonique des routes de l'application pour les tests de mapping et de liens.
 * Doit rester alignée avec App.tsx et PrivateLayout.
 */
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Accueil' },
  { path: '/login', name: 'Connexion' },
  { path: '/marketplace', name: 'Marketplace' },
] as const;

export const PRIVATE_ROUTES = [
  { path: '/dashboard', name: 'Tableau de bord' },
  { path: '/audit', name: 'Audit' },
  { path: '/flows', name: 'Flux' },
  { path: '/planifier', name: 'Planifier' },
  { path: '/planifier/new', name: 'Nouvelle planification' },
  { path: '/mappings', name: 'Mappings' },
  { path: '/mappings/new', name: 'Nouveau mapping' },
  { path: '/connectors', name: 'Connecteurs' },
  { path: '/connectors/new', name: 'Nouveau connecteur' },
  { path: '/account', name: 'Mon compte' },
  { path: '/settings/api-key', name: 'Ma clé API' },
  { path: '/billing', name: 'Facturation' },
  { path: '/billing/invoices', name: 'Mes factures' },
  { path: '/billing/quota', name: 'Mon quota et volumes' },
] as const;

export const BACKOFFICE_ROUTES = [
  { path: '/backoffice', name: 'Dashboard gestion' },
  { path: '/backoffice/invoices', name: 'Factures clients' },
  { path: '/backoffice/clients', name: 'Clients' },
  { path: '/backoffice/clients/new', name: 'Nouveau client' },
] as const;

/** Tous les chemins déclarés (sans paramètres dynamiques) pour vérification des liens. */
export const ALL_STATIC_PATHS = [
  ...PUBLIC_ROUTES.map((r) => r.path),
  ...PRIVATE_ROUTES.map((r) => r.path),
  ...BACKOFFICE_ROUTES.map((r) => r.path),
] as const;
