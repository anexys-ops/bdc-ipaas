import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { connectorsApi } from '../../api/connectors';
import { marketplaceApi } from '../../api/marketplace';
import { resolveMarketplaceLogoUrl } from '../../lib/connector-logos';
import { SoftwareLogoImg } from '../../components/marketplace/SoftwareLogoImg';
import { FILE_ONLY_MODE, filterMarketplaceConnectors } from '../../lib/file-only-mode';
import {
  ALL_TAB_PALETTE,
  formatMarketplaceCategoryLabel,
  getMarketplaceCategoryPalette,
} from '../../lib/marketplace-category-palette';
import { Loader2, Info, CheckCircle2, XCircle, ArrowRight, Download, Search, LayoutGrid, Key, Layers } from 'lucide-react';
import { toast } from 'sonner';
import type { ConfigField, MarketplaceConnector } from '../../types';

function getDefaultConfig(configFields: ConfigField[]): Record<string, string> {
  return configFields.reduce<Record<string, string>>((acc, f) => {
    acc[f.key] = '';
    return acc;
  }, {});
}

function ConnectorChoiceIcon({
  connector,
  size = 'lg',
}: {
  connector: MarketplaceConnector;
  size?: 'sm' | 'md' | 'lg';
}) {
  const logoUrl = resolveMarketplaceLogoUrl(connector.id, connector.icon, connector.libraryLogoId);
  const sizeMap = { sm: 'sm' as const, md: 'md' as const, lg: 'lg' as const };
  return <SoftwareLogoImg src={logoUrl} alt="" size={sizeMap[size]} rounded="xl" />;
}

