import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../../components/ui';
import {
  Zap,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Workflow,
  Activity,
  Loader2,
  ListOrdered,
  ArrowRight,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { engineApi } from '../../api/engine';

const EVENTS_PAGE_SIZE = 12;

function formatHeartbeatTime(payload: Record<string, unknown> | null): string {
  if (!payload) return '—';
  const ts = payload.ts;
  if (typeof ts !== 'number') return '—';
  const ms = ts < 1e12 ? ts * 1000 : ts;
  try {
    return new Date(ms).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function payloadField(payload: Record<string, unknown> | null, key: string): string {
  if (!payload) return '—';
  const v = payload[key];
  if (v === undefined || v === null) return '—';
  return String(v);
}

export function FlowsPage() {
  const user = useAuthStore((s) => s.user);
  const canView = user?.role === 'ADMIN' || user?.role === 'OPERATOR' || user?.role === 'SUPER_ADMIN';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['engine', 'flows-runtime'],
    queryFn: () => engineApi.getFlowsRuntime(),
    enabled: canView,
    refetchInterval: 30_000,
  });

  const filteredEvents = useMemo(() => {
    if (!data?.benthosEvents?.length) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.benthosEvents;
    return data.benthosEvents.filter((row) => {
      if (row.raw.toLowerCase().includes(q)) return true;
      if (!row.payload) return false;
      return Object.values(row.payload).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data?.benthosEvents, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PAGE_SIZE));
  const pageEvents = useMemo(
    () => filteredEvents.slice(page * EVENTS_PAGE_SIZE, page * EVENTS_PAGE_SIZE + EVENTS_PAGE_SIZE),
    [filteredEvents, page],
  );

  const q = data?.queues?.flowExecutions;

  if (!canView) {
    return (
      <div className="flex-1 min-h-0 w-full flex flex-col">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="border border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Zap className="w-6 h-6 text-primary-500" />
                Flux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-600">
              <p>Cette vue (supervision Redis, Benthos et files d&apos;exécution) est réservée aux rôles opérateur ou administrateur.</p>
              <Link to="/planifier" className="inline-flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700">
                <GitBranch className="w-4 h-4" />
                Ouvrir la planification des flux
                <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary-500" />
              Flux
            </h1>
            <p className="text-slate-600 mt-1 max-w-2xl">
              Données réelles : Redis (files BullMQ, heartbeats Benthos) et disponibilité du pipeline Benthos. Pour configurer
              vos intégrations, utilisez la planification.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Actualiser
            </Button>
            <Link to="/planifier">
              <Button type="button" variant="secondary" size="sm" className="gap-1.5">
                <GitBranch className="w-4 h-4" />
                Planifier
              </Button>
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-600">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
            <p className="text-sm font-medium">Chargement des données runtime…</p>
          </div>
        )}

        {isError && !isLoading && (
          <Card className="border border-amber-200 bg-amber-50/80 mb-8">
            <CardContent className="pt-6">
              <p className="text-amber-900 text-sm">
                Impossible de charger la supervision (API ou droits). Vérifiez votre session ou réessayez plus tard.
              </p>
            </CardContent>
          </Card>
        )}

        {data && !isLoading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sky-100 border border-sky-200">
                      <Database className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Redis</p>
                      <p className="text-lg font-bold text-slate-800">
                        {data.redis.ok ? 'Joignable' : 'Indisponible'}
                      </p>
                      {data.redis.ok && data.redis.latencyMs != null && (
                        <p className="text-xs text-slate-500 tabular-nums">PING ~ {data.redis.latencyMs} ms</p>
                      )}
                      {!data.redis.ok && data.redis.error && (
                        <p className="text-xs text-red-600 break-words">{data.redis.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-100 border border-indigo-200">
                      <Workflow className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Benthos</p>
                      <p className="text-lg font-bold text-slate-800">{data.benthos.ok ? 'En ligne' : 'Hors ligne'}</p>
                      <p className="text-xs text-slate-500 truncate" title={data.benthos.httpUrl}>
                        {data.benthos.httpUrl}
                      </p>
                      {!data.benthos.ok && data.benthos.error && (
                        <p className="text-xs text-red-600">{data.benthos.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-200">
                      <Activity className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Heartbeats Redis</p>
                      <p className="text-2xl font-bold text-slate-800 tabular-nums">
                        {data.benthosHeartbeat.listLength != null ? data.benthosHeartbeat.listLength : '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Clé <code className="text-slate-700">{data.benthosHeartbeat.redisKey}</code>
                      </p>
                      {data.benthosHeartbeat.error && (
                        <p className="text-xs text-red-600">{data.benthosHeartbeat.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-100 border border-violet-200">
                      <ListOrdered className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">File BullMQ</p>
                      {q ? (
                        <p className="text-sm font-semibold text-slate-800 tabular-nums">
                          actives {q.active} · attente {q.waiting}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">Queue non disponible</p>
                      )}
                      {q && (
                        <p className="text-xs text-slate-500 tabular-nums">
                          échouées {q.failed} · terminées {q.completed}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-4 pb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Actives</p>
                    <p className="text-xl font-bold tabular-nums">{q?.active ?? '—'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-4 pb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">En attente</p>
                    <p className="text-xl font-bold tabular-nums">{q?.waiting ?? '—'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-4 pb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Échouées</p>
                    <p className="text-xl font-bold tabular-nums">{q?.failed ?? '—'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-4 pb-4 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Terminées</p>
                    <p className="text-xl font-bold tabular-nums">{q?.completed ?? '—'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-slate-200/80 bg-white/95 overflow-hidden">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <Workflow className="w-5 h-5 text-indigo-500" />
                      Événements Benthos (Redis)
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1 font-normal">
                      Messages poussés par le pipeline dans la liste Redis (les plus récents en premier).
                    </p>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Filtrer (JSON, source, type…)"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                      }}
                      className="pl-9"
                      aria-label="Filtrer les événements"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                          Horodatage
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                          Source
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                          Type
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 min-w-[200px]">
                          Aperçu JSON
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageEvents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-14 text-center text-slate-500 text-sm">
                            {data.benthosEvents.length === 0
                              ? 'Aucun heartbeat en liste pour l’instant (attendez ~1 min après le démarrage de Benthos).'
                              : 'Aucun résultat pour ce filtre.'}
                          </td>
                        </tr>
                      ) : (
                        pageEvents.map((row) => (
                          <tr key={`${row.index}-${row.raw.slice(0, 24)}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {formatHeartbeatTime(row.payload)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">
                              {payloadField(row.payload, 'source')}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{payloadField(row.payload, 'kind')}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono break-all max-w-xl">
                              {row.raw.length > 180 ? `${row.raw.slice(0, 180)}…` : row.raw}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredEvents.length > EVENTS_PAGE_SIZE && (
                  <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-sm text-slate-600">
                      {page * EVENTS_PAGE_SIZE + 1}–{Math.min((page + 1) * EVENTS_PAGE_SIZE, filteredEvents.length)} sur{' '}
                      {filteredEvents.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Précédent
                      </Button>
                      <span className="text-sm text-slate-600 px-2">
                        Page {page + 1} / {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        Suivant
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
