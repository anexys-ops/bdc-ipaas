import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Database,
  GitBranch,
  KeyRound,
  ListOrdered,
  RefreshCw,
  Server,
  ShieldAlert,
  Timer,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import { engineApi, type PipelineHubOverview } from '../../api/engine';
import { agentsApi, type AgentRow } from '../../api/agents';
import { useAuthStore } from '../../stores/auth.store';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../../components/ui';

type TabId = 'runtime' | 'config' | 'redis' | 'agents' | 'queues' | 'history';

const TABS: { id: TabId; label: string }[] = [
  { id: 'runtime', label: 'Temps réel' },
  { id: 'config', label: 'Config & workers' },
  { id: 'redis', label: 'Router Redis' },
  { id: 'agents', label: 'Jetons agents' },
  { id: 'queues', label: 'Files d’attente' },
  { id: 'history', label: 'Historique Benthos' },
];

function statusDot(ok: boolean) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
      aria-hidden
    />
  );
}

export function PipelineHubPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const canManageAgents = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const [tab, setTab] = useState<TabId>('runtime');
  const [hub, setHub] = useState<PipelineHubOverview | null>(null);
  const [agents, setAgents] = useState<AgentRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPaths, setNewAgentPaths] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const loadHub = useCallback(async () => {
    const data = await engineApi.getPipelineHub();
    setHub(data);
  }, []);

  const loadAgents = useCallback(async () => {
    if (!canManageAgents) {
      setAgents(null);
      return;
    }
    try {
      const list = await agentsApi.list();
      setAgents(list);
    } catch {
      setAgents([]);
    }
  }, [canManageAgents]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadHub(), loadAgents()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [loadHub, loadAgents]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const handleRestartHint = async () => {
    setRestartMsg(null);
    try {
      const r = await engineApi.postPipelineRestartHint();
      setRestartMsg(r.message);
      toast.success('Demande enregistrée');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action refusée');
    }
  };

  const handleCreateAgent = async () => {
    const name = newAgentName.trim();
    const paths = newAgentPaths
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!name || paths.length === 0) {
      toast.error('Nom et au moins un chemin à surveiller sont requis');
      return;
    }
    try {
      const r = await agentsApi.create(name, paths);
      setCreatedToken(r.token);
      setNewAgentName('');
      setNewAgentPaths('');
      await loadAgents();
      toast.success('Jeton agent créé — copiez-le maintenant, il ne sera plus affiché.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Création impossible');
    }
  };

  const rt = hub?.runtime;

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Workflow className="w-7 h-7 text-primary-500" />
              Hub pipeline
            </h1>
            <p className="text-slate-600 mt-1 max-w-2xl">
              Benthos, Redis, jetons d’ingestion (router), agents desktop, files BullMQ et historique des heartbeats.
              Les nouvelles routes HTTP du router se configurent dans la planification du flux (trigger) puis sont
              poussées vers Redis à l’enregistrement.
            </p>
          </div>
          <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={() => void refreshAll()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-3 mb-4 border-b border-slate-200/80">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-primary-100 text-primary-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'runtime' && rt && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border border-slate-200/80 bg-white/95">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary-500" />
                  Redis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {statusDot(rt.redis.ok)}
                  <span>{rt.redis.ok ? `PING OK${rt.redis.latencyMs != null ? ` (${rt.redis.latencyMs} ms)` : ''}` : rt.redis.error ?? 'Indisponible'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {statusDot(rt.benthosHeartbeat.listLength != null)}
                  <span>
                    Liste heartbeat <code className="text-xs bg-slate-100 px-1 rounded">{rt.benthosHeartbeat.redisKey}</code> —{' '}
                    {rt.benthosHeartbeat.listLength ?? '—'} entrée(s)
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200/80 bg-white/95">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary-500" />
                  Benthos HTTP
                </CardTitle>
                <CardDescription className="text-xs">{rt.benthos.httpUrl}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex items-center gap-2">
                  {statusDot(rt.benthos.ok)}
                  <span>{rt.benthos.ok ? 'Service joignable' : rt.benthos.error ?? 'Erreur'}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200/80 bg-white/95 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-500" />
                  Queue flow-executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rt.queues.flowExecutions ? (
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Actifs</dt>
                      <dd className="font-semibold text-slate-800">{rt.queues.flowExecutions.active}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">En attente</dt>
                      <dd className="font-semibold text-slate-800">{rt.queues.flowExecutions.waiting}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Échoués</dt>
                      <dd className="font-semibold text-amber-700">{rt.queues.flowExecutions.failed}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Terminés</dt>
                      <dd className="font-semibold text-slate-800">{rt.queues.flowExecutions.completed}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-slate-500">Queue non disponible (worker / Redis non branché sur cette API).</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'config' && hub && (
          <div className="space-y-4">
            <Card className="border border-slate-200/80 bg-white/95">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary-500" />
                  Processus API
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 font-mono text-xs sm:text-sm">
                <p>
                  <span className="text-slate-500">NODE_ENV</span> {hub.config.nodeEnv}
                </p>
                <p>
                  <span className="text-slate-500">Uptime</span> {hub.config.uptimeSec}s
                </p>
                <p>
                  <span className="text-slate-500">BENTHOS_HTTP_URL</span> {hub.config.benthosHttpUrl}
                </p>
                <p className="break-all">
                  <span className="text-slate-500">REDIS_URL</span> {hub.config.redisUrlMasked}
                </p>
                <p>
                  <span className="text-slate-500">BENTHOS_REDIS_HEARTBEAT_KEY</span> {hub.config.heartbeatKey}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200/80 bg-white/95">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary-500" />
                  Workers BullMQ
                </CardTitle>
                <CardDescription>{hub.config.workerContainerHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Cette interface ne redémarre pas les conteneurs. En cas de changement de variables d’environnement,
                  redémarrez l’API et le worker sur votre hôte (Docker Compose, Kubernetes, etc.).
                </p>
                {isSuperAdmin ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Button type="button" variant="outline" className="gap-2 w-fit" onClick={() => void handleRestartHint()}>
                      <ShieldAlert className="w-4 h-4" />
                      Enregistrer une demande de relance
                    </Button>
                    {restartMsg && <p className="text-xs text-slate-600 max-w-xl">{restartMsg}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Réservé aux super-administrateurs : journalisation d’une demande de relance.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'redis' && hub && (
          <Card className="border border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-base">Jetons router (<code className="text-sm">router:tokens</code>)</CardTitle>
              <CardDescription>
                Routes et destinations lues depuis Redis. Pour ajouter ou modifier une route, éditez le déclencheur du flux
                dans Planifier puis enregistrez — la synchro met à jour ces clés.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {'error' in hub.redisRouter ? (
                <p className="text-sm text-red-600">{hub.redisRouter.error}</p>
              ) : hub.redisRouter.entries.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun jeton enregistré dans Redis.</p>
              ) : (
                <table className="w-full text-sm text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="py-2 pr-3">Jeton</th>
                      <th className="py-2 pr-3">Flux</th>
                      <th className="py-2 pr-3">Actif</th>
                      <th className="py-2 pr-3">Stream</th>
                      <th className="py-2 pr-3">Auth</th>
                      <th className="py-2">Routes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hub.redisRouter.entries.map((row) => (
                      <tr key={row.token} className="border-b border-slate-100 align-top">
                        <td className="py-2 pr-3 font-mono text-xs break-all max-w-[12rem]">{row.token}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{row.flowId ?? '—'}</td>
                        <td className="py-2 pr-3">{row.enabled ? 'oui' : 'non'}</td>
                        <td className="py-2 pr-3 text-xs">{row.stream ?? '—'}</td>
                        <td className="py-2 pr-3 text-xs">
                          {row.authType ?? '—'}
                          {row.authConfigured ? ' (secret configuré)' : ''}
                        </td>
                        <td className="py-2">
                          {row.routes.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <ul className="space-y-1 text-xs">
                              {row.routes.map((r) => (
                                <li key={r.redisKey} className="break-all">
                                  <code className="bg-slate-100 px-1 rounded">{r.redisKey}</code>
                                  {r.destinationUrl ? (
                                    <span className="block text-slate-600 mt-0.5 break-all">{r.destinationUrl}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {tab === 'agents' && (
          <div className="space-y-4">
            {!canManageAgents ? (
              <p className="text-sm text-slate-600">La liste et la création de jetons agents sont réservées aux administrateurs.</p>
            ) : (
              <>
                <Card className="border border-slate-200/80 bg-white/95">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-primary-500" />
                      Nouveau jeton agent
                    </CardTitle>
                    <CardDescription>Nom affiché et chemins surveillés (séparés par des virgules ou retours à la ligne).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 max-w-lg">
                    <Input placeholder="Nom (ex. PC compta siège)" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} />
                    <textarea
                      className="w-full min-h-[88px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder={'C:\\\\Exports\\\\EDI\n/mnt/flux/in'}
                      value={newAgentPaths}
                      onChange={(e) => setNewAgentPaths(e.target.value)}
                    />
                    <Button type="button" onClick={() => void handleCreateAgent()}>
                      Créer le jeton
                    </Button>
                    {createdToken && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs break-all">
                        <p className="font-semibold text-amber-900 mb-1">Copiez ce jeton une seule fois :</p>
                        <code>{createdToken}</code>
                        <Button type="button" variant="ghost" className="mt-2 h-8 text-xs" onClick={() => setCreatedToken(null)}>
                          Masquer
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border border-slate-200/80 bg-white/95">
                  <CardHeader>
                    <CardTitle className="text-base">Jetons créés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!agents || agents.length === 0 ? (
                      <p className="text-sm text-slate-500">{agents ? 'Aucun agent enregistré.' : 'Chargement…'}</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {agents.map((a) => (
                          <li key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <div>
                              <span className="font-medium text-slate-800">{a.name}</span>
                              <span className={`ml-2 text-xs ${a.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {a.isActive ? 'actif' : 'révoqué'}
                              </span>
                              {a.lastSeenAt && (
                                <span className="block text-xs text-slate-500">Vu : {new Date(a.lastSeenAt).toLocaleString()}</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 text-xs"
                                disabled={!a.isActive}
                                onClick={() =>
                                  void (async () => {
                                    try {
                                      await agentsApi.revoke(a.id);
                                      await loadAgents();
                                      toast.success('Révoqué');
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : 'Échec');
                                    }
                                  })()
                                }
                              >
                                Révoquer
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() =>
                                  void (async () => {
                                    try {
                                      await agentsApi.remove(a.id);
                                      await loadAgents();
                                      toast.success('Supprimé');
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : 'Échec');
                                    }
                                  })()
                                }
                              >
                                Supprimer
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {tab === 'queues' && hub && (
          <Card className="border border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-primary-500" />
                Jobs récents (BullMQ)
              </CardTitle>
              <CardDescription>Aperçu des jobs sur la queue des exécutions de flux.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {hub.queueJobs.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun job récent ou queue indisponible.</p>
              ) : (
                <table className="w-full text-sm text-left min-w-[520px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs">
                      <th className="py-2 pr-2">Id</th>
                      <th className="py-2 pr-2">État</th>
                      <th className="py-2 pr-2">Progression</th>
                      <th className="py-2 pr-2">Horodatage</th>
                      <th className="py-2">Erreur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hub.queueJobs.map((j) => (
                      <tr key={j.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 font-mono text-xs">{j.id}</td>
                        <td className="py-2 pr-2">{j.state}</td>
                        <td className="py-2 pr-2">{j.progress}%</td>
                        <td className="py-2 pr-2 text-xs">{new Date(j.timestamp).toLocaleString()}</td>
                        <td className="py-2 text-xs text-red-600 max-w-xs truncate" title={j.failedReason}>
                          {j.failedReason ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {tab === 'history' && rt && (
          <Card className="border border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle className="text-base">Heartbeats Benthos (Redis)</CardTitle>
              <CardDescription>Dernières entrées écrites par Benthos dans la liste Redis configurée.</CardDescription>
            </CardHeader>
            <CardContent>
              {rt.benthosEvents.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun événement récent.</p>
              ) : (
                <ul className="space-y-2 max-h-[480px] overflow-y-auto text-xs font-mono">
                  {rt.benthosEvents.map((ev) => (
                    <li key={ev.index} className="border border-slate-100 rounded-lg p-2 bg-slate-50/80 break-all">
                      {ev.payload ? (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(ev.payload, null, 2)}</pre>
                      ) : (
                        ev.raw
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {!hub && !loading && <p className="text-sm text-red-600">Impossible de charger le hub.</p>}
      </div>
    </div>
  );
}
