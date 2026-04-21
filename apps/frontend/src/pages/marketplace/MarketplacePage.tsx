import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Package,
  Loader2,
  LayoutGrid,
  Layers,
  Key,
  Star,
  Euro,
  FileCode2,
  ShoppingCart,
  Truck,
  Receipt,
  Landmark,
  CreditCard,
  PackageCheck,
  FileText,
  RefreshCw,
  Boxes,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui';
import { marketplaceApi } from '../../api/marketplace';
import { resolveMarketplaceLogoUrl } from '../../lib/connector-logos';
import { SoftwareLogoImg } from '../../components/marketplace/SoftwareLogoImg';
import type { MarketplaceConnector } from '../../types';

/** Slogans marketplace – visibles dans la hero */
const MARKETPLACE_SLOGANS = [
  'Connectez vos logiciels en quelques clics.',
  'EDI et EDIFACT sans complexité.',
  'Une intégration, tous vos flux.',
  'Commerce, compta, logistique : tout est synchronisé.',
  'Paiements et factures automatiques.',
];

/** Process métier pour l’onglet Par process */
const PROCESS_TABS = [
  { id: 'synchro-commande-eshop', label: 'Synchro commande e‑shop', icon: ShoppingCart, desc: 'Commandes site → ERP en temps réel.' },
  { id: 'bl', label: 'Récup. bons de livraison', icon: PackageCheck, desc: 'BL et expéditions vers ERP / WMS.' },
  { id: 'facturation-electronique', label: 'Facturation électronique', icon: FileText, desc: 'Factures, e-invoicing, plateformes d’agrément.' },
  { id: 'sync-paiements', label: 'Synchroniser les paiements', icon: CreditCard, desc: 'Encaissements, rapprochement bancaire.' },
  { id: 'sync-stocks', label: 'Sync stocks & inventaires', icon: Boxes, desc: 'Stocks multi-canal, WMS, marketplaces.' },
  { id: 'sync-catalogue', label: 'Catalogue & fiches produits', icon: Package, desc: 'Produits ERP ↔ e‑commerce / marketplaces.' },
  { id: 'tiers-crm', label: 'Tiers & CRM', icon: Receipt, desc: 'Clients, fournisseurs, synchronisation CRM.' },
  { id: 'compta-export', label: 'Export compta', icon: Receipt, desc: 'Exports vers logiciels compta (FEC, journaux).' },
  { id: 'documents-ged', label: 'Documents & GED', icon: FileText, desc: 'Pièces jointes, GED, archivage.' },
  { id: 'orchestration', label: 'Orchestration & workflows', icon: RefreshCw, desc: 'Chaînes de flux, relances, alertes.' },
] as const;

/** Cas d’usage par domaine (eventail / onglets multi-niveaux) */
const USE_CASES_BY_DOMAIN: Record<string, { label: string; icon: typeof ShoppingCart; items: { title: string; short: string }[] }> = {
  Commerce: {
    label: 'Commerce',
    icon: ShoppingCart,
    items: [
      { title: 'Synchro commandes e‑shop', short: 'Commandes site → ERP, statuts, expéditions.' },
      { title: 'Catalogue produits', short: 'Fiches produits ERP ↔ e‑commerce, marketplaces.' },
      { title: 'Stocks multi-canal', short: 'Un stock, tous les canaux mis à jour.' },
      { title: 'Marketplaces', short: 'Amazon, Cdiscount, Fnac… unifié avec l’ERP.' },
    ],
  },
  Compta: {
    label: 'Compta',
    icon: Receipt,
    items: [
      { title: 'Facturation électronique', short: 'Factures e-invoicing, PA, B2B/B2G.' },
      { title: 'Export compta', short: 'FEC, journaux, logiciels compta.' },
      { title: 'Tiers & écritures', short: 'Clients, fournisseurs, rapprochement.' },
      { title: 'Devis → facture', short: 'Workflow devis / commande / facture.' },
    ],
  },
  Logistique: {
    label: 'Logistique',
    icon: Truck,
    items: [
      { title: 'Bons de livraison', short: 'BL, expéditions, transporteurs.' },
      { title: 'WMS & entrepôt', short: 'Préparations, stocks, inventaires.' },
      { title: 'Suivi colis', short: 'Tracking, notifications clients.' },
      { title: 'Réceptions fournisseurs', short: 'BR, contrôles, entrées stock.' },
    ],
  },
  Banque: {
    label: 'Banque & trésorerie',
    icon: Landmark,
    items: [
      { title: 'Rapprochement bancaire', short: 'Relevés, écritures, rapprochement auto.' },
      { title: 'Prévisionnel tréso', short: 'Encaissements, décaissements, prévisions.' },
      { title: 'Export vers banque', short: 'Virements, paiements fournisseurs.' },
    ],
  },
  Paiements: {
    label: 'Paiements',
    icon: CreditCard,
    items: [
      { title: 'Sync paiements e‑commerce', short: 'Stripe, PayPal, CB → ERP.' },
      { title: 'Encaissements & relances', short: 'Relances auto, rappels, encaissements.' },
      { title: 'Rapprochement paiements', short: 'Paiements reçus ↔ factures.' },
    ],
  },
};
const USE_CASE_DOMAINS = Object.keys(USE_CASES_BY_DOMAIN);

