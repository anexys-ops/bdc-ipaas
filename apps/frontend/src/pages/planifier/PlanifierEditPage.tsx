import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { flowsApi, type UpdateFlowDto, type TriggerType } from '../../api/flows';
import { BackButton } from '../../components/layout/BackButton';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export function PlanifierEditPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('CRON');
  const [cronPreset, setCronPreset] = useState(CRON_PRESETS[0].value);
  const [cronCustom, setCronCustom] = useState('');
  const [webhookDelayMs, setWebhookDelayMs] = useState('');

  const { data: flow, isLoading } = useQuery({
    queryKey: ['flow', id],
    queryFn: () => flowsApi.getOne(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (flow) {
      setName(flow.name);
      setTriggerType((flow.triggerType as TriggerType) ?? 'CRON');
      const cfg = flow.triggerConfig ?? {};
      if (flow.triggerType === 'WEBHOOK') {
        setWebhookDelayMs(cfg.delayMs != null ? String(cfg.delayMs) : '');
      } else {
        const cron = (cfg.cron as string) ?? '';
        const preset = CRON_PRESETS.find((p) => p.value === cron);
        if (preset) {
          setCronPreset(preset.value);
        } else if (cron) {
          setCronPreset('CUSTOM');
          setCronCustom(cron);
        }
      }
    }
  }, [flow]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateFlowDto) => flowsApi.update(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      queryClient.invalidateQueries({ queryKey: ['flow', id] });
      toast.success('Planification mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const triggerConfig: Record<string, unknown> =
      triggerType === 'CRON'
        ? { cron: cronPreset === 'CUSTOM' ? cronCustom.trim() : cronPreset }
        : { delayMs: webhookDelayMs ? parseInt(webhookDelayMs, 10) : undefined };
    updateMutation.mutate({
      name: name.trim(),
      triggerType,
      triggerConfig,
    });
  };

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-slate-500">ID manquant.</p>
        <Link to="/planifier"><Button variant="outline" className="mt-4">Retour</Button></Link>
      </div>
    );
  }

  if (isLoading || !flow) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        Chargement…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton to="/planifier" className="mb-6" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary-500" />
            Modifier la planification
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">{flow.name}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              minLength={3}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Déclencheur</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="triggerType"
                  checked={triggerType === 'CRON'}
                  onChange={() => setTriggerType('CRON')}
                  className="text-primary-600"
                />
                <span className="text-slate-700">Cron</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="triggerType"
                  checked={triggerType === 'WEBHOOK'}
                  onChange={() => setTriggerType('WEBHOOK')}
                  className="text-primary-600"
                />
                <span className="text-slate-700">Webhook</span>
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
                    <label className="block text-sm text-slate-600 mb-1">Expression cron</label>
                    <input
                      type="text"
                      value={cronCustom}
                      onChange={(e) => setCronCustom(e.target.value)}
                      placeholder="Ex: 0 */6 * * *"
                      className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {triggerType === 'WEBHOOK' && (
              <div className="pl-6 border-l-2 border-slate-200">
                <label className="block text-sm text-slate-600 mb-1">Délai avant traitement (ms)</label>
                <input
                  type="number"
                  value={webhookDelayMs}
                  onChange={(e) => setWebhookDelayMs(e.target.value)}
                  min={0}
                  className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={name.trim().length < 3 || (triggerType === 'CRON' && cronPreset === 'CUSTOM' && !cronCustom.trim()) || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
            <Link to="/planifier">
              <Button variant="outline">Annuler</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
