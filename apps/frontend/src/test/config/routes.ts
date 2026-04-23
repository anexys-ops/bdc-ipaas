/**
 * Liste canonique des routes de l'application pour les tests de mapping et de liens.
 * Doit rester alignée avec App.tsx et la navigation (PrivateLayout / AppMainNav).
 */
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Accueil' },
  { path: '/login', name: 'Connexion' },
  { path: '/signup-trial', name: 'Inscription essai' },
  { path: '/reserver-demo', name: 'Réserver une démo' },
  { path: '/marketplace', name: 'Marketplace' },
  { path: '/tarifs', name: 'Tarifs' },
  { path: '/avis', name: 'Avis' },
] as const;

export const PRIVATE_ROUTES = [
  { path: '/dashboard', name: 'Tableau de bord' },
  { path: '/audit', name: 'Audit' },
  { path: '/flows', name: 'Flux (supervision Redis / Benthos)' },
  { path: '/planifier', name: 'Planifier' },
  { path: '/planifier/new', name: 'Nouvelle planification' },
  { path: '/mappings', name: 'Mappings' },
  { path: '/mappings/canvas', name: 'Canevas mapping' },
  { path: '/mappings/new', name: 'Nouveau mapping' },
  { path: '/connectors', name: 'Connecteurs' },
  { path: '/connectors/new', name: 'Nouveau connecteur' },
  { path: '/edifact', name: 'EDIFACT' },
  { path: '/edifact/messages/:id', name: 'Détail EDIFACT' },
  { path: '/edifact/send', name: 'Envoi EDIFACT' },
  { path: '/monitoring', name: 'Monitoring' },
  { path: '/hub/pipeline', name: 'Hub pipeline' },
  { path: '/users', name: 'Utilisateurs' },
  { path: '/groups', name: 'Groupes' },
  { path: '/account', name: 'Mon compte' },
  { path: '/settings/api-key', name: 'Clé API' },
  { path: '/billing', name: 'Facturation' },
  { path: '/billing/subscribe', name: 'Abonnement Stripe' },
  { path: '/billing/invoices', name: 'Mes factures' },
  { path: '/billing/quota', name: 'Quota et volumes' },
] as const;

export const BACKOFFICE_ROUTES = [
  { path: '/backoffice', name: 'Dashboard gestion' },
  { path: '/backoffice/invoices', name: 'Factures clients' },
  { path: '/backoffice/clients', name: 'Clients' },
  { path: '/backoffice/clients/new', name: 'Nouveau client' },
  { path: '/backoffice/marketplace', name: 'Modules marketplace' },
  { path: '/backoffice/file-flows', name: 'Flux fichiers admin' },
  { path: '/backoffice/connectors', name: 'Connecteurs support' },
  { path: '/backoffice/mappings', name: 'Mappings support' },
  { path: '/backoffice/planifier', name: 'Planifier support' },
  { path: '/backoffice/edifact', name: 'EDIFACT support' },
] as const;

/** Tous les chemins déclarés (sans paramètres dynamiques) pour vérification des liens. */
export const ALL_STATIC_PATHS = [
  ...PUBLIC_ROUTES.map((r) => r.path),
  ...PRIVATE_ROUTES.map((r) => r.path),
  ...BACKOFFICE_ROUTES.map((r) => r.path),
] as const;