function ConnectorChoiceCard({
  connector,
  to,
  categoryName,
}: {
  connector: MarketplaceConnector;
  to: string;
  /** Catégorie catalogue (groupe) pour la teinte de la tuile */
  categoryName: string;
}) {
  const totalEndpoints = connector.sourceOperationsCount + connector.destinationOperationsCount;
  const p = getMarketplaceCategoryPalette(categoryName);

  return (
    <Link
      to={to}
      className={`group block h-full rounded-2xl border backdrop-blur-sm ${p.cardBorder} ${p.cardBg} ${p.cardBorderHover} hover:shadow-md hover:shadow-slate-200/40 transition-all duration-300 overflow-hidden`}
    >
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className={`shrink-0 rounded-xl border ${p.iconWrap} p-0.5`}>
            <ConnectorChoiceIcon connector={connector} size="lg" />
          </div>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${p.endpointsIcon}`}
          >
            Configurer
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
        <h3 className="mt-4 font-semibold text-slate-800 tracking-tight line-clamp-2">
          {connector.name}
        </h3>
        <div className="mt-2">
          <span
            className={`inline-flex max-w-full items-center px-2.5 py-1 rounded-lg text-xs font-medium border truncate ${p.categoryTag}`}
            title={formatMarketplaceCategoryLabel(connector.category)}
          >
            {formatMarketplaceCategoryLabel(connector.category)}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold ${p.endpointsBadge}`}
          >
            <Layers className={`w-4 h-4 shrink-0 ${p.endpointsIcon}`} />
            {totalEndpoints} endpoint{totalEndpoints > 1 ? 's' : ''}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 text-slate-600 text-xs font-medium border border-slate-200/90">
            <Key className="w-3 h-3" />
            {connector.authType === 'agent' ? 'Agent' : connector.authType}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ConnectorNewPage() {
  const location = useLocation();
  const isBackoffice = location.pathname.startsWith('/backoffice/');
  const basePath = isBackoffice ? '/backoffice/connectors' : '/connectors';
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const navigate = useNavigate();

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['marketplace', 'categories'],
    queryFn: marketplaceApi.getByCategories,
    enabled: !type,
  });

  const { data: connectorDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['marketplace', type!],
    queryFn: () => marketplaceApi.getDetail(type!),
    enabled: !!type,
  });

  const configFields = connectorDetail?.configFields ?? [];
  const isAgent = connectorDetail?.authType === 'agent';

  const [name, setName] = useState('');
  const [connectorSearch, setConnectorSearch] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | string>('all');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    durationMs?: number;
  } | null>(null);

  useEffect(() => {
    if (connectorDetail) {
      setConfig(getDefaultConfig(connectorDetail.configFields));
      setTestResult(null);
    }
  }, [type, connectorDetail?.id]);

  const testMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(config)) {
        if (v != null && String(v).trim() !== '') {
          payload[k] = v.trim();
        }
      }
      return connectorsApi.testConfig(type!, payload);
    },
    onSuccess: (data) => {
      setTestResult({
        success: data.success,
        message: data.message,
        durationMs: data.durationMs,
      });
      if (data.success) {
        toast.success(data.durationMs != null ? `Connexion réussie (${data.durationMs} ms)` : 'Connexion réussie');
      } else {
        toast.error(data.message);
      }
    },
    onError: (err: Error) => {
      setTestResult({ success: false, message: err.message ?? 'Erreur' });
      toast.error(err.message ?? 'Échec du test');
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Nom du connecteur requis');
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(config)) {
        if (v != null && String(v).trim() !== '') {
          payload[k] = v.trim();
        }
      }
      return connectorsApi.create({ type: type!, name: name.trim(), config: payload });
    },
    onSuccess: (data) => {
      toast.success('Connecteur créé');
      navigate(`${basePath}/${data.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erreur à la création');
    },
  });

  const updateConfig = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const canTest = configFields.every((f) => !f.required || (config[f.key]?.trim() ?? '') !== '');
  const canSave = name.trim() && (isAgent || configFields.filter((f) => f.required).every((f) => (config[f.key]?.trim() ?? '') !== ''));

  const searchLower = connectorSearch.trim().toLowerCase();
  const categoriesWithFiltered = useMemo(
    () =>
      type
        ? []
        : (categories?.map((category) => ({
            ...category,
            connectors: filterMarketplaceConnectors(category.connectors),
            filteredConnectors: searchLower
              ? filterMarketplaceConnectors(category.connectors).filter(
                  (c) =>
                    c.name.toLowerCase().includes(searchLower) ||
                    (c.category ?? '').toLowerCase().includes(searchLower),
                )
              : filterMarketplaceConnectors(category.connectors),
          })) ?? []),
    [type, categories, searchLower],
  );
  const visibleCategories = useMemo(
    () => categoriesWithFiltered.filter((c) => c.filteredConnectors.length > 0),
    [categoriesWithFiltered],
  );
  const catalogTiles = useMemo(() => {
    if (activeCategoryTab === 'all') {
      return visibleCategories.flatMap((cat) =>
        cat.filteredConnectors.map((connector) => ({
          connector,
          categoryName: cat.name,
        })),
      );
    }
    const cat = visibleCategories.find((c) => c.name === activeCategoryTab);
    if (!cat) return [];
    return cat.filteredConnectors.map((connector) => ({
      connector,
      categoryName: cat.name,
    }));
  }, [activeCategoryTab, visibleCategories]);

  useEffect(() => {
    if (type) return;
    if (
      activeCategoryTab !== 'all' &&
      !visibleCategories.some((c) => c.name === activeCategoryTab)
    ) {
      setActiveCategoryTab('all');
    }
  }, [type, activeCategoryTab, visibleCategories]);

  if (!type) {
    if (loadingCategories) {
      return (
        <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-4">
          <div className="glass-card px-10 py-8 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
            <p className="text-sm text-slate-600 font-medium">Chargement du catalogue…</p>
          </div>
        </div>
      );
    }

    const totalShown = visibleCategories.reduce((acc, c) => acc + c.filteredConnectors.length, 0);

    return (
      <div className="flex-1 min-h-0 w-full">
        <section className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              to={basePath}
              className="inline-flex items-center gap-2 text-sm font-medium link-cta mb-8"
            >
              ← Retour aux connecteurs
            </Link>

            <div className="text-center mb-10">
              <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 text-primary-800 text-xs font-semibold uppercase tracking-wider border border-primary-200 mb-6">
                <LayoutGrid className="w-4 h-4" />
                Choisir un connecteur
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 tracking-tight">
                Brancher un logiciel à votre espace
              </h1>
              <p className="mt-3 text-slate-600 max-w-xl mx-auto text-pretty">
                Choisissez un module du catalogue : API directe ou agent installé chez vous selon le connecteur.
              </p>
              {FILE_ONLY_MODE && (
                <p className="mt-2 text-primary-700 text-sm max-w-xl mx-auto text-pretty">
                  Mode fichiers : réception, transformation et dépôt par fichiers uniquement.
                </p>
              )}
              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="font-bold text-primary-600">{totalShown}</span>
                  module{totalShown > 1 ? 's' : ''} affiché{totalShown > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden />
              <input
                type="search"
                placeholder="Rechercher (nom, catégorie…)"
                className="input pl-10"
                value={connectorSearch}
                onChange={(e) => setConnectorSearch(e.target.value)}
                aria-label="Rechercher"
              />
            </div>

            {visibleCategories.length > 0 && (
              <div
                className="mb-8 flex flex-wrap items-stretch gap-2 sm:gap-2.5"
                role="tablist"
                aria-label="Filtrer par catégorie"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryTab === 'all'}
                  onClick={() => setActiveCategoryTab('all')}
                  className={`inline-flex min-h-[2.75rem] flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all sm:min-h-0 ${
                    activeCategoryTab === 'all'
                      ? `shadow-sm ring-2 ring-offset-2 ring-offset-white/80 ${ALL_TAB_PALETTE.tabRing} ${ALL_TAB_PALETTE.tabSurfaceActive}`
                      : `${ALL_TAB_PALETTE.tabSurface} text-slate-700 hover:bg-white/90`
                  }`}
                >
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${ALL_TAB_PALETTE.categoryTag}`}
                  >
                    Toutes
                  </span>
                  <span className="text-slate-500 font-normal tabular-nums">{totalShown}</span>
                </button>
                {visibleCategories.map((category) => {
                  const tp = getMarketplaceCategoryPalette(category.name);
                  const active = activeCategoryTab === category.name;
                  const count = category.filteredConnectors.length;
                  return (
                    <button
                      key={category.name}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveCategoryTab(category.name)}
                      className={`inline-flex min-h-[2.75rem] flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-all sm:min-h-0 ${
                        active
                          ? `shadow-sm ring-2 ring-offset-2 ring-offset-white/80 ${tp.tabRing} ${tp.tabSurfaceActive}`
                          : `${tp.tabSurface} text-slate-800 hover:brightness-[1.02]`
                      }`}
                    >
                      <span
                        className={`max-w-[10rem] sm:max-w-[12rem] truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tp.categoryTag}`}
                        title={formatMarketplaceCategoryLabel(category.name)}
                      >
                        {formatMarketplaceCategoryLabel(category.name)}
                      </span>
                      <span className="shrink-0 text-slate-500 font-normal tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {catalogTiles.map(({ connector, categoryName }) => (
                <ConnectorChoiceCard
                  key={connector.id}
                  connector={connector}
                  categoryName={categoryName}
                  to={`${basePath}/new?type=${encodeURIComponent(connector.id)}`}
                />
              ))}
            </div>

            {connectorSearch.trim() && visibleCategories.length === 0 && categories && categories.length > 0 && (
              <div className="glass-card py-16 px-8 text-center">
                <Search className="w-14 h-14 text-slate-400 mx-auto mb-4" aria-hidden />
                <h2 className="text-xl font-semibold text-slate-800">Aucun résultat</h2>
                <p className="text-slate-600 mt-1 text-pretty">
                  Aucun connecteur pour « {connectorSearch.trim()} ». Élargissez la recherche.
                </p>
              </div>
            )}

            {categories?.length === 0 && (
              <div className="glass-card py-16 px-8 text-center">
                <p className="text-slate-600">Aucun connecteur disponible.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (loadingDetail || !connectorDetail) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton
          to={searchParams.get('from') === 'marketplace' ? '/marketplace' : `${basePath}/new`}
          children={searchParams.get('from') === 'marketplace' ? 'Retour au marketplace' : 'Retour au choix du connecteur'}
          className="mb-6"
        />

        <Card>
          <CardHeader>
            <CardTitle>Configurer {connectorDetail.name}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {isAgent
                ? 'Donnez un nom à cette instance puis téléchargez l’agent pour votre système.'
                : 'Saisissez l’URL, la clé API et le secret selon votre logiciel. Vous pouvez tester la connexion avant d’enregistrer.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {connectorDetail.configInstructions && (
              <div className="rounded-xl bg-primary-50 border border-primary-200/60 p-4 flex gap-3">
                <Info className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary-700 mb-1">
                    Comment configurer ce connecteur
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {connectorDetail.configInstructions}
                  </p>
                </div>
              </div>
            )}

            {isAgent && connectorDetail.agentDownloads && (
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50/80 p-5">
                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Télécharger l’agent
                </p>
                <div className="flex flex-wrap gap-3">
                  {connectorDetail.agentDownloads.windows && (
                    <a
                      href={`/downloads/${connectorDetail.agentDownloads.windows}`}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-primary-300 text-slate-700 font-medium text-sm transition-colors"
                    >
                      Windows
                    </a>
                  )}
                  {connectorDetail.agentDownloads.mac && (
                    <a
                      href={`/downloads/${connectorDetail.agentDownloads.mac}`}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-primary-300 text-slate-700 font-medium text-sm transition-colors"
                    >
                      macOS
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Installez l’agent sur votre poste puis associez-le à votre compte dans l’application.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l’instance</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Sellsy Production, Dolibarr Siège, Sage Compta"
              />
            </div>

            {configFields.length > 0 && configFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <Input
                  type={field.type}
                  value={config[field.key] ?? ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={field.type === 'password' ? 'font-mono' : ''}
                />
                {field.description && (
                  <p className="text-xs text-slate-500 mt-1">{field.description}</p>
                )}
              </div>
            ))}

            {!isAgent && testResult && (
              <div
                role="alert"
                className={`rounded-2xl border-2 p-5 flex items-start gap-4 ${
                  testResult.success
                    ? 'bg-emerald-500/15 border-emerald-400/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-red-500/15 border-red-400/40 shadow-lg shadow-red-500/10'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    testResult.success
                      ? 'bg-emerald-500/30 border border-emerald-400/30'
                      : 'bg-red-500/30 border border-red-400/30'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-300" strokeWidth={2.5} />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-300" strokeWidth={2.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-bold uppercase tracking-wider ${
                      testResult.success ? 'text-emerald-200' : 'text-red-200'
                    }`}
                  >
                    {testResult.success ? 'Validation' : 'Erreur'}
                  </p>
                  <p
                    className={
                      testResult.success
                        ? 'text-sm text-emerald-100/90 mt-1'
                        : 'text-sm text-red-100/90 mt-1'
                    }
                  >
                    {testResult.message}
                  </p>
                  {testResult.durationMs != null && testResult.success && (
                    <p className="text-xs text-emerald-300/80 mt-2 font-medium">
                      Durée : {testResult.durationMs} ms
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {!isAgent && (
                <Button
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={!canTest || testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Tester la connexion
                </Button>
              )}
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!canSave || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Enregistrer le connecteur
              </Button>
              <Link to={basePath}>
                <Button variant="ghost">Annuler</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
