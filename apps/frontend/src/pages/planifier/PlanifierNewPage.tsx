import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { mappingsApi } from '../../api/mappings';
import { flowsApi, type CreateFlowDto, type TriggerType } from '../../api/flows';
import { BackButton } from '../../components/layout/BackButton';
import { CalendarClock, Loader2, FileStack } from 'lucide-react';
import type { Mapping } from '../../types';
import { toast } from 'sonner';
import { IngressBenthosFields } from './IngressBenthosFields';

const CRON_PRESETS: { value: string; label: string }[] = [
  { value: '*/5 * * * *', label: 'Toutes les 5 minutes' },
  { value: '*/15 * * * *', label: 'Toutes les 15 minutes' },
  { value: '*/30 * * * *', label: 'Toutes les 30 minutes' },
  { value: '0 * * * *', label: 'Toutes les heures' },
  { value: '0 */6 * * *', label: 'Toutes les 6 heures' },
  { value: '0 */12 * * *', label: 'Toutes les 12 heures' },
  { value: '0 2 * * *', label: 'Quotidien à 2h00' },
  { value: '0 3 * * 0', label: 'Hebdomadaire (dimanche 3h00)' },
  { value: '0 0 * * *', label: 'Quotidien à minuit' },
  { value: '0 8 * * 1-5', label: 'Jours ouvrés à 8h00' },
  { value: 'CUSTOM', label: 'Expression personnalisée' },
];

