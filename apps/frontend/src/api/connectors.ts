import { apiClient } from './client';
import type { ConfiguredConnector } from '../types';

export interface CreateConnectorDto {
  type: string;
  name: string;
  config: Record<string, unknown>;
}

export interface UpdateConnectorDto {
  name?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export interface TestResult {
  success: boolean;
  message: string;
  durationMs: number;
  details?: Record<string, unknown>;
}

export const connectorsApi = {
  getAll: () => apiClient.get<ConfiguredConnector[]>('/connectors'),

  getOne: (id: string) => apiClient.get<ConfiguredConnector>(`/connectors/${id}`),

  create: (data: CreateConnectorDto) => apiClient.post<ConfiguredConnector>('/connectors', data),

  update: (id: string, data: UpdateConnectorDto) =>
    apiClient.patch<ConfiguredConnector>(`/connectors/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/connectors/${id}`),

  test: (id: string) => apiClient.post<TestResult>(`/connectors/${id}/test`),
};
