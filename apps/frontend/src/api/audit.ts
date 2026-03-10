import { apiClient } from './client';
import type { AuditLogEntry, AuditLogsResponse } from '../types';

export interface GetLogsParams {
  action?: string;
  resource?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  getLogs(params?: GetLogsParams): Promise<AuditLogsResponse> {
    const search = new URLSearchParams();
    if (params?.action) search.set('action', params.action);
    if (params?.resource) search.set('resource', params.resource);
    if (params?.userId) search.set('userId', params.userId);
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const qs = search.toString();
    return apiClient.get<AuditLogsResponse>(`/audit/logs${qs ? `?${qs}` : ''}`);
  },

  getRecent(limit = 20): Promise<AuditLogEntry[]> {
    return apiClient.get<AuditLogEntry[]>(`/audit/recent?limit=${limit}`);
  },

  getUserActivity(userId: string): Promise<AuditLogEntry[]> {
    return apiClient.get<AuditLogEntry[]>(`/audit/user/${userId}`);
  },
};
