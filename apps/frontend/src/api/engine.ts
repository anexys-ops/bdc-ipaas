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
};
