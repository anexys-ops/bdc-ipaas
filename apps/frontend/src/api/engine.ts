import { apiClient } from './client';
import type { FlowExecution } from '../types';

export interface ExecutionResult {
  executionId: string;
  status: string;
  recordsIn?: number;
  recordsOut?: number;
  recordsFailed?: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string | null;
}

export interface ExecutionLogEntry {
  level: string;
  message: string;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface GateStreamStats {
  ingressGlobal: number;
  ingressToyo: number;
  dlqFlow: number;
  dlqNoRoute: number;
  error?: string;
}

export interface GateStreamMessage {
  id: string;
  messageId: string;
  clientId: string;
  token: string;
  route: string;
  receivedAt: string;
  bodyPreview: string;
  valid: string;
  authType: string;
  stream: string;
}

export interface PipelineInfraStatus {
  redis: { ok: boolean; latencyMs?: number; error?: string };
  benthos: { ok: boolean; httpUrl: string; error?: string };
  /** @deprecated */
  benthosHeartbeat: { redisKey: string; listLength: number | null; error?: string };
  gateStreams: GateStreamStats;
}

export interface FlowsRuntimeStatus extends PipelineInfraStatus {
  queues: {
    flowExecutions: { active: number; waiting: number; failed: number; completed: number } | null;
  };
  /** @deprecated — vide, utiliser gateMessages */
  benthosEvents: Array<{
    index: number;
    raw: string;
    payload: Record<string, unknown> | null;
  }>;
  gateMessages: GateStreamMessage[];
}

export interface PipelineHubSanitizedConfig {
  nodeEnv: string;
  uptimeSec: number;
  benthosHttpUrl: string;
  redisUrlMasked: string;
  heartbeatKey: string;
  processRole: 'api';
  workerContainerHint: string;
}

export type RedisRouterOverview =
  | {
      entries: Array<{
        token: string;
        flowId: string | null;
        enabled: boolean;
        clientId: string | null;
        stream: string | null;
        authType: string | null;
        authConfigured: boolean;
        routeCount: number;
        routes: Array<{ redisKey: string; destinationUrl: string | null }>;
      }>;
    }
  | { error: string };

export interface FlowQueueJobPreview {
  id: string;
  name: string;
  state: string;
  progress: number;
  timestamp: number;
  failedReason?: string;
}

export interface PipelineHubOverview {
  runtime: FlowsRuntimeStatus;
  config: PipelineHubSanitizedConfig;
  redisRouter: RedisRouterOverview;
  queueJobs: FlowQueueJobPreview[];
}

export interface PlatformHealthResponse {
  checkedAt: string;
  api: { ok: true };
  database: { ok: boolean; latencyMs?: number; error?: string };
  redis: { ok: boolean; latencyMs?: number; error?: string };
  benthos: { ok: boolean; error?: string };
  benthosHeartbeat: { listLength: number | null; error?: string };
  workerQueue: {
    ok: boolean;
    error?: string;
    counts?: { active: number; waiting: number; failed: number; completed: number };
  };
}

export const engineApi = {
  getFlowExecutions: (flowId: string, limit?: number) => {
    const qs = limit != null ? `?limit=${limit}` : '';
    return apiClient.get<FlowExecution[]>(`/flows/${flowId}/executions${qs}`);
  },

  getExecutionStatus: (executionId: string) =>
    apiClient.get<ExecutionResult>(`/executions/${executionId}`),

  getExecutionLogs: (executionId: string) =>
    apiClient.get<ExecutionLogEntry[]>(`/executions/${executionId}/logs`),

  executeFlow: (flowId: string, dryRun?: boolean) => {
    const qs = dryRun ? '?dryRun=true' : '';
    return apiClient.post<ExecutionResult>(`/flows/${flowId}/execute${qs}`, undefined);
  },

  replayExecution: (executionId: string, dryRun?: boolean) => {
    const qs = dryRun ? '?dryRun=true' : '';
    return apiClient.post<ExecutionResult>(`/executions/${executionId}/replay${qs}`, undefined);
  },

  getPipelineInfra: () => apiClient.get<PipelineInfraStatus>('/engine/pipeline-infra'),

  getFlowsRuntime: () => apiClient.get<FlowsRuntimeStatus>('/engine/flows-runtime'),

  getPipelineHub: () => apiClient.get<PipelineHubOverview>('/engine/pipeline-hub'),

  postPipelineRestartHint: () =>
    apiClient.post<{ ok: boolean; message: string }>('/engine/pipeline-hub/restart-hint', undefined),

  getPlatformHealth: () => apiClient.get<PlatformHealthResponse>('/engine/platform-health'),
};
