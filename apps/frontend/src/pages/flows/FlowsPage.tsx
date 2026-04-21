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
  ArrowRight,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { engineApi } from '../../api/engine';

const EVENTS_PAGE_SIZE = 15;

function formatISODate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso.slice(0, 19).replace('T', ' ');
  }
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

  const filteredMessages = useMemo(() => {
    const msgs = data?.gateMessages ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return msgs;
    return msgs.filter(
      (m) =>
        m.clientId.toLowerCase().includes(q) ||
        m.route.toLowerCase().includes(q) ||
        m.bodyPreview.toLowerCase().includes(q) ||
        m.messageId.toLowerCase().includes(q),
    );
  }, [data?.gateMessages, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / EVENTS_PAGE_SIZE));
  const pageMessages = useMemo(
    () =>
      filteredMessages.slice(
        page * EVENTS_PAGE_SIZE,
        page * EVENTS_PAGE_SIZE + EVENTS_PAGE_SIZE,
      ),
    [filteredMessages, page],
  );

  const q = data?.queues?.flowExecutions;
  const gs = data?.gateStreams;

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
              <p>
                Cette vue est réservée aux rôles opérateur ou administrateur.
              </p>
              <Link
                to="/planifier"
                className="inline-flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700"
              >
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
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary-500" />
              Flux
            </h1>
            <p className="text-slate-600 mt-1 max-w-2xl">
              Supervision en temps réel : gate Redis (streams ingress/DLQ), Benthos gate.edicloud.app
              et files d&apos;exécution BullMQ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
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
                Impossible de charger la supervision. Vérifiez votre session ou réessayez.
              </p>
            </CardContent>
          </Card>
        )}

        {data && !isLoading && (
          <>
            {/* ── Infrastructure cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Redis local */}
              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${data.redis.ok ? 'bg-sky-50 border-sky-200' : 'bg-red-50 border-red-200'}`}
                    >
                      <Database
                        className={`w-5 h-5 ${data.redis.ok ? 'text-sky-600' : 'text-red-500'}`}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Redis local
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {data.redis.ok ? 'Joignable' : 'Indisponible'}
                      </p>
                      {data.redis.ok && data.redis.latencyMs != null && (
                        <p className="text-xs text-slate-500 tabular-nums">
                          PING ~ {data.redis.latencyMs} ms
                        </p>
                      )}
                      {!data.redis.ok && data.redis.error && (
                        <p className="text-xs text-red-600 break-words">{data.redis.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benthos gate.edicloud.app */}
              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${data.benthos.ok ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}
                    >
                      <Workflow
                        className={`w-5 h-5 ${data.benthos.ok ? 'text-indigo-600' : 'text-red-500'}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Benthos
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {data.benthos.ok ? 'En ligne' : 'Hors ligne'}
                      </p>
                      <p
                        className="text-xs text-slate-500 truncate"
                        title={data.benthos.httpUrl}
                      >
                        {data.benthos.httpUrl.replace('https://', '')}
                      </p>
                      {!data.benthos.ok && data.benthos.error && (
                        <p className="text-xs text-red-600">{data.benthos.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gate streams ingress */}
              <Card className="border border-slate-200/80 bg-white/95">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${gs?.error ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}
                    >
                      <Activity
                        className={`w-5 h-5 ${gs?.error ? 'text-red-500' : 'text-emerald-600'}`}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Gate Ingress
                      </p>
                      <p className="text-2xl font-bold text-slate-800 tabular-nums">
                        {(gs?.ingressGlobal ?? 0) + (gs?.ingressToyo ?? 0)}
                      </p>
                      <p className="text-xs text-slate-500">
                        global {gs?.ingressGlobal ?? 0} · toyo {gs?.ingressToyo ?? 0}
                      </p>
                      {gs?.error && (
                        <p className="text-xs text-red-600">{gs.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DLQ */}
              <Card
                className={`border bg-white/95 ${(gs?.dlqFlow ?? 0) + (gs?.dlqNoRoute ?? 0) > 0 ? 'border-amber-300' : 'border-slate-200/80'}`}
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${(gs?.dlqFlow ?? 0) + (gs?.dlqNoRoute ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <AlertTriangle
                        className={`w-5 h-5 ${(gs?.dlqFlow ?? 0) + (gs?.dlqNoRoute ?? 0) > 0 ? 'text-amber-500' : 'text-slate-400'}`}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        DLQ
                      </p>
                      <p
                        className={`text-2xl font-bold tabular-nums ${(gs?.dlqFlow ?? 0) + (gs?.dlqNoRoute ?? 0) > 0 ? 'text-amber-600' : 'text-slate-800'}`}
                      >
                        {(gs?.dlqFlow ?? 0) + (gs?.dlqNoRoute ?? 0)}
                      </p>
                      <p className="text-xs text-slate-500">
                        flow {gs?.dlqFlow ?? 0} · noroute {gs?.dlqNoRoute ?? 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── BullMQ queue stats ── */}
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

            {/* ── Gate Redis messages table ── */}
            <Card className="border border-slate-200/80 bg-white/95 overflow-hidden">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <Inbox className="w-5 h-5 text-indigo-500" />
                      Derniers messages — ingress:global
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1 font-normal">
                      Messages reçus par Benthos sur gate.edicloud.app (gate Redis · XREVRANGE).
                    </p>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Filtrer (client, route, JSON…)"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                      }}
                      className="pl-9"
                      aria-label="Filtrer les messages"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                          Reçu le
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                          Client
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                          Route
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                          Auth
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 min-w-[220px]">
                          Aperçu body
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageMessages.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-14 text-center text-slate-500 text-sm"
                          >
                            {(data.gateMessages?.length ?? 0) === 0
                              ? "Aucun message dans ingress:global pour l'instant."
                              : 'Aucun résultat pour ce filtre.'}
                          </td>
                        </tr>
                      ) : (
                        pageMessages.map((msg) => (
                          <tr
                            key={msg.id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {formatISODate(msg.receivedAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                {msg.clientId || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-700">
                              {msg.route || 'default'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{msg.authType}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono break-all max-w-xs">
                              {msg.bodyPreview}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredMessages.length > EVENTS_PAGE_SIZE && (
                  <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-sm text-slate-600">
                      {page * EVENTS_PAGE_SIZE + 1}–
                      {Math.min(
                        (page + 1) * EVENTS_PAGE_SIZE,
                        filteredMessages.length,
                      )}{' '}
                      sur {filteredMessages.length}
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
                        {page + 1} / {totalPages}
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
