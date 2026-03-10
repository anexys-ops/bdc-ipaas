import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { flowsApi } from '../../api/flows';
import { engineApi } from '../../api/engine';
import {
  GitBranch,
  Loader2,
  ArrowRight,
  Database,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react';
import type { Flow, FlowExecution } from '../../types';

function formatDate(s: string | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH} h`;
  if (diffD < 7) return `Il y a ${diffD} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: FlowExecution['status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'En attente', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    RUNNING: { label: 'En cours', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    SUCCESS: { label: 'Succès', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    PARTIAL: { label: 'Partiel', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    FAILED: { label: 'Échec', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    DRY_RUN_OK: { label: 'Test OK', className: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  };
  const { label, className } = map[status] ?? { label: status, className: 'bg-slate-500/20 text-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${className}`}>
      {status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'FAILED' && <XCircle className="w-3 h-3" />}
      {status === 'RUNNING' && <Clock className="w-3 h-3 animate-pulse" />}
      {label}
    </span>
  );
}

function FlowCard({ flow }: { flow: Flow }) {
  const { data: executions, isLoading: loadingExecutions } = useQuery({
    queryKey: ['flow-executions', flow.id],
    queryFn: () => engineApi.getFlowExecutions(flow.id, 5),
    enabled: !!flow.id,
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary-500" />
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
        {flow.description && (
          <p className="text-sm text-slate-500 mt-1">{flow.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Échanges aller : Source → Destinations */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Échanges aller (source → destinations)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-sm font-medium">
              <Database className="w-4 h-4" />
              {flow.sourceConnectorName}
            </span>
            {flow.destinations.length === 0 ? (
              <span className="text-slate-400 text-sm">Aucune destination</span>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                {flow.destinations.map((dest) => (
                  <span
                    key={dest.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/15 text-primary-700 border border-primary-500/30 text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    {dest.connectorName}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Échanges retour : dernières exécutions */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Dernières exécutions (retour)
          </p>
          {loadingExecutions ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement…
            </div>
          ) : !executions?.length ? (
            <p className="text-sm text-slate-500">Aucune exécution pour l’instant.</p>
          ) : (
            <ul className="space-y-1.5">
              {executions.map((ex) => (
                <li
                  key={ex.executionId}
                  className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ex.status} />
                    <span className="text-slate-500">{formatDate(ex.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 tabular-nums">
                    <span title="Entrées">{ex.recordsIn ?? 0} in</span>
                    <span title="Sorties">{ex.recordsOut ?? 0} out</span>
                    {ex.recordsFailed != null && ex.recordsFailed > 0 && (
                      <span className="text-red-600">{ex.recordsFailed} err.</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FlowsPage() {
  const { data: flows, isLoading, error } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.getAll(),
  });

  const count = flows?.length ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center">
        <div className="glass-card p-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-slate-400">Chargement des flux...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen page-bg-mesh flex items-center justify-center p-4">
        <Card className="max-w-md text-center py-10">
          <p className="text-sm text-red-500">Erreur lors du chargement des flux.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary-400" />
          Flux
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          <span className="font-semibold text-slate-300">{count}</span> flux
          {count !== 1 ? 's' : ''} — échanges aller (source → destinations) et retour (exécutions).
        </p>
      </div>
        {count === 0 ? (
          <Card className="text-center py-12">
            <GitBranch className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <CardTitle className="text-slate-800">Aucun flux</CardTitle>
            <CardContent className="mt-2">
              <p className="text-sm text-slate-500 mb-6">
                Créez un flux pour définir une source et des destinations, puis lancez les
                exécutions pour voir les échanges aller et retour.
              </p>
              <Link to="/dashboard">
                <Button>Retour au tableau de bord</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-6">
            {flows?.map((flow) => (
              <li key={flow.id}>
                <FlowCard flow={flow} />
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
