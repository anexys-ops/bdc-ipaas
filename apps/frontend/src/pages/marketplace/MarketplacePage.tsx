import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Package,
  Loader2,
  Shield,
  Database,
  Upload,
  FileText,
  ExternalLink,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, Input } from '../../components/ui';
import { marketplaceApi } from '../../api/marketplace';
import { getConnectorLogoUrl } from '../../lib/connector-logos';
import type { MarketplaceConnector } from '../../types';

const categoryIcons: Record<string, string> = {
  'CRM / Facturation': '💼',
  'ERP / Comptabilité': '📊',
  'ERP / CRM': '🏢',
  'E-commerce': '🛒',
  'Fichiers': '📁',
};

function ConnectorIcon({ connector, size = 'md' }: { connector: MarketplaceConnector; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getConnectorLogoUrl(connector.id, connector.icon);
  const fallbackEmoji = categoryIcons[connector.category] || '🔌';
  const imgClass = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-9 h-9';
  const emojiClass = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  if (!logoUrl || imgError) return <span className={emojiClass} aria-hidden>{fallbackEmoji}</span>;
  return (
    <img
      src={logoUrl}
      alt=""
      className={`${imgClass} object-contain`}
      onError={() => setImgError(true)}
    />
  );
}

function ConnectorTile({ connector }: { connector: MarketplaceConnector }) {
  return (
    <Link
      to={`/marketplace/${connector.id}`}
      className="group block h-full rounded-2xl border-2 border-slate-200 bg-white hover:border-primary-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="w-14 h-14 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
            <ConnectorIcon connector={connector} size="lg" />
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            Voir la fiche
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
        <h3 className="mt-4 font-semibold text-slate-800 tracking-tight line-clamp-2">{connector.name}</h3>
        <p className="text-sm text-slate-500 mt-0.5 font-medium">{connector.category}</p>
        {connector.version && <p className="text-xs text-slate-400 mt-1">v{connector.version}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            <Database className="w-3 h-3" />{connector.sourceOperationsCount} sources
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium border border-primary-200">
            <Upload className="w-3 h-3" />{connector.destinationOperationsCount} dest.
          </span>
          <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium border ${
            connector.authType === 'oauth2' ? 'bg-violet-50 text-violet-700 border-violet-200' :
            connector.authType === 'api_key' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {connector.authType}
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
          {connector.docsUrl ? (
            <a href={connector.docsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 font-medium">
              <FileText className="w-3.5 h-3.5" /> Doc <ExternalLink className="w-3 h-3" />
            </a>
          ) : <span />}
          <span className="text-xs text-slate-500 font-medium">Fiche & configurer →</span>
        </div>
      </div>
    </Link>
  );
}

function ConnectorRow({ connector }: { connector: MarketplaceConnector }) {
  return (
    <Link
      to={`/marketplace/${connector.id}`}
      className="group flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-primary-200 hover:shadow-md transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
        <ConnectorIcon connector={connector} size="md" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 truncate">{connector.name}</p>
        <p className="text-sm text-slate-500">{connector.category}</p>
      </div>
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">{connector.sourceOperationsCount} sources</span>
        <span className="px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-xs font-medium">{connector.destinationOperationsCount} dest.</span>
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium">{connector.authType}</span>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 shrink-0" />
    </Link>
  );
}

type ViewMode = 'tiles' | 'list';

export function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('tiles');

  const { data: categories, isLoading: loadingCategories, error: errorCategories } = useQuery({
    queryKey: ['marketplace', 'categories'],
    queryFn: marketplaceApi.getByCategories,
  });

  const { data: allConnectors } = useQuery({
    queryKey: ['marketplace', 'all'],
    queryFn: marketplaceApi.getAll,
  });

  const totalConnectors = allConnectors?.length ?? 0;

  const filteredCategories = categories
    ?.map((cat) => ({
      ...cat,
      connectors: cat.connectors.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.category.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.connectors.length > 0);

  const isLoading = loadingCategories;
  const error = errorCategories;

  if (isLoading) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-600 font-medium">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800">Impossible de charger le catalogue</h2>
          <p className="text-sm text-slate-500 mt-1">Vérifiez votre connexion et réessayez.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-bg-mesh">
      <section className="py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 text-primary-600 text-xs font-semibold uppercase tracking-wider mb-4 border-2 border-primary-200">
              <Shield className="w-3.5 h-3.5" /> Catalogue
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">Modules connecteurs</h1>
            <p className="mt-2 text-slate-600 max-w-xl mx-auto">
              Choisissez un connecteur pour voir ses endpoints puis le configurer.
            </p>
            {totalConnectors > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">{totalConnectors}</span> connecteur{totalConnectors > 1 ? 's' : ''} disponible{totalConnectors > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Rechercher (nom, catégorie…)"
                className="pl-10 bg-white border-2 border-slate-200 text-slate-700 placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('tiles')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'tiles' ? 'bg-white text-primary-600 shadow border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
                aria-pressed={viewMode === 'tiles'}
              >
                <LayoutGrid className="w-4 h-4" /> Tuiles
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-primary-600 shadow border border-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
                aria-pressed={viewMode === 'list'}
              >
                <List className="w-4 h-4" /> Liste
              </button>
            </div>
          </div>

          <div className="space-y-10">
            {filteredCategories?.map((category) => (
              <Card key={category.name} className="overflow-hidden border-2 border-slate-200 bg-white">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{categoryIcons[category.name] || '📦'}</span>
                    <h2 className="text-lg font-bold text-slate-800">{category.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold border border-primary-200">
                      {category.count} module{category.count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  {viewMode === 'tiles' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {category.connectors.map((connector) => (
                        <ConnectorTile key={connector.id} connector={connector} />
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {category.connectors.map((connector) => (
                        <li key={connector.id}>
                          <ConnectorRow connector={connector} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCategories?.length === 0 && (
            <Card className="max-w-md mx-auto text-center py-12 px-8 border-2 border-slate-200">
              <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-800">Aucun résultat</h2>
              <p className="text-sm text-slate-500 mt-1">Aucun connecteur pour « {search} ».</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