function ConnectorIcon({
  connector,
  size = 'md',
}: {
  connector: MarketplaceConnector;
  size?: 'sm' | 'md' | 'lg';
}) {
  const logoUrl = resolveMarketplaceLogoUrl(connector.id, connector.icon, connector.libraryLogoId);
  const sizeMap = { sm: 'sm' as const, md: 'md' as const, lg: 'lg' as const };
  return <SoftwareLogoImg src={logoUrl} alt="" size={sizeMap[size]} rounded="xl" />;
}

function ModuleCard({ connector }: { connector: MarketplaceConnector }) {
  const totalEndpoints = connector.sourceOperationsCount + connector.destinationOperationsCount;

  return (
    <Link
      to={`/marketplace/${connector.id}`}
      className="group block h-full rounded-2xl border-2 border-slate-200 bg-white hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-200 overflow-hidden"
    >
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <ConnectorIcon connector={connector} size="lg" />
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            Voir
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
        <h3 className="mt-4 font-semibold text-slate-800 tracking-tight line-clamp-2">
          {connector.name}
        </h3>
        <p className="text-sm text-slate-500 mt-0.5">{connector.category}</p>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {typeof connector.stars === 'number' && (
            <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${connector.stars} étoiles`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < connector.stars! ? 'fill-amber-500' : 'fill-slate-200'}`} />
              ))}
            </span>
          )}
          {connector.priceLabel && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
              <Euro className="w-3.5 h-3.5" />
              {connector.priceLabel}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 border border-primary-200 text-primary-700 text-sm font-semibold">
            <Layers className="w-4 h-4" />
            {totalEndpoints} endpoint{totalEndpoints > 1 ? 's' : ''}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
            <Key className="w-3 h-3" />
            {connector.authType}
          </span>
          <span className="text-xs text-slate-400">
            {connector.sourceOperationsCount} source · {connector.destinationOperationsCount} dest.
          </span>
        </div>
      </div>
    </Link>
  );
}

type SortOption = 'name' | 'endpoints_desc' | 'endpoints_asc';
type TabType = 'list' | 'categories' | 'process';

