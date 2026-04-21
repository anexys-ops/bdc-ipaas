import { useQuery } from '@tanstack/react-query';
import {
  Server,
  Database,
  Boxes,
  Workflow,
  Cpu,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { engineApi } from '../../api/engine';

type ProbeState = 'up' | 'down' | 'loading' | 'error';

function StatusDot({ state, label }: { state: ProbeState; label: string }) {
  if (state === 'loading') {
    return (
      <Loader2
        className="w-3.5 h-3.5 shrink-0 animate-spin text-slate-400"
        aria-label={`${label} : vérification`}
      />
    );
  }
  if (state === 'error') {
    return (
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-label={`${label} : erreur`} />
    );
  }
  if (state === 'up') {
    return (
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-label={`${label} : OK`} />
    );
  }
  return <XCircle className="w-3.5 h-3.5 shrink-0 text-red-500" aria-label={`${label} : indisponible`} />;
}

function ServiceChip({
  icon: Icon,
  label,
  state,
  detail,
}: {
  icon: typeof Server;
  label: string;
  state: ProbeState;
  detail: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 py-1 shadow-sm"
      title={detail}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden />
      <span className="font-medium text-slate-700">{label}</span>
      <StatusDot state={state} label={label} />
    </div>
  );
}

export function BackofficeServerStatusStrip() {
  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ['platform-health'],
    queryFn: engineApi.getPlatformHealth,
    refetchInterval: 25_000,
    staleTime: 8_000,
    retry: 1,
  });

  const errMsg = error instanceof Error ? error.message : 'Erreur réseau';

  if (isError) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-1.5 text-xs text-amber-900"
        role="alert"
      >
        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
        <span title={errMsg}>Sonde santé indisponible ({errMsg})</span>
      </div>
    );
  }

  const items: Array<{
    icon: typeof Server;
    label: string;
    state: ProbeState;
    detail: string;
  }> = isLoading || !data
    ? [
        { icon: Server, label: 'API', state: 'loading', detail: 'Vérification…' },
        { icon: Database, label: 'Postgres', state: 'loading', detail: 'Vérification…' },
        { icon: Boxes, label: 'Redis', state: 'loading', detail: 'Vérification…' },
        { icon: Workflow, label: 'Benthos', state: 'loading', detail: 'Vérification…' },
        { icon: Cpu, label: 'Worker', state: 'loading', detail: 'Vérification…' },
      ]
    : [
        {
          icon: Server,
          label: 'API',
          state: 'up',
          detail: 'API HTTP répond',
        },
        {
          icon: Database,
          label: 'Postgres',
          state: data.database.ok ? 'up' : 'down',
          detail: data.database.ok
            ? `Latence ${data.database.latencyMs ?? '—'} ms`
            : data.database.error ?? 'Base indisponible',
        },
        {
          icon: Boxes,
          label: 'Redis',
          state: data.redis.ok ? 'up' : 'down',
          detail: data.redis.ok
            ? `PONG${data.redis.latencyMs != null ? ` · ${data.redis.latencyMs} ms` : ''}`
            : data.redis.error ?? 'Redis indisponible',
        },
        {
          icon: Workflow,
          label: 'Benthos',
          state: data.benthos.ok ? 'up' : 'down',
          detail: data.benthos.ok
            ? data.benthosHeartbeat.listLength != null
              ? `Heartbeat Redis · ${data.benthosHeartbeat.listLength} entrée(s)`
              : 'HTTP OK'
            : data.benthos.error ?? 'Benthos injoignable',
        },
        {
          icon: Cpu,
          label: 'Worker',
          state: data.workerQueue.ok ? 'up' : 'down',
          detail: data.workerQueue.ok
            ? `Queue fichiers · actifs ${data.workerQueue.counts?.active ?? 0}, attente ${data.workerQueue.counts?.waiting ?? 0}`
            : data.workerQueue.error ?? 'Queue inaccessible',
        },
      ];

  const checked =
    dataUpdatedAt > 0
      ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label="État des services plateforme"
    >
      {items.map((item) => (
        <ServiceChip key={item.label} {...item} />
      ))}
      {checked && (
        <span className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap" title="Dernière sonde">
          MAJ {checked}
        </span>
      )}
    </div>
  );
}
