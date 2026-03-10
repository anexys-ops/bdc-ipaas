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

export interface OperationPreviewResult {
  count: number;
  items: Record<string, unknown>[];
}

export const connectorsApi = {
  getAll: () => apiClient.get<ConfiguredConnector[]>('/connectors'),

  getOne: (id: string) => apiClient.get<ConfiguredConnector>(`/connectors/${id}`),

  /** Récupérer la configuration (URL, accès, token) pour édition */
  getConfig: (id: string) =>
    apiClient.get<{ config: Record<string, unknown> }>(`/connectors/${id}/config`),

  create: (data: CreateConnectorDto) => apiClient.post<ConfiguredConnector>('/connectors', data),

  update: (id: string, data: UpdateConnectorDto) =>
    apiClient.patch<ConfiguredConnector>(`/connectors/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/connectors/${id}`),

  test: (id: string) => apiClient.post<TestResult>(`/connectors/${id}/test`),

  /** Tester une configuration avant enregistrement (type = id du connecteur marketplace) */
  testConfig: (type: string, config: Record<string, unknown>) =>
    apiClient.post<TestResult>(`/connectors/test-config?type=${encodeURIComponent(type)}`, {
      config,
    }),

  operationPreview: (connectorId: string, operationId: string, limit?: number) => {
    const qs = limit != null ? `?limit=${limit}` : '';
    return apiClient.get<OperationPreviewResult>(
      `/connectors/${connectorId}/operations/${operationId}/preview${qs}`,
    );
  },
};