export function PlanifierNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isBackoffice = location.pathname.startsWith('/backoffice/');
  const basePath = isBackoffice ? '/backoffice/planifier' : '/planifier';
  const mappingsPath = isBackoffice ? '/backoffice/mappings' : '/mappings';
  const canvasPath = isBackoffice ? '/backoffice/mappings/canvas' : '/mappings/canvas';
  const [selectedMappingId, setSelectedMappingId] = useState<string>('');
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('CRON');
  const [cronPreset, setCronPreset] = useState(CRON_PRESETS[0].value);
  const [cronCustom, setCronCustom] = useState('');
  const [webhookDelayMs, setWebhookDelayMs] = useState('');
  const [inputPath, setInputPath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [ingressViaBenthos, setIngressViaBenthos] = useState(false);
  const [benthosStream, setBenthosStream] = useState('ingress:global');
  const [ingestionToken, setIngestionToken] = useState('');

  const { data: mappings, isLoading: loadingMappings } = useQuery({
    queryKey: ['mappings'],
    queryFn: mappingsApi.getAll,
  });

  const mapping = mappings?.find((m: Mapping) => m.id === selectedMappingId);
  const canSubmit =
    selectedMappingId &&
    name.trim().length >= 3 &&
    mapping?.sourceConnectorId &&
    mapping?.destinationConnectorId &&
    (triggerType !== 'CRON' || (cronPreset === 'CUSTOM' ? cronCustom.trim() : cronPreset)) &&
    (triggerType !== 'FILE_WATCH' || (inputPath.trim().length > 0 && outputPath.trim().length > 0)) &&
    (!ingressViaBenthos || benthosStream.trim().length > 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!mapping?.sourceConnectorId || !mapping?.destinationConnectorId) throw new Error('Mapping invalide');
      const benthosExtra: Record<string, unknown> = ingressViaBenthos
        ? {
            ingressViaBenthos: true,
            stream: benthosStream.trim(),
            ...(ingestionToken.trim() ? { ingestionToken: ingestionToken.trim() } : {}),
          }
        : {};
      const triggerConfig: Record<string, unknown> =
        triggerType === 'CRON'
          ? { cron: cronPreset === 'CUSTOM' ? cronCustom.trim() : cronPreset }
          : triggerType === 'WEBHOOK'
            ? {
                delayMs: webhookDelayMs ? parseInt(webhookDelayMs, 10) : undefined,
                ...benthosExtra,
              }
            : { inputPath: inputPath.trim(), outputPath: outputPath.trim(), ...benthosExtra };
      const dto: CreateFlowDto = {
        name: name.trim(),
        description: `Planification: ${mapping.name}`,
        sourceConnectorId: mapping.sourceConnectorId,
        triggerType,
        triggerConfig,
      };
      const flow = await flowsApi.create(dto);
      await flowsApi.addDestination(flow.id, {
        connectorId: mapping.destinationConnectorId,
        mappingId: mapping.id,
      });
      return flow;
    },
    onSuccess: () => {
      toast.success('Planification créée');
      navigate(basePath);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSelectMapping = (m: Mapping) => {
    setSelectedMappingId(m.id);
    if (!name || name === mapping?.name) setName(m.name);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton to={basePath} className="mb-6" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary-500" />
            Nouvelle planification
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Choisissez un mapping existant et définissez comment il sera déclenché (cron, webhook ou fichier).
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Étape 1 : Choisir le mapping */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">1. Mapping à planifier</h3>
            {loadingMappings ? (
              <div className="flex items-center gap-2 text-slate-500 py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                Chargement des mappings…
              </div>
            ) : !mappings?.length ? (
              <p className="text-sm text-slate-500 py-4">
                Aucun mapping. <Link to={canvasPath} className="text-primary-600 underline">Créer un mapping</Link>.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {(mappings ?? []).map((m: Mapping) => {
                  const isPlanifiable = !!(m.sourceConnectorId && m.destinationConnectorId);
                  const isSelected = selectedMappingId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectMapping(m)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/30'
                          : isPlanifiable
                            ? 'border-slate-200 hover:border-primary-300 bg-white hover:bg-primary-50/50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isPlanifiable ? 'bg-violet-500/20' : 'bg-amber-500/20'}`}>
                        <FileStack className={`w-5 h-5 ${isPlanifiable ? 'text-violet-600' : 'text-amber-600'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">{m.name}</p>
                        <p className="text-xs text-slate-500">
                          {Array.isArray(m.rules) ? m.rules.length : 0} règle(s)
                          {!isPlanifiable && ' • À compléter (source/destination)'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedMappingId && mapping && !(mapping.sourceConnectorId && mapping.destinationConnectorId) && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <strong>Mapping « {mapping.name} » sans source/destination.</strong>
                <br />
                Pour le planifier, enregistrez-le depuis le canevas :{' '}
                <Link to={canvasPath} className="font-medium underline">
                  Canevas mapping
                </Link>
                , déposez une opération <strong>source</strong> (verte) et une <strong>destination</strong> (bleue), puis enregistrez.
              </div>
            )}
            {(mappings?.length ?? 0) > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Les mappings créés depuis le canevas avec une source et une destination déposées sont planifiables.
                Les autres : ouvrez-les dans <Link to={mappingsPath} className="text-primary-600 underline">Mappings</Link> puis enregistrez depuis le canevas pour lier les connecteurs.
              </p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la planification</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sync clients toutes les heures"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition"
              minLength={3}
            />
          </div>

          {/* Type de déclencheur */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">2. Déclencheur</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="triggerType"
                  checked={triggerType === 'CRON'}
                  onChange={() => setTriggerType('CRON')}
                  className="text-primary-600"
                />
                <span className="text-slate-700">Cron (répété)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="triggerType"
                  checked={triggerType === 'WEBHOOK'}
                  onChange={() => setTriggerType('WEBHOOK')}
                  className="text-primary-600"
                />
                <span className="text-slate-700">Webhook (à la demande)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="triggerType"
                  checked={triggerType === 'FILE_WATCH'}
                  onChange={() => setTriggerType('FILE_WATCH')}
                  className="text-primary-600"
                />
                <span className="text-slate-700">Fichier (dossier surveillé)</span>
              </label>
            </div>

            {triggerType === 'CRON' && (
              <div className="space-y-3 pl-6 border-l-2 border-slate-200">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Fréquence</label>
                  <select
                    value={cronPreset}
                    onChange={(e) => setCronPreset(e.target.value)}
                    className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  >
                    {CRON_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                {cronPreset === 'CUSTOM' && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Expression cron (5 champs)</label>
                    <input
                      type="text"
                      value={cronCustom}
                      onChange={(e) => setCronCustom(e.target.value)}
                      placeholder="Ex: 0 */6 * * *"
                      className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Format: minute heure jour-du-mois mois jour-de-la-semaine
                    </p>
                  </div>
                )}
              </div>
            )}

            {triggerType === 'WEBHOOK' && (
              <div className="pl-6 border-l-2 border-slate-200 space-y-2">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Délai avant traitement (ms, optionnel)</label>
                  <input
                    type="number"
                    value={webhookDelayMs}
                    onChange={(e) => setWebhookDelayMs(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Le flux sera exécutable via l’API (POST /flows/:id/execute) ou un webhook configuré côté moteur.
                </p>
                <IngressBenthosFields
                  ingressViaBenthos={ingressViaBenthos}
                  onIngressViaBenthos={setIngressViaBenthos}
                  benthosStream={benthosStream}
                  onBenthosStream={setBenthosStream}
                  ingestionToken={ingestionToken}
                  onIngestionToken={setIngestionToken}
                />
              </div>
            )}
            {triggerType === 'FILE_WATCH' && (
              <div className="pl-6 border-l-2 border-slate-200 space-y-2">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Chemin d'entrée (fichiers reçus)</label>
                  <input
                    type="text"
                    value={inputPath}
                    onChange={(e) => setInputPath(e.target.value)}
                    placeholder="/data/incoming"
                    className="w-full max-w-lg px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Chemin de sortie (fichier transformé)</label>
                  <input
                    type="text"
                    value={outputPath}
                    onChange={(e) => setOutputPath(e.target.value)}
                    placeholder="/data/outgoing"
                    className="w-full max-w-lg px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>
                <IngressBenthosFields
                  ingressViaBenthos={ingressViaBenthos}
                  onIngressViaBenthos={setIngressViaBenthos}
                  benthosStream={benthosStream}
                  onBenthosStream={setBenthosStream}
                  ingestionToken={ingestionToken}
                  onIngestionToken={setIngestionToken}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création…
                </>
              ) : (
                'Créer la planification'
              )}
            </Button>
            <Link to={basePath}>
              <Button variant="outline">Annuler</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
