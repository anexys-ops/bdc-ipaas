import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { MappingFieldsDnd, ConnectorSchemaFields } from '../../components/mapping';
import { connectorsApi } from '../../api/connectors';
import { marketplaceApi } from '../../api/marketplace';
import { mappingsApi } from '../../api/mappings';
import { parseSchemaFields } from '../../utils/schemaFields';
import { filterConfiguredConnectors, isFileOperation } from '../../lib/file-only-mode';
import { Loader2, ChevronRight, Copy, Save, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { MappingRule, ConfiguredConnector } from '../../types';

type Step = 0 | 1 | 2;

export function MappingNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [sourceConnector, setSourceConnector] = useState<ConfiguredConnector | null>(null);
  const [sourceOperationId, setSourceOperationId] = useState<string | null>(null);
  const [destConnector, setDestConnector] = useState<ConfiguredConnector | null>(null);
  const [destOperationId, setDestOperationId] = useState<string | null>(null);
  const [rules, setRules] = useState<MappingRule[]>([]);

  const { data: configuredConnectors = [], isLoading: loadingConnectors } = useQuery({
    queryKey: ['connectors'],
    queryFn: connectorsApi.getAll,
  });

  const { data: sourceDetail, isLoading: loadingSourceDetail } = useQuery({
    queryKey: ['marketplace', sourceConnector?.type],
    queryFn: () => marketplaceApi.getDetail(sourceConnector!.type),
    enabled: !!sourceConnector?.type,
  });

  const { data: destDetail, isLoading: loadingDestDetail } = useQuery({
    queryKey: ['marketplace', destConnector?.type],
    queryFn: () => marketplaceApi.getDetail(destConnector!.type),
    enabled: !!destConnector?.type,
  });

  const { data: sourceSchemaApi, isLoading: loadingSourceSchema } = useQuery({
    queryKey: ['marketplace', sourceConnector?.type, sourceOperationId, 'schema'],
    queryFn: () =>
      marketplaceApi.getOperationSchema(sourceConnector!.type, sourceOperationId!),
    enabled: !!sourceConnector?.type && !!sourceOperationId,
  });

  const { data: destSchemaApi, isLoading: loadingDestSchema } = useQuery({
    queryKey: ['marketplace', destConnector?.type, destOperationId, 'schema'],
    queryFn: () =>
      marketplaceApi.getOperationSchema(destConnector!.type, destOperationId!),
    enabled: !!destConnector?.type && !!destOperationId,
  });

  const sourceFieldsData = useMemo(() => {
    const out = sourceSchemaApi?.output;
    return out ? parseSchemaFields(out) : { fields: [], schemaForMapping: {} };
  }, [sourceSchemaApi?.output]);

  const destFieldsData = useMemo(() => {
    const inp = destSchemaApi?.input;
    return inp ? parseSchemaFields(inp) : { fields: [], schemaForMapping: {} };
  }, [destSchemaApi?.input]);

  const sourceSchema = sourceFieldsData.schemaForMapping as Record<string, unknown>;
  const destinationSchema = destFieldsData.schemaForMapping as Record<string, unknown>;

  const connectorsWithSource = useMemo(() => {
    return filterConfiguredConnectors(configuredConnectors).filter((c) => c.type);
  }, [configuredConnectors]);

  const sourceOps = (sourceDetail?.sourceOperations ?? []).filter(isFileOperation);
  const destOps = (destDetail?.destinationOperations ?? []).filter(isFileOperation);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Nom du mapping requis');
      return mappingsApi.create({
        name: name.trim(),
        sourceSchema,
        destinationSchema,
        rules,
        ...(sourceConnector?.id && { sourceConnectorId: sourceConnector.id }),
        ...(sourceOperationId && { sourceOperationId }),
        ...(destConnector?.id && { destinationConnectorId: destConnector.id }),
        ...(destOperationId && { destinationOperationId: destOperationId }),
      });
    },
    onSuccess: (data) => {
      toast.success('Mapping enregistré');
      navigate(`/mappings/${data.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur à l\'enregistrement');
    },
  });

  const handleDuplicate = () => {
    const baseName = name.trim() || 'Mapping';
    const copyName = baseName.match(/\(copie\)$/) ? `${baseName} (2)` : `${baseName} (copie)`;
    setName(copyName);
    toast.success('Dupliqué : modifiez le nom et enregistrez');
  };

  const canNextStep0 = sourceConnector && sourceOperationId && sourceFieldsData.fields.length > 0;
  const canNextStep1 = destConnector && destOperationId && destFieldsData.fields.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton to="/mappings" className="mb-6">
        Retour aux mappings
      </BackButton>

      <Card variant="glass" className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-slate-800">Nouveau mapping</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Choisissez le connecteur source puis le connecteur destination (marketplace), puis définissez les règles.
          </p>
          <div className="flex gap-2 mt-3">
            {([0, 1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium
                  ${step === s ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}
                `}
              >
                {s === 0 ? '1. Source' : s === 1 ? '2. Destination' : '3. Règles'}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 0: Connecteur source */}
          {step === 0 && (
            <>
              {connectorsWithSource.length === 0 && !loadingConnectors && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm text-amber-800 flex-1">
                    Aucun connecteur configuré. Ajoutez d’abord un connecteur (Sage, Dolibarr, etc.) depuis la page Connecteurs pour pouvoir choisir une source et une destination de mapping.
                  </p>
                  <Link to="/connectors/new">
                    <Button variant="outline" size="sm" className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Ajouter un connecteur
                    </Button>
                  </Link>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Connecteur source (logiciel connecté)
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  value={sourceConnector?.id ?? ''}
                  onChange={(e) => {
                    const c = configuredConnectors.find((x) => x.id === e.target.value);
                    setSourceConnector(c ?? null);
                    setSourceOperationId(null);
                  }}
                  disabled={loadingConnectors}
                >
                  <option value="">Choisir un connecteur…</option>
                  {connectorsWithSource.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.connectorInfo?.name ?? c.type})
                    </option>
                  ))}
                </select>
              </div>
              {sourceConnector && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Opération source (données récupérées)
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                      value={sourceOperationId ?? ''}
                      onChange={(e) => setSourceOperationId(e.target.value || null)}
                      disabled={loadingSourceDetail}
                    >
                      <option value="">Choisir une opération…</option>
                      {sourceOps.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {sourceOperationId && (
                    <div className="pt-4 border-t border-slate-200">
                      <ConnectorSchemaFields
                        title="Champs du fichier source"
                        subtitle="Obligatoires en vert, facultatifs en jaune"
                        fields={sourceFieldsData.fields}
                      />
                    </div>
                  )}
                </>
              )}
              {loadingSourceSchema && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement des champs…
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(1)}
                  disabled={!canNextStep0}
                >
                  Suivant : Destination <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {/* Step 1: Connecteur destination */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Connecteur destination (in / out valide)
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  value={destConnector?.id ?? ''}
                  onChange={(e) => {
                    const c = configuredConnectors.find((x) => x.id === e.target.value);
                    setDestConnector(c ?? null);
                    setDestOperationId(null);
                  }}
                  disabled={loadingConnectors}
                >
                  <option value="">Choisir un connecteur…</option>
                  {connectorsWithSource
                    .filter((c) => c.id !== sourceConnector?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.connectorInfo?.name ?? c.type})
                      </option>
                    ))}
                </select>
              </div>
              {destConnector && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Opération destination (données envoyées)
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                      value={destOperationId ?? ''}
                      onChange={(e) => setDestOperationId(e.target.value || null)}
                      disabled={loadingDestDetail}
                    >
                      <option value="">Choisir une opération…</option>
                      {destOps.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {destOperationId && (
                    <div className="pt-4 border-t border-slate-200">
                      <ConnectorSchemaFields
                        title="Champs du fichier destination"
                        subtitle="Obligatoires en vert, facultatifs en jaune"
                        fields={destFieldsData.fields}
                      />
                    </div>
                  )}
                </>
              )}
              {loadingDestSchema && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement des champs…
                </div>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canNextStep1}
                >
                  Suivant : Règles <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Règles + Enregistrer / Dupliquer */}
          {step === 2 && (
            <>
              <Input
                label="Nom du mapping"
                placeholder="Ex: Tiers Dolibarr → Facturation"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Règles (glisser un champ source vers un champ destination)</h3>
                <MappingFieldsDnd
                  sourceSchema={sourceSchema}
                  destinationSchema={destinationSchema}
                  rules={rules}
                  onRulesChange={setRules}
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !name.trim()}
                  loading={createMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer le process
                </Button>
                <Button variant="outline" onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliquer
                </Button>
                <Link to="/mappings">
                  <Button variant="ghost">Annuler</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
