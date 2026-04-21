import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, Package, Check, FileText } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { SchemaFieldsList } from '../../components/connector/SchemaFieldsList';
import { marketplaceApi } from '../../api/marketplace';
import { resolveMarketplaceLogoUrl } from '../../lib/connector-logos';
import { SoftwareLogoImg } from '../../components/marketplace/SoftwareLogoImg';
import { AgentDownloadCard, isAgentConnector } from '../../components/connector/AgentDownloadCard';

export function ConnectorDetailPage() {
  const { type } = useParams<{ type: string }>();

  const { data: connector, isLoading, error } = useQuery({
    queryKey: ['marketplace', type],
    queryFn: () => marketplaceApi.getDetail(type!),
    enabled: !!type,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center">
        <div className="glass-card p-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-600">Chargement du connecteur…</p>
        </div>
      </div>
    );
  }

  if (error || !connector) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center p-4">
        <Card className="max-w-md text-center py-10">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800">Connecteur introuvable</h2>
          <p className="text-sm text-slate-500 mt-1">Cette ressource n’existe pas ou a été déplacée.</p>
          <Link to="/marketplace" className="mt-6 inline-block">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au marketplace
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const logoUrl = resolveMarketplaceLogoUrl(connector.id, connector.icon, connector.libraryLogoId);

  return (
    <div className="page-bg-mesh">
      {/* Fil d'Ariane */}
      <div className="border-b border-slate-200/80 bg-white/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-slate-600 mb-6">
            <Link to="/marketplace" className="hover:text-primary-600 inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Marketplace
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-800 font-medium truncate">{connector.name}</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex gap-4">
              <SoftwareLogoImg
                src={logoUrl}
                alt=""
                size="xl"
                rounded="2xl"
                className="border-primary-200/60 bg-primary-50/30"
              />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 tracking-tight">
                  {connector.name}
                </h1>
                <p className="text-slate-600 mt-0.5">{connector.category}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">v{connector.version}</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                      connector.authType === 'oauth2'
                        ? 'bg-violet-100 text-violet-600 border border-violet-200/60'
                        : connector.authType === 'api_key'
                          ? 'bg-amber-100 text-amber-600 border border-amber-200/60'
                          : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {connector.authType}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {connector.docsUrl && (
                <a
                  href={connector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Documentation
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              )}
              <Link
                to={`/connectors/new?type=${encodeURIComponent(connector.id)}&from=marketplace`}
              >
                <Button>
                  Configurer ce connecteur
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu : doc + opérations */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {connector.configInstructions && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Récupérer la clé API / configurer l’accès
              </CardTitle>
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{connector.configInstructions}</p>
            </CardHeader>
          </Card>
        )}

        {isAgentConnector(connector.id) && (
          <div className="mb-8">
            <AgentDownloadCard
              connectorName={connector.name}
              connectorId={connector.id}
              version={connector.version || '1.0'}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {connector.sourceOperations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Endpoints Source (récupération)
                  <span className="text-slate-400 font-normal text-sm">
                    ({connector.sourceOperations.length})
                  </span>
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Choisissez l’endpoint puis consultez les champs JSON retournés.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {connector.sourceOperations.map((op) => (
                    <li
                      key={op.id}
                      className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800">{op.label}</p>
                          {op.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{op.description}</p>
                          )}
                          <p className="text-xs font-mono text-primary-600 mt-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                            {op.method} {op.path ?? op.id}
                          </p>
                        </div>
                      </div>
                      <SchemaFieldsList
                        schema={op.outputSchema}
                        title="Champs retournés (JSON)"
                        variant="output"
                        className="ml-8 pl-3 border-l-2 border-emerald-200"
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {connector.destinationOperations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                  Endpoints Destination (envoi)
                  <span className="text-slate-400 font-normal text-sm">
                    ({connector.destinationOperations.length})
                  </span>
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Choisissez l’endpoint puis consultez les champs JSON à remplir.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {connector.destinationOperations.map((op) => (
                    <li
                      key={op.id}
                      className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800">{op.label}</p>
                          {op.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{op.description}</p>
                          )}
                          <p className="text-xs font-mono text-primary-600 mt-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                            {op.method} {op.path ?? op.id}
                          </p>
                        </div>
                      </div>
                      <SchemaFieldsList
                        schema={op.inputSchema}
                        title="Champs à remplir (JSON)"
                        variant="input"
                        className="ml-8 pl-3 border-l-2 border-primary-200"
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {connector.triggerOperations.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Endpoints Déclencheurs
                  <span className="text-slate-400 font-normal text-sm">
                    ({connector.triggerOperations.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {connector.triggerOperations.map((op) => (
                    <li
                      key={op.id}
                      className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800">{op.label}</p>
                          {op.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{op.description}</p>
                          )}
                          {op.path && (
                            <p className="text-xs font-mono text-amber-700 mt-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                              {op.method} {op.path}
                            </p>
                          )}
                        </div>
                      </div>
                      <SchemaFieldsList
                        schema={op.configSchema ?? op.inputSchema}
                        title="Config / champs"
                        variant="input"
                        className="ml-8 pl-3 border-l-2 border-amber-200"
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
