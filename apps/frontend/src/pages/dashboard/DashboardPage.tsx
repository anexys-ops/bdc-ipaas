import { useAuthStore } from '../../stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Users,
  ShieldCheck,
  Building2,
  GitBranch,
  Store,
  FileStack,
  LayoutDashboard,
  ArrowRight,
  Zap,
  Database,
  Workflow,
  Activity,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { connectorsApi } from '../../api/connectors';
import { flowsApi } from '../../api/flows';
import { engineApi } from '../../api/engine';
import type { Flow } from '../../types';

function getFlowsCount(flows: Flow[] | { total?: number; data?: Flow[]; flows?: Flow[] } | undefined): number {
  if (Array.isArray(flows)) return flows.length;
  if (flows && typeof flows === 'object') {
    if (typeof (flows as { total?: number }).total === 'number') return (flows as { total: number }).total;
    const arr = (flows as { data?: Flow[] }).data ?? (flows as { flows?: Flow[] }).flows;
    if (Array.isArray(arr)) return arr.length;
  }
  return 0;
}

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: connectors } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => connectorsApi.getAll(),
  });
  const { data: flows } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.getAll(),
  });

  const canSeePipelineInfra =
    user?.role === 'ADMIN' || user?.role === 'OPERATOR' || user?.role === 'SUPER_ADMIN';

  const { data: pipelineInfra, isLoading: pipelineInfraLoading, isError: pipelineInfraError } = useQuery({
    queryKey: ['engine', 'pipeline-infra'],
    queryFn: () => engineApi.getPipelineInfra(),
    enabled: canSeePipelineInfra,
    refetchInterval: 45_000,
    retry: 1,
  });

  const flowsCount = getFlowsCount(flows);
  const connectorsCount = Array.isArray(connectors) ? connectors.length : 0;

  return (
    <div className="flex-1 min-h-0 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Hero */}
        <div className="mb-8 sm:mb-10">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/80 text-slate-600 text-xs font-semibold uppercase tracking-wider border border-slate-300/60 mb-4">
            <LayoutDashboard className="w-3.5 h-3.5" />
            Tableau de bord
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Bienvenue, {user?.firstName ?? 'Utilisateur'}
          </h1>
          <p className="mt-1 text-slate-600 text-sm">
            Vue d’ensemble de vos flux, connecteurs et accès rapides.
          </p>
        </div>

        {/* Tuiles KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Link
            to="/planifier"
            className="group block rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-white transition-all duration-300 overflow-hidden"
          >
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <GitBranch className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-slate-800 tabular-nums">{flowsCount}</p>
                <p className="text-sm font-medium text-slate-500">Flux planifiés</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </Link>

          <Link
            to="/connectors"
            className="group block rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-white transition-all duration-300 overflow-hidden"
          >
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-sky-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-slate-800 tabular-nums">{connectorsCount}</p>
                <p className="text-sm font-medium text-slate-500">Connecteurs</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </Link>

          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/15 border border-primary-400/30 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-800 truncate">{user?.role}</p>
                <p className="text-sm font-medium text-slate-500">Votre rôle</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benthos + Redis (supervision pipeline) */}
        {canSeePipelineInfra && (
          <section className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-slate-200/60">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Workflow className="w-5 h-5 text-indigo-600" />
                Pipeline Benthos et Redis
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Moteur de streaming (Benthos) connecté à Redis : heartbeats et sondes de disponibilité.
              </p>
            </div>
            <div className="p-5">
              {pipelineInfraLoading && (
                <div className="flex items-center justify-center gap-3 py-10 text-slate-600">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                  <span className="text-sm font-medium">Chargement du statut…</span>
                </div>
              )}
              {pipelineInfraError && !pipelineInfraLoading && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  Impossible de lire l&apos;infrastructure pipeline (droits ou API indisponible).
                </p>
              )}
              {pipelineInfra && !pipelineInfraLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center">
                        <Database className="w-5 h-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Redis</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {pipelineInfra.redis.ok ? 'Joignable' : 'Indisponible'}
                        </p>
                      </div>
                    </div>
                    {pipelineInfra.redis.ok && pipelineInfra.redis.latencyMs != null && (
                      <p className="text-xs text-slate-500 tabular-nums">
                        Latence PING ~ {pipelineInfra.redis.latencyMs} ms
                      </p>
                    )}
                    {!pipelineInfra.redis.ok && pipelineInfra.redis.error && (
                      <p className="text-xs text-red-600 break-words">{pipelineInfra.redis.error}</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                        <Workflow className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Benthos</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {pipelineInfra.benthos.ok ? 'En ligne' : 'Hors ligne'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 break-all">{pipelineInfra.benthos.httpUrl}</p>
                    {!pipelineInfra.benthos.ok && pipelineInfra.benthos.error && (
                      <p className="text-xs text-red-600 mt-1">{pipelineInfra.benthos.error}</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Heartbeats</p>
                        <p className="text-sm font-semibold text-slate-800 tabular-nums">
                          {pipelineInfra.benthosHeartbeat.listLength != null
                            ? `${pipelineInfra.benthosHeartbeat.listLength} message(s) en liste`
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Clé Redis : <code className="text-slate-700">{pipelineInfra.benthosHeartbeat.redisKey}</code>
                    </p>
                    {pipelineInfra.benthosHeartbeat.error && (
                      <p className="text-xs text-red-600 mt-1">{pipelineInfra.benthosHeartbeat.error}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Démarrage rapide */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/60">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Démarrage rapide
            </h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/planifier"
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200/60 bg-white/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <GitBranch className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">
                    Planification des flux
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Cron, webhooks et déclenchements fichier
                  </p>
                </div>
              </Link>
              <Link
                to="/marketplace"
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200/60 bg-white/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-800 group-hover:text-sky-700 transition-colors">
                    Marketplace
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Explorer les connecteurs disponibles
                  </p>
                </div>
              </Link>
              <Link
                to="/connectors"
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200/60 bg-white/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-800 group-hover:text-amber-700 transition-colors">
                    Connecteurs
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Configurer et gérer vos connecteurs
                  </p>
                </div>
              </Link>
              <Link
                to="/mappings"
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200/60 bg-white/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-500/15 flex items-center justify-center shrink-0">
                  <FileStack className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-800 group-hover:text-primary-700 transition-colors">
                    Mappings
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Règles de transformation des données
                  </p>
                </div>
              </Link>
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <Link
                  to="/audit"
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-200/60 bg-white/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-800 group-hover:text-amber-700 transition-colors">
                      Logs d’audit
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Historique des actions (admins)
                    </p>
                  </div>
                </Link>
              )}
              {user?.role === 'SUPER_ADMIN' && (
                <Link
                  to="/backoffice/clients"
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-200/60 bg-white/60 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-800 group-hover:text-slate-700 transition-colors">
                      Back-office
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Clients et administration
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
