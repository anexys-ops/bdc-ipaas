import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { connectorsApi } from '../../api/connectors';
import { marketplaceApi } from '../../api/marketplace';
import { Loader2, Info, CheckCircle2, XCircle, ArrowRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { ConfigField, MarketplaceConnector } from '../../types';

const categoryIcons: Record<string, string> = {
  'CRM / Facturation': '💼',
  'ERP / Comptabilité': '📊',
  'ERP / CRM': '🏢',
  'E-commerce': '🛒',
  'Fichiers': '📁',
};

function getDefaultConfig(configFields: ConfigField[]): Record<string, string> {
  return configFields.reduce<Record<string, string>>((acc, f) => {
    acc[f.key] = '';
    return acc;
  }, {});
}

function ConnectorChoiceTile({
  connector,
  to,
}: {
  connector: MarketplaceConnector;
  to: string;
}) {
  const icon = categoryIcons[connector.category] || '🔌';
  return (
    <Link
      to={to}
      className="group block rounded-2xl border-2 border-slate-200 bg-white hover:border-primary-300 hover:shadow-lg transition-all duration-200 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary-50 border-2 border-primary-100 flex items-center justify-center shrink-0 text-xl">
          {icon}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          Configurer
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
      <h3 className="mt-3 font-semibold text-slate-800 tracking-tight">{connector.name}</h3>
      <p className="text-sm text-slate-500 mt-0.5">{connector.category}</p>
      <span
        className={`inline-flex mt-3 px-2 py-0.5 rounded-lg text-xs font-medium ${
          connector.authType === 'agent'
            ? 'bg-slate-100 text-slate-600 border border-slate-200'
            : connector.authType === 'oauth2'
              ? 'bg-violet-50 text-violet-700 border border-violet-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
      >
        {connector.authType === 'agent' ? 'Agent à télécharger' : connector.authType}
      </span>
    </Link>
  );
}

export function ConnectorNewPage() {
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
      if (!isAgent) {
        for (const [k, v] of Object.entries(config)) {
          if (v != null && String(v).trim() !== '') {
            payload[k] = v.trim();
          }
        }
      }
      return connectorsApi.create({ type: type!, name: name.trim(), config: payload });
    },
    onSuccess: (data) => {
      toast.success('Connecteur créé');
      navigate(`/connectors/${data.id}`);
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

  if (!type) {
    if (loadingCategories) {
      return (
        <div className="min-h-screen page-bg-mesh flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      );
    }
    return (
      <div className="min-h-screen page-bg-mesh">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BackButton to="/connectors" className="mb-6">
            Retour aux connecteurs
          </BackButton>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Choisir un connecteur</h1>
          <p className="text-slate-600 mb-8">
            Sélectionnez le connecteur à configurer. Les connecteurs « Agent » nécessitent l’installation d’un agent sur votre poste.
          </p>
          <div className="space-y-8">
            {categories?.map((category) => (
              <Card key={category.name} className="border-2 border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{categoryIcons[category.name] ?? '📦'}</span>
                    <h2 className="text-lg font-bold text-slate-800">{category.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold border border-primary-200">
                      {category.count} module{category.count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.connectors.map((connector) => (
                      <ConnectorChoiceTile
                        key={connector.id}
                        connector={connector}
                        to={`/connectors/new?type=${encodeURIComponent(connector.id)}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {categories?.length === 0 && (
            <Card className="max-w-md mx-auto text-center py-12 px-8 border-2 border-slate-200">
              <p className="text-slate-600">Aucun connecteur disponible.</p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (loadingDetail || !connectorDetail) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg-mesh">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton
          to={searchParams.get('from') === 'marketplace' ? '/marketplace' : '/connectors/new'}
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

            {!isAgent && configFields.map((field) => (
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
              <Link to="/connectors">
                <Button variant="ghost">Annuler</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