export function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') ?? 'all';
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(categoryFromUrl);
  const [authFilter, setAuthFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [useCaseDomain, setUseCaseDomain] = useState<string>(USE_CASE_DOMAINS[0]);

  useEffect(() => {
    if (categoryFromUrl !== categoryFilter) {
      setCategoryFilter(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  const setCategoryAndUrl = (category: string) => {
    setCategoryFilter(category);
    if (category === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const { data: allConnectors, isLoading, error } = useQuery({
    queryKey: ['marketplace', 'all'],
    queryFn: marketplaceApi.getAll,
  });

  const { data: byCategories } = useQuery({
    queryKey: ['marketplace', 'categories'],
    queryFn: marketplaceApi.getByCategories,
    enabled: activeTab === 'categories',
  });

  const categories = useMemo(() => {
    if (!allConnectors) return [];
    const set = new Set(allConnectors.map((c) => c.category));
    return Array.from(set).sort();
  }, [allConnectors]);

  const authTypes = useMemo(() => {
    if (!allConnectors) return [];
    const set = new Set(allConnectors.map((c) => c.authType));
    return Array.from(set).sort();
  }, [allConnectors]);

  const filteredAndSorted = useMemo(() => {
    if (!allConnectors) return [];
    let list = allConnectors.filter((c) => {
      const matchSearch =
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchAuth = authFilter === 'all' || c.authType === authFilter;
      return matchSearch && matchCategory && matchAuth;
    });
    if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'endpoints_desc') {
      list = [...list].sort(
        (a, b) =>
          b.sourceOperationsCount +
          b.destinationOperationsCount -
          (a.sourceOperationsCount + a.destinationOperationsCount),
      );
    } else {
      list = [...list].sort(
        (a, b) =>
          a.sourceOperationsCount +
          a.destinationOperationsCount -
          (b.sourceOperationsCount + b.destinationOperationsCount),
      );
    }
    return list;
  }, [allConnectors, search, categoryFilter, authFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen page-bg-marketplace flex items-center justify-center p-4">
        <div className="glass-card px-10 py-8 flex flex-col items-center gap-4 shadow-glass-lg border-2 border-slate-200/80">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500" aria-hidden />
          <p className="text-sm text-slate-600 font-medium">Chargement du catalogue…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen page-bg-marketplace flex items-center justify-center p-4">
        <Card className="max-w-md text-center border-2 border-slate-200 bg-white shadow-lg">
          <CardContent className="pt-6">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Impossible de charger le catalogue</h2>
            <p className="text-sm text-slate-500 mt-1">Vérifiez votre connexion et réessayez.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalEndpoints = (allConnectors ?? []).reduce(
    (acc, c) => acc + c.sourceOperationsCount + c.destinationOperationsCount,
    0,
  );

  return (
    <div className="min-h-screen page-bg-marketplace">
      {/* Brique EDIFACT / EDI – au-dessus de tout */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-5 sm:py-6 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <FileCode2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary-300 shrink-0" aria-hidden />
          <p className="text-center text-lg sm:text-xl font-semibold tracking-tight">
            EDIFACT / EDI pour tous vos logiciels, simplement et rapidement
          </p>
          <a
            href="#modules"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-300 hover:text-primary-200 transition-colors"
          >
            Voir les connecteurs
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <section className="py-8 sm:py-12" id="modules">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero avec slogans visibles */}
          <div className="text-center mb-10">
            <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wider border border-primary-200 mb-6">
              <LayoutGrid className="w-4 h-4" />
              Marketplace
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 tracking-tight">
              Tous les modules
            </h1>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">
              Parcourez les connecteurs, filtrez par catégorie ou type d’auth, et consultez le nombre d’endpoints en un coup d’œil.
            </p>
            {/* Slogans bien visibles */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {MARKETPLACE_SLOGANS.map((slogan, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-white/90 border-2 border-slate-200 text-slate-700 text-sm font-medium shadow-sm"
                >
                  {slogan}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="font-bold text-primary-600">{allConnectors?.length ?? 0}</span>
                connecteurs
              </span>
              <span className="text-slate-400">·</span>
              <span className="inline-flex items-center gap-2">
                <span className="font-bold text-primary-600">{totalEndpoints}</span>
                endpoints au total
              </span>
            </div>
          </div>

          {/* Onglets : Tous | Par catégorie | Par process */}
          <div className="flex flex-wrap border-b border-slate-200 mb-6 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Tous les modules
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'categories'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Par catégorie
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('process')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'process'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Par process
            </button>
          </div>

          {activeTab === 'process' ? (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Cas d’usage par process</h2>
                <p className="text-slate-600 text-sm">Choisissez un process pour voir les connecteurs associés.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {PROCESS_TABS.map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveTab('list');
                      setSearch(label.split(' ')[0]);
                    }}
                    className="text-left p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/10 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{label}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* Schéma eventail : EDI au centre → domaines */}
              <div className="mb-8 rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50/80 to-white p-6">
                <h3 className="text-center text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
                  Vue d’ensemble
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white px-5 py-3 shadow-lg border border-primary-500/30">
                    <FileCode2 className="w-8 h-8 text-primary-300 mb-1" />
                    <span className="text-sm font-bold">EDI / EDIFACT</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-slate-500">
                    {USE_CASE_DOMAINS.map((d, i) => (
                      <span key={d}>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700">
                          {d}
                        </span>
                        {i < USE_CASE_DOMAINS.length - 1 && <span className="text-slate-300">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-center text-sm text-slate-500 mt-3">
                  Une brique EDI au centre ; Commerce, Compta, Logistique, Banque et Paiements autour.
                </p>
              </div>

              {/* Cas d’usage par domaine (eventail / onglets) */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                  Cas d’usage par domaine – plusieurs niveaux
                </h3>
                <div className="flex flex-wrap border-b border-slate-200 bg-white">
                  {USE_CASE_DOMAINS.map((domain) => {
                    const conf = USE_CASES_BY_DOMAIN[domain];
                    const Icon = conf.icon;
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => setUseCaseDomain(domain)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                          useCaseDomain === domain
                            ? 'border-primary-500 text-primary-600 bg-primary-50/50'
                            : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {conf.label}
                      </button>
                    );
                  })}
                </div>
                <div className="p-6">
                  {USE_CASE_DOMAINS.map((domain) => {
                    if (useCaseDomain !== domain) return null;
                    const conf = USE_CASES_BY_DOMAIN[domain];
                    return (
                      <div key={domain} className="space-y-3">
                        {conf.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                          >
                            <span className="text-primary-600 font-semibold shrink-0">{i + 1}.</span>
                            <div>
                              <p className="font-medium text-slate-800">{item.title}</p>
                              <p className="text-sm text-slate-500">{item.short}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : activeTab === 'categories' && byCategories ? (
            <div className="space-y-8">
              {byCategories.map((cat) => (
                <div key={cat.name}>
                  <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary-100 text-primary-800">{cat.name}</span>
                    <span className="text-slate-500 font-normal">({cat.count} module{cat.count > 1 ? 's' : ''})</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {cat.connectors.map((connector) => (
                      <ModuleCard key={connector.id} connector={connector} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Filtres toujours visibles – interface classe */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="search"
                      placeholder="Rechercher (nom, catégorie…)"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Rechercher"
                    />
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Trier par"
                  >
                    <option value="name">Nom A–Z</option>
                    <option value="endpoints_desc">Endpoints (décroissant)</option>
                    <option value="endpoints_asc">Endpoints (croissant)</option>
                  </select>
                </div>
                <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200">
                    <span className="text-sm font-semibold text-slate-700">Filtres</span>
                    <span className="text-slate-400 text-sm ml-2">— toujours affichés</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <span className="text-sm text-slate-600 font-medium shrink-0">Catégorie</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryAndUrl('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          categoryFilter === 'all'
                            ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                            : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                        }`}
                      >
                        Toutes
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoryAndUrl(cat)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            categoryFilter === cat
                              ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                              : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                          }`}
                        >
                          {cat === 'PA' ? 'Plateformes d\'agrément (PA)' : cat}
                        </button>
                      ))}
                    </div>
                    <span className="text-slate-300 mx-1">|</span>
                    <span className="text-sm text-slate-600 font-medium shrink-0">Auth</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          authFilter === 'all'
                            ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                            : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                        }`}
                      >
                        Tous
                      </button>
                      {authTypes.map((auth) => (
                        <button
                          key={auth}
                          type="button"
                          onClick={() => setAuthFilter(auth)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            authFilter === auth
                              ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                              : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                          }`}
                        >
                          {auth}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {categoryFilter === 'PA' && (
                <div className="mb-6 p-5 rounded-2xl bg-primary-50 border-2 border-primary-200">
                  <h2 className="text-lg font-semibold text-primary-800">Plateformes d&apos;agrément (PA)</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Connectez vos flux à n&apos;importe quelle plateforme d&apos;agrément pour la facturation électronique. Nous avons choisi <strong className="text-slate-800">Docoon</strong> comme partenaire privilégié pour nos clients.
                  </p>
                </div>
              )}

              <p className="text-sm text-slate-500 mb-4">
                {filteredAndSorted.length} module{filteredAndSorted.length > 1 ? 's' : ''} affiché
                {filteredAndSorted.length !== (allConnectors?.length ?? 0)
                  ? ` (filtrés sur ${allConnectors?.length ?? 0})`
                  : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredAndSorted.map((connector) => (
                  <ModuleCard key={connector.id} connector={connector} />
                ))}
              </div>

              {filteredAndSorted.length === 0 && (
                <div className="rounded-2xl border-2 border-slate-200 bg-white py-16 px-8 text-center shadow-sm">
                  <Search className="w-14 h-14 text-slate-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-slate-800">Aucun résultat</h2>
                  <p className="text-slate-500 mt-1">
                    Aucun connecteur ne correspond à vos filtres. Essayez d’élargir la recherche.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
