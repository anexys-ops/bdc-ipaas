import { apiClient } from './client';
import type { Mapping, CreateMappingDto, MappingRule } from '../types';

export type WriteMode = 'CREATE' | 'UPDATE' | 'UPSERT' | 'SKIP';

export interface UpdateMappingDto {
  name?: string;
  description?: string;
  sourceSchema?: Record<string, unknown>;
  destinationSchema?: Record<string, unknown>;
  rules?: MappingRule[];
  writeMode?: WriteMode;
  matchField?: string;
  filterConfig?: Record<string, unknown>;
  dryRunPassed?: boolean;
  isProduction?: boolean;
  sourceConnectorId?: string;
  sourceOperationId?: string;
  destinationConnectorId?: string;
  destinationOperationId?: string;
}

export interface PreviewMappingDto {
  rules: MappingRule[];
  sampleData: Record<string, unknown>[];
  lookupTables?: Array<{ name: string; data: Record<string, Record<string, unknown>> }>;
}

export interface AutoMapDto {
  sourceSchema: Record<string, unknown>;
  destinationSchema: Record<string, unknown>;
}

export interface PreviewResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  index: number;
}

export interface PreviewResponse {
  results: PreviewResult[];
  stats: { total: number; success: number; failed: number };
}

export interface DryRunResponse {
  passed: boolean;
  results: PreviewResult[];
  stats: { total: number; success: number; failed: number };
}

export interface LookupTable {
  id: string;
  name: string;
  data: Record<string, Record<string, unknown>>;
}

export const mappingsApi = {
  getAll: () => apiClient.get<Mapping[]>('/mappings'),
  getOne: (id: string) => apiClient.get<Mapping>(`/mappings/${id}`),
  create: (data: CreateMappingDto) => apiClient.post<Mapping>('/mappings', data),
  update: (id: string, data: UpdateMappingDto) => apiClient.patch<Mapping>(`/mappings/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/mappings/${id}`),
  duplicate: (id: string) => apiClient.post<Mapping>(`/mappings/${id}/duplicate`, {}),

  /** Auto-mapping : retourne les règles pour les champs de même nom */
  autoMap: (data: AutoMapDto) =>
    apiClient.post<MappingRule[]>('/mappings/auto-map', data),

  preview: (data: PreviewMappingDto) =>
    apiClient.post<PreviewResponse>('/mappings/preview', data),

  validateRules: (rules: MappingRule[]) =>
    apiClient.post<{ valid: boolean; errors: string[] }>('/mappings/validate', { rules }),

  flattenSchema: (schema: Record<string, unknown>) =>
    apiClient.post<{ fields: string[] }>('/mappings/schema/flatten', { schema }),

  /** Dry-run sur données de test */
  dryRun: (id: string, sampleData: Record<string, unknown>[]) =>
    apiClient.post<DryRunResponse>(`/mappings/${id}/dry-run`, { sampleData }),

  /** Mise en production (nécessite dryRunPassed=true) */
  promote: (id: string) =>
    apiClient.post<Mapping>(`/mappings/${id}/promote`, {}),

  getLookupTables: (id: string) =>
    apiClient.get<LookupTable[]>(`/mappings/${id}/lookup-tables`),

  addLookupTable: (id: string, data: { name: string; data: Record<string, Record<string, unknown>> }) =>
    apiClient.post<{ id: string; name: string }>(`/mappings/${id}/lookup-tables`, data),

  updateLookupTable: (mappingId: string, tableId: string, data: { name: string; data: Record<string, Record<string, unknown>> }) =>
    apiClient.patch<void>(`/mappings/${mappingId}/lookup-tables/${tableId}`, data),

  deleteLookupTable: (mappingId: string, tableId: string) =>
    apiClient.delete<void>(`/mappings/${mappingId}/lookup-tables/${tableId}`),
};
