import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { flowsApi } from '../../api/flows';
import { CalendarClock, Plus, Loader2, ArrowRight, Database, Upload, Trash2, Play, Pause } from 'lucide-react';
import type { Flow } from '../../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function formatTrigger(config: Record<string, unknown>, triggerType: string): string {
  const benthosSuffix =
    config?.ingressViaBenthos === true
      ? ` · Benthos (${typeof config.stream === 'string' && config.stream ? config.stream : 'stream'})`
      : '';
  if (triggerType === 'CRON' && typeof config?.cron === 'string') {
    const presets: Record<string, string> = {
      '*/5 * * * *': 'Toutes les 5 min',
      '*/15 * * * *': 'Toutes les 15 min',
      '*/30 * * * *': 'Toutes les 30 min',
      '0 * * * *': 'Toutes les heures',
      '0 */6 * * *': 'Toutes les 6 h',
      '0 */12 * * *': 'Toutes les 12 h',
      '0 2 * * *': 'Quotidien (2h00)',
      '0 3 * * 0': 'Hebdo (dim. 3h00)',
    };
    return presets[config.cron] ?? config.cron;
  }
  if (triggerType === 'WEBHOOK') return `Webhook${benthosSuffix}`;
  if (triggerType === 'MANUAL') return 'Manuel';
  if (triggerType === 'FILE_WATCH') {
    const inPath = typeof config?.inputPath === 'string' ? config.inputPath : '';
    const outPath = typeof config?.outputPath === 'string' ? config.outputPath : '';
    if (inPath || outPath) {
      return `Fichier (${inPath || '-'} -> ${outPath || '-'})${benthosSuffix}`;
    }
    return `Fichier${benthosSuffix}`;
  }
  return triggerType;
}

function FlowPlanCard({ flow, basePath }: { flow: Flow; basePath: string }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => flowsApi.delete(flow.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Planification supprimée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: () => (flow.isActive ? flowsApi.deactivate(flow.id) : flowsApi.activate(flow.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success(flow.isActive ? 'Planification désactivée' : 'Planification activée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary-500" />
            {flow.name}
          </CardTitle>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              flow.isActive ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 text-slate-500'
            }`}
          >
            {flow.isActive ? 'Actif' : 'Inactif'}
          </span>
        </div>
        {flow.description && <p className="text-sm text-slate-500 mt-1">{flow.description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Source → Destination</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-sm font-medium">
              <Database className="w-4 h-4" />
              {flow.sourceConnectorName}
            </span>
            {flow.destinations?.length ? (
              <>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                {flow.destinations.map((dest) => (
                  <span
                    key={dest.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/15 text-primary-700 border border-primary-500/30 text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    {dest.connectorName}
                    {dest.mappingId && <span className="text-primary-500/80">+ mapping</span>}
                  </span>
                ))}
              </>
            ) : (
              <span className="text-slate-400 text-sm">Aucune destination</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Déclencheur : <strong className="text-slate-700">{formatTrigger(flow.triggerConfig ?? {}, flow.triggerType)}</strong>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => activateMutation.mutate()}
            disabled={activateMutation.isPending}
          >
            {flow.isActive ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {flow.isActive ? 'Désactiver' : 'Activer'}
          </Button>
          <Link to={`${basePath}/${flow.id}/edit`}>
            <Button size="sm" variant="outline">Modifier</Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={() => {
              if (window.confirm('Supprimer cette planification ?')) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlanifierPage() {
  const location = useLocation();
  const isBackoffice = location.pathname.startsWith('/backoffice/');
  const basePath = isBackoffice ? '/backoffice/planifier' : '/planifier';
  const { data: flows, isLoading, error } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.getAll(),
  });

  const count = flows?.length ?? 0;

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
        <div className="glass-card p-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-400">Chargement des planifications…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-4">
        <Card className="max-w-md text-center py-10">
          <p className="text-sm text-red-500">Erreur lors du chargement des planifications.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-primary-400" />
            Planifier
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Choisissez un mapping et planifiez son exécution par cron, webhook ou fichier.
          </p>
        </div>
        <Link to={`${basePath}/new`}>
          <Button size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle planification
          </Button>
        </Link>
      </div>

      {count === 0 ? (
        <Card className="text-center py-12">
          <CalendarClock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <CardTitle className="text-slate-800">Aucune planification</CardTitle>
          <CardContent className="mt-2">
            <p className="text-sm text-slate-500 mb-6">
              Créez une planification pour exécuter un mapping automatiquement (cron), via webhook ou en mode fichier.
            </p>
            <Link to={`${basePath}/new`}>
              <Button>Créer une planification</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-6">
          {flows?.map((flow) => (
            <li key={flow.id}>
              <FlowPlanCard flow={flow} basePath={basePath} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
