import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { SchemaFieldsList } from '../../components/connector/SchemaFieldsList';
import { connectorsApi } from '../../api/connectors';
import { marketplaceApi } from '../../api/marketplace';
import { isFileOperation } from '../../lib/file-only-mode';
import type { OperationPreviewResult } from '../../api/connectors';
import type { ConfigField } from '../../types';
import { Loader2, XCircle, CheckCircle2, Users, RefreshCw, Pencil, Trash2, Eye, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type TestResultState = { success: boolean; message: string } | null;

function configToFormValues(config: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(config).map(([k, v]) => [k, v != null ? String(v) : '']),
  );
}

export function ConfiguredConnectorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isBackoffice = location.pathname.startsWith('/backoffice/');
  const basePath = isBackoffice ? '/backoffice/connectors' : '/connectors';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewOperationId, setPreviewOperationId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<OperationPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  /** Endpoint sélectionné pour afficher ses champs (id + type) */
  const [selectedEndpoint, setSelectedEndpoint] = useState<{ id: string; type: 'source' | 'destination' | 'trigger' } | null>(null);
  const [lastTestResult, setLastTestResult] = useState<TestResultState>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const loadedConfigRef = useRef<Record<string, unknown>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: connector, isLoading, error } = useQuery({
    queryKey: ['connectors', id],
    queryFn: () => connectorsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: connectorDetail } = useQuery({
    queryKey: ['marketplace', connector?.type],
    queryFn: () => marketplaceApi.getDetail(connector!.type),
    enabled: !!connector?.type,
  });

  const { data: configData } = useQuery({
    queryKey: ['connector-config', id],
    queryFn: () => connectorsApi.getConfig(id!),
    enabled: !!id && isEditing,
  });

  useEffect(() => {
    if (connector) {
      setEditName(connector.name);
      setEditIsActive(connector.isActive);
    }
  }, [connector]);

  useEffect(() => {
    if (configData?.config) {
      loadedConfigRef.current = configData.config;
      setEditConfig(configToFormValues(configData.config));
    }
  }, [configData]);

  const testMutation = useMutation({
    mutationFn: () => connectorsApi.test(id!),
    onSuccess: (result) => {
      setLastTestResult({ success: result.success, message: result.message });
      if (result.success) toast.success('Connexion OK');
      else toast.error(result.message);
      queryClient.invalidateQueries({ queryKey: ['connectors', id] });
    },
    onError: (err: Error) => {
      setLastTestResult({ success: false, message: err.message });
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      name: string;
      isActive: boolean;
      config?: Record<string, unknown>;
    }) =>
      connectorsApi.update(id!, {
        name: data.name.trim(),
        isActive: data.isActive,
        ...(data.config != null && { config: data.config }),
      }),
    onSuccess: () => {
      toast.success('Connecteur mis à jour');
      queryClient.invalidateQueries({ queryKey: ['connectors', id] });
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erreur à la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => connectorsApi.delete(id!),
    onSuccess: () => {
      toast.success('Connecteur supprimé');
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      navigate(basePath);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erreur à la suppression');
      setShowDeleteConfirm(false);
    },
  });

  const loadPreview = async (operationId: string) => {
    setPreviewOperationId(operationId);
    setPreviewData(null);
    setPreviewError(null);
    try {
      const result = await connectorsApi.operationPreview(id!, operationId, 50);
      setPreviewData(result);
      setPreviewError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur aperçu';
      setPreviewError(msg);
      toast.error(msg);
    } finally {
      setPreviewOperationId(null);
    }
  };

  if (isLoading || !connector) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-4">
        <Card className="max-w-md text-center py-10">
          <p className="text-sm text-red-500">Connecteur introuvable.</p>
          <div className="mt-4">
            <BackButton to={basePath}>Retour aux connecteurs</BackButton>
          </div>
        </Card>
      </div>
    );
  }

  const sourceOps = (connectorDetail?.sourceOperations ?? []).filter(isFileOperation);
  const destOps = (connectorDetail?.destinationOperations ?? []).filter(isFileOperation);
  const triggerOps = connectorDetail?.triggerOperations ?? [];

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton to={basePath} className="mb-6">
          Retour aux connecteurs
        </BackButton>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{connector.name}</CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">
              {connector.connectorInfo.name} · {connector.connectorInfo.category}
            </p>
            {connector.lastTestedAt != null && (
              <div
                className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium ${
                  connector.lastTestOk
                    ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-400/30'
                    : 'bg-red-500/15 text-red-600 border border-red-400/30'
                }`}
              >
                {connector.lastTestOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                )}
                {connector.lastTestOk ? 'Dernier test : OK' : 'Dernier test : échec'}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="rounded-xl border-2 border-primary-500/30 bg-primary-500/5 p-4 space-y-4">
                <p className="text-sm font-medium text-slate-700">Modifier le connecteur (nom, URL, accès, token)</p>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nom</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Sellsy Production"
                  />
                </div>
                {connectorDetail?.configFields?.map((field: ConfigField) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <Input
                      type={field.type}
                      value={editConfig[field.key] ?? ''}
                      onChange={(e) =>
                        setEditConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder ?? (field.type === 'password' ? '••••••••' : '')}
                      className={field.type === 'password' ? 'font-mono' : ''}
                    />
                    {field.description && (
                      <p className="text-xs text-slate-500 mt-1">{field.description}</p>
                    )}
                  </div>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">Connecteur actif</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      const configToSend: Record<string, unknown> = {};
                      connectorDetail?.configFields?.forEach((f: ConfigField) => {
                        const v = editConfig[f.key]?.trim();
                        configToSend[f.key] =
                          v !== undefined && v !== ''
                            ? v
                            : loadedConfigRef.current[f.key];
                      });
                      updateMutation.mutate({
                        name: editName,
                        isActive: editIsActive,
                        config: Object.keys(configToSend).length ? configToSend : undefined,
                      });
                    }}
                    disabled={
                      updateMutation.isPending ||
                      !editName.trim() ||
                      ((connectorDetail?.configFields?.length ?? 0) > 0 && !configData)
                    }
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Enregistrer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(connector.name);
                      setEditIsActive(connector.isActive);
                      setEditConfig({});
                      loadedConfigRef.current = {};
                    }}
                    disabled={updateMutation.isPending}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  variant="outline"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Tester la connexion
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={!!showDeleteConfirm}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!!showDeleteConfirm}
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            )}

            {showDeleteConfirm && (
              <div
                role="alertdialog"
                className="rounded-xl border-2 border-red-300 bg-red-500/10 p-4 space-y-3"
              >
                <p className="text-sm font-medium text-red-800">
                  Supprimer ce connecteur ? Cette action est irréversible. Les flux qui l’utilisent
                  peuvent être impactés.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="border-red-400 text-red-700 hover:bg-red-100"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Confirmer la suppression
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteMutation.isPending}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {lastTestResult && (
              <div
                role="alert"
                className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${
                  lastTestResult.success
                    ? 'bg-emerald-500/15 border-emerald-400/40'
                    : 'bg-red-500/15 border-red-400/40'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    lastTestResult.success
                      ? 'bg-emerald-500/30 border border-emerald-400/30'
                      : 'bg-red-500/30 border border-red-400/30'
                  }`}
                >
                  {lastTestResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" strokeWidth={2.5} />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-300" strokeWidth={2.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      lastTestResult.success ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {lastTestResult.success ? 'Validation' : 'Erreur'}
                  </p>
                  <p className="text-sm text-slate-700 mt-0.5">{lastTestResult.message}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {(sourceOps.length > 0 || destOps.length > 0 || triggerOps.length > 0) && (
          <Card className="mb-6 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Endpoints disponibles
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Choisissez un endpoint pour voir les champs JSON. Aperçu à droite pour les opérations source.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row min-h-[320px]">
                {/* Gauche : liste compacte + champs de l'endpoint sélectionné */}
                <div className="flex-1 min-w-0 flex flex-col border-t border-slate-200 lg:border-l-0 lg:border-t">
                  <div className="flex-1 flex flex-col min-h-0 p-4">
                    {/* Liste compacte Source */}
                    {sourceOps.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1.5">
                          Source (récupération)
                        </h4>
                        <ul className="space-y-0.5">
                          {sourceOps.map((op) => {
                            const isSelected = selectedEndpoint?.id === op.id && selectedEndpoint?.type === 'source';
                            return (
                              <li key={op.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedEndpoint({ id: op.id, type: 'source' })}
                                  className={`w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg text-left transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-100 border border-emerald-300'
                                      : 'hover:bg-slate-100 border border-transparent'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <ChevronRight className={`w-4 h-4 shrink-0 text-slate-400 ${isSelected ? 'text-emerald-600' : ''}`} />
                                    <span className="font-medium text-slate-800 truncate">{op.label}</span>
                                    <span className="text-xs font-mono text-slate-400 shrink-0 truncate max-w-[140px]">
                                      {op.method} {op.path ?? op.id}
                                    </span>
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadPreview(op.id);
                                    }}
                                    disabled={previewOperationId === op.id}
                                  >
                                    {previewOperationId === op.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    Aperçu
                                  </Button>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {/* Liste compacte Destination */}
                    {destOps.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1.5">
                          Destination (envoi)
                        </h4>
                        <ul className="space-y-0.5">
                          {destOps.map((op) => {
                            const isSelected = selectedEndpoint?.id === op.id && selectedEndpoint?.type === 'destination';
                            return (
                              <li key={op.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedEndpoint({ id: op.id, type: 'destination' })}
                                  className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors ${
                                    isSelected
                                      ? 'bg-primary-100 border border-primary-300'
                                      : 'hover:bg-slate-100 border border-transparent'
                                  }`}
                                >
                                  <ChevronRight className={`w-4 h-4 shrink-0 text-slate-400 ${isSelected ? 'text-primary-600' : ''}`} />
                                  <span className="font-medium text-slate-800 truncate">{op.label}</span>
                                  <span className="text-xs font-mono text-slate-400 shrink-0 truncate max-w-[140px]">
                                    {op.method} {op.path ?? op.id}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {/* Liste compacte Déclencheurs */}
                    {triggerOps.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1.5">
                          Déclencheurs
                        </h4>
                        <ul className="space-y-0.5">
                          {triggerOps.map((op) => {
                            const isSelected = selectedEndpoint?.id === op.id && selectedEndpoint?.type === 'trigger';
                            return (
                              <li key={op.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedEndpoint({ id: op.id, type: 'trigger' })}
                                  className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors ${
                                    isSelected
                                      ? 'bg-amber-100 border border-amber-300'
                                      : 'hover:bg-slate-100 border border-transparent'
                                  }`}
                                >
                                  <ChevronRight className={`w-4 h-4 shrink-0 text-slate-400 ${isSelected ? 'text-amber-600' : ''}`} />
                                  <span className="font-medium text-slate-800 truncate">{op.label}</span>
                                  {op.path && (
                                    <span className="text-xs font-mono text-slate-400 shrink-0 truncate max-w-[120px]">
                                      {op.method} {op.path}
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {/* Champs de l'endpoint sélectionné */}
                    {selectedEndpoint && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        {selectedEndpoint.type === 'source' && (() => {
                          const op = sourceOps.find((o) => o.id === selectedEndpoint.id);
                          return op ? (
                            <SchemaFieldsList
                              schema={op.outputSchema}
                              title="Champs retournés (JSON)"
                              variant="output"
                              className="pl-2 border-l-2 border-emerald-300"
                            />
                          ) : null;
                        })()}
                        {selectedEndpoint.type === 'destination' && (() => {
                          const op = destOps.find((o) => o.id === selectedEndpoint.id);
                          return op ? (
                            <SchemaFieldsList
                              schema={op.inputSchema}
                              title="Champs à remplir (JSON)"
                              variant="input"
                              className="pl-2 border-l-2 border-primary-300"
                            />
                          ) : null;
                        })()}
                        {selectedEndpoint.type === 'trigger' && (() => {
                          const op = triggerOps.find((o) => o.id === selectedEndpoint.id);
                          return op ? (
                            <SchemaFieldsList
                              schema={op.configSchema ?? op.inputSchema}
                              title="Config / champs"
                              variant="input"
                              className="pl-2 border-l-2 border-amber-300"
                            />
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Droite : fenêtre d'aperçu (visible sans scroll) */}
                <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/50 flex flex-col min-h-[280px] lg:min-h-0 lg:sticky lg:top-4">
                  <div className="p-4 flex-1 flex flex-col min-h-0">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary-500" />
                      Aperçu API
                    </h4>
                    {previewError && (
                      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-red-700">Erreur</p>
                          <p className="text-sm text-slate-700 mt-0.5 break-words">{previewError}</p>
                        </div>
                      </div>
                    )}
                    {!previewError && previewData && (
                      <div className="flex-1 flex flex-col min-h-0">
                        <p className="text-sm text-slate-600 mb-2">
                          <strong>{previewData.count}</strong> enregistrement(s)
                        </p>
                        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-xs border-collapse">
                            <thead className="sticky top-0 bg-slate-100">
                              <tr className="border-b border-slate-200">
                                {previewData.items.length > 0 &&
                                  Object.keys(previewData.items[0]).slice(0, 6).map((key) => (
                                    <th key={key} className="text-left py-1.5 px-2 font-medium text-slate-600">
                                      {key}
                                    </th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.items.slice(0, 15).map((row, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                  {Object.entries(row)
                                    .slice(0, 6)
                                    .map(([k, v]) => (
                                      <td key={k} className="py-1.5 px-2 text-slate-700 max-w-[120px] truncate" title={String(v)}>
                                        {v != null && typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                      </td>
                                    ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {previewData.count > 15 && (
                          <p className="text-xs text-slate-500 mt-1">
                            Affichage des 15 premiers sur {previewData.count}
                          </p>
                        )}
                      </div>
                    )}
                    {!previewError && !previewData && (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white/50 p-6 text-center gap-2">
                        <p className="text-sm text-slate-500">
                          Sélectionnez un endpoint <strong>Source</strong> et cliquez sur <strong>Aperçu</strong> pour voir les données ici.
                        </p>
                        <p className="text-xs text-slate-400">
                          Les chemins contenant <code className="px-1 py-0.5 bg-slate-100 rounded">{'{id}'}</code> ou d’autres paramètres utilisent la valeur <strong>1</strong> par défaut pour l’aperçu.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
