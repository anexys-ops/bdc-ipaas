import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { BackofficePageContainer, BackofficePageHeader } from '../../components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../../components/ui';
import { flowsApi } from '../../api/flows';
import { engineApi } from '../../api/engine';
import type { Flow } from '../../types';
import { Loader2, Play, FlaskConical, FileInput, FileOutput, Activity, FileText, ExternalLink, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

function asPath(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toFileUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return `file:///${path}`;
}

function lastExecutionBadge(status?: string) {
  if (!status) return 'bg-slate-100 text-slate-600';
  if (status === 'SUCCESS' || status === 'DRY_RUN_OK') return 'bg-emerald-100 text-emerald-700';
  if (status === 'PARTIAL') return 'bg-amber-100 text-amber-700';
  if (status === 'FAILED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
}

export function BackofficeFileFlowsPage() {
  const queryClient = useQueryClient();
  const { data: flows = [], isLoading, error } = useQuery({
    queryKey: ['flows'],
    queryFn: flowsApi.getAll,
  });

  const fileFlows = flows.filter((flow: Flow) => flow.triggerType === 'FILE_WATCH');

  const executionQueries = useQueries({
    queries: fileFlows.map((flow: Flow) => ({
      queryKey: ['flow-executions', flow.id],
      queryFn: () => engineApi.getFlowExecutions(flow.id, 1),
    })),
  });
  const latestExecutionByFlow = useMemo(
    () =>
      Object.fromEntries(
        fileFlows.map((flow: Flow, index) => [flow.id, executionQueries[index]?.data?.[0] ?? null]),
      ) as Record<string, { executionId: string; status: string } | null>,
    [executionQueries, fileFlows],
  );

  const latestExecutionLogsQueries = useQueries({
    queries: fileFlows.map((flow: Flow) => {
      const last = latestExecutionByFlow[flow.id];
      return {
        queryKey: ['execution-logs', last?.executionId],
        queryFn: () => engineApi.getExecutionLogs(last!.executionId),
        enabled: !!last?.executionId,
      };
    }),
  });

  const executeMutation = useMutation({
    mutationFn: ({ flowId, dryRun }: { flowId: string; dryRun: boolean }) =>
      engineApi.executeFlow(flowId, dryRun),
    onSuccess: (_, vars) => {
      toast.success(vars.dryRun ? 'Dry-run lancé' : 'Exécution lancée');
      queryClient.invalidateQueries({ queryKey: ['flow-executions', vars.flowId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const replayMutation = useMutation({
    mutationFn: ({ executionId, flowId: _flowId, dryRun }: { executionId: string; flowId: string; dryRun: boolean }) =>
      engineApi.replayExecution(executionId, dryRun),
    onSuccess: (_, vars) => {
      toast.success(vars.dryRun ? 'Replay (dry-run) lancé' : 'Replay lancé');
      queryClient.invalidateQueries({ queryKey: ['flow-executions', vars.flowId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <BackofficePageContainer>
      <BackofficePageHeader
        title="Back-office flux fichier"
        description="Pilotage des flux FILE_WATCH: réception fichier, mapping, dépôt de sortie et exécution."
      />

      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Crée et supervise les flux orientés fichier pour les opérations Benthos-ready.
        </p>
        <Link to="/backoffice/planifier/new">
          <Button>Créer un flux fichier</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <Card className="border-red-200">
          <CardContent className="py-6 text-red-600 text-sm">Erreur lors du chargement des flux.</CardContent>
        </Card>
      ) : fileFlows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucun flux fichier</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Aucun flow `FILE_WATCH` détecté. Crée une planification en mode fichier.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {fileFlows.map((flow: Flow, index) => {
            const cfg = flow.triggerConfig ?? {};
            const inputPath = asPath(cfg.inputPath);
            const outputPath = asPath(cfg.outputPath);
            const last = executionQueries[index]?.data?.[0];
            const logs = latestExecutionLogsQueries[index]?.data ?? [];
            const latestOutputLog = [...logs]
              .reverse()
              .find((entry) => typeof entry?.data?.outputPath === 'string' || entry.message.startsWith('Fichier de sortie généré:'));
            const outputFromData =
              typeof latestOutputLog?.data?.outputPath === 'string' ? latestOutputLog.data.outputPath : '';
            const outputFromMessage = latestOutputLog?.message.replace('Fichier de sortie généré: ', '') ?? '';
            const latestOutputPath = outputFromData || outputFromMessage;
            return (
              <li key={flow.id}>
                <Card className="border-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{flow.name}</CardTitle>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${lastExecutionBadge(last?.status)}`}>
                        {last?.status ?? 'Aucune exécution'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-700">
                        <FileInput className="w-4 h-4 text-emerald-600" />
                        <span>Entrée: {inputPath || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <FileOutput className="w-4 h-4 text-primary-600" />
                        <span>Sortie: {outputPath || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Activity className="w-4 h-4 text-violet-600" />
                        <span>Dernière exécution: {last?.executionId ?? '-'}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => executeMutation.mutate({ flowId: flow.id, dryRun: true })}
                        disabled={executeMutation.isPending}
                      >
                        <FlaskConical className="w-4 h-4 mr-1" />
                        Dry-run
                      </Button>
                      <Button
                        onClick={() => executeMutation.mutate({ flowId: flow.id, dryRun: false })}
                        disabled={executeMutation.isPending}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Exécuter
                      </Button>
                      <Button
                        variant="outline"
                        title="Rejoue le même flux après correction (nouvelle exécution)"
                        disabled={
                          !last?.executionId ||
                          last.status === 'PENDING' ||
                          last.status === 'RUNNING' ||
                          replayMutation.isPending
                        }
                        onClick={() =>
                          last?.executionId &&
                          replayMutation.mutate({
                            executionId: last.executionId,
                            flowId: flow.id,
                            dryRun: false,
                          })
                        }
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Replay
                      </Button>
                      <Button
                        variant="outline"
                        disabled={
                          !last?.executionId ||
                          last.status === 'PENDING' ||
                          last.status === 'RUNNING' ||
                          replayMutation.isPending
                        }
                        onClick={() =>
                          last?.executionId &&
                          replayMutation.mutate({
                            executionId: last.executionId,
                            flowId: flow.id,
                            dryRun: true,
                          })
                        }
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Replay dry-run
                      </Button>
                      <Link to={`/backoffice/planifier/${flow.id}/edit`}>
                        <Button variant="outline">Configurer</Button>
                      </Link>
                      <Button
                        variant="outline"
                        disabled={!latestOutputPath}
                        onClick={() => {
                          if (!latestOutputPath) return;
                          window.open(toFileUrl(latestOutputPath), '_blank', 'noopener,noreferrer');
                        }}
                        title={latestOutputPath || 'Aucun fichier de sortie détecté'}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Ouvrir dernier fichier
                      </Button>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Logs récents</p>
                      {logs.length === 0 ? (
                        <p className="text-xs text-slate-500">Aucun log disponible pour la dernière exécution.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {logs.slice(-5).map((log, i) => (
                            <li key={`${flow.id}-log-${i}`} className="text-xs text-slate-700 flex items-start gap-2">
                              <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <span>
                                <strong className="mr-1">{log.level}</strong>
                                {log.message}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </BackofficePageContainer>
  );
}
