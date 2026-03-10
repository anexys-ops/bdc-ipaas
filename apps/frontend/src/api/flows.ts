import { apiClient } from './client';
import type { Flow } from '../types';

export type TriggerType = 'CRON' | 'WEBHOOK' | 'MANUAL' | 'FILE_WATCH' | 'AGENT_WATCH';

export interface CreateFlowDto {
  name: string;
  description?: string;
  sourceConnectorId: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
}

export interface UpdateFlowDto {
  name?: string;
  description?: string;
  triggerType?: TriggerType;
  triggerConfig?: Record<string, unknown>;
  environment?: 'STAGING' | 'PRODUCTION';
  isActive?: boolean;
}

export interface AddDestinationDto {
  connectorId: string;
  orderIndex?: number;
  mappingId?: string;
  writeMode?: 'CREATE' | 'UPDATE';
  searchFields?: string[];
}

export const flowsApi = {
  getAll: () => apiClient.get<Flow[]>('/flows'),
  getOne: (id: string) => apiClient.get<Flow>(`/flows/${id}`),
  create: (data: CreateFlowDto) => apiClient.post<Flow>('/flows', data),
  update: (id: string, data: UpdateFlowDto) => apiClient.patch<Flow>(`/flows/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/flows/${id}`),
  addDestination: (flowId: string, data: AddDestinationDto) =>
    apiClient.post<Flow>(`/flows/${flowId}/destinations`, data),
  removeDestination: (flowId: string, destinationId: string) =>
    apiClient.delete<Flow>(`/flows/${flowId}/destinations/${destinationId}`),
  activate: (flowId: string) => apiClient.post<Flow>(`/flows/${flowId}/activate`, undefined),
  deactivate: (flowId: string) => apiClient.post<Flow>(`/flows/${flowId}/deactivate`, undefined),
};
