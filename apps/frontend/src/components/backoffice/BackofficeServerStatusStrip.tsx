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
  Container,
} from 'lucide-react';
import { engineApi } from '../../api/engine';

type ProbeState = 'up' | 'down' | 'loading' | 'error';

interface DockerStat {
  name: string;
  id: string;
  status: 'running' | 'exited' | 'unknown';
  cpuPercent: number;
  memUsageMb: number;
  memLimitMb: number;
  memPercent: number;
}

function StatusDot({ state, label }: { state: ProbeState; label: string }) {
  if (state === 'loading')
    return <Loader2 className="w-3 h-3 shrink-0 animate-spin text-slate-400" aria-label={`${label} : vérification`} />;
  if (state === 'error')
    return <AlertCircle className="w-3 h-3 shrink-0 text-amber-500" aria-label={`${label} : erreur`} />;
  if (state === 'up')
    return <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" aria-label={`${label} : OK`} />;
  return <XCircle className="w-3 h-3 shrink-0 text-red-500" aria-label={`${label} : indisponible`} />;
}

function ServiceChip({
  icon: Icon,
  label,
  state,
  detail,
  sub,
}: {
  icon: typeof Server;
  label: string;
  state: ProbeState;
  detail: string;
  sub?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-1.5 py-0.5 shadow-sm text-[11px] font-medium text-slate-700 cursor-default"
      title={detail}
    >
      <Icon className="w-3 h-3 shrink-0 text-slate-400" aria-hidden />
      <span>{label}</span>
      {sub && <span className="text-slate-400 font-normal hidden sm:inline">{sub}</span>}
      <StatusDot state={state} label={label} />
    </div>
  );
}

function DockerChip({ stat }: { stat: DockerStat }) {
  const labelMap: Record<string, string> = {
    'anexys-api': 'API',
    'anexys-postgres': 'PG',
    'anexys-redis': 'Redis',
    'anexys-benthos': 'Benthos',
    'anexys-worker': 'Worker',
  };
  const label = labelMap[stat.name] ?? stat.name.replace('anexys-', '');
  const isOk = stat.status === 'running';
  const cpuHigh = stat.cpuPercent > 80;
  const memHigh = stat.memPercent > 80;
  const warn = cpuHigh || memHigh;

  const detail = isOk
    ? `CPU ${stat.cpuPercent.toFixed(1)}% · Mém ${stat.memUsageMb} MB / ${stat.memLimitMb} MB (${stat.memPercent.toFixed(0)}%)`
    : `Conteneur ${stat.status}`;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 shadow-sm text-[11px] font-medium cursor-default ${
        isOk
          ? warn
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-slate-200/80 bg-white text-slate-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
      title={detail}
    >
      <Container className="w-3 h-3 shrink-0 text-slate-400" aria-hidden />
      <span>{label}</span>
      {isOk && (
        <>
          <span className={`hidden sm:inline ${cpuHigh ? 'text-amber-600' : 'text-slate-400'}`}>
            {stat.cpuPercent.toFixed(1)}%
          </span>
          <span className={`hidden md:inline ${memHigh ? 'text-amber-600' : 'text-slate-400'}`}>
            {stat.memUsageMb}MB
          </span>
        </>
      )}
      {isOk ? (
        warn ? (
          <AlertCircle className="w-3 h-3 shrink-0 text-amber-500" />
        ) : (
          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />
        )
      ) : (
        <XCircle className="w-3 h-3 shrink-0 text-red-500" />
      )}
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
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/90 px-2 py-1 text-[11px] text-amber-900"
        role="alert"
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <span title={errMsg}>Sonde indisponible</span>
      </div>
    );
  }

  const serviceItems: Array<{
    icon: typeof Server;
    label: string;
    state: ProbeState;
    detail: string;
    sub?: string;
  }> = isLoading || !data
    ? [
        { icon: Server,    label: 'API',     state: 'loading', detail: 'Vérification…' },
        { icon: Database,  label: 'Postgres', state: 'loading', detail: 'Vérification…' },
        { icon: Boxes,     label: 'Redis',   state: 'loading', detail: 'Vérification…' },
        { icon: Workflow,  label: 'Benthos', state: 'loading', detail: 'Vérification…' },
        { icon: Cpu,       label: 'Worker',  state: 'loading', detail: 'Vérification…' },
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
          sub: data.database.ok && data.database.latencyMs != null ? `${data.database.latencyMs}ms` : undefined,
        },
        {
          icon: Boxes,
          label: 'Redis',
          state: data.redis.ok ? 'up' : 'down',
          detail: data.redis.ok
            ? `PONG${data.redis.latencyMs != null ? ` · ${data.redis.latencyMs} ms` : ''}`
            : data.redis.error ?? 'Redis indisponible',
          sub: data.redis.ok && data.redis.latencyMs != null ? `${data.redis.latencyMs}ms` : undefined,
        },
        {
          icon: Workflow,
          label: 'Benthos',
          state: data.benthos.ok ? 'up' : 'down',
          detail: data.benthos.ok ? 'HTTP OK' : data.benthos.error ?? 'Benthos injoignable',
        },
        {
          icon: Cpu,
          label: 'Worker',
          state: data.workerQueue.ok ? 'up' : 'down',
          detail: data.workerQueue.ok
            ? `Actifs ${data.workerQueue.counts?.active ?? 0}, attente ${data.workerQueue.counts?.waiting ?? 0}`
            : data.workerQueue.error ?? 'Queue inaccessible',
          sub: data.workerQueue.ok && data.workerQueue.counts != null
            ? `${data.workerQueue.counts.active}a/${data.workerQueue.counts.waiting}w`
            : undefined,
        },
      ];

  const dockerStats: DockerStat[] = (data as any)?.dockerContainers ?? [];

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
      className="flex flex-wrap items-center gap-1.5"
      role="status"
      aria-live="polite"
      aria-label="État des services plateforme"
    >
      {/* Services probes */}
      {serviceItems.map((item) => (
        <ServiceChip key={item.label} {...item} />
      ))}

      {/* Séparateur Docker */}
      {dockerStats.length > 0 && (
        <>
          <span className="text-slate-200 select-none" aria-hidden>|</span>
          {dockerStats.map((s) => (
            <DockerChip key={s.name} stat={s} />
          ))}
        </>
      )}

      {/* Timestamp */}
      {checked && (
        <span className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap ml-0.5" title="Dernière sonde">
          MAJ {checked}
        </span>
      )}
    </div>
  );
}
