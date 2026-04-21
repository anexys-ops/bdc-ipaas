import { apiClient } from './client';

export interface AgentRow {
  id: string;
  name: string;
  isActive: boolean;
  lastSeenAt: string | null;
}

export interface CreateAgentResponse {
  id: string;
  token: string;
}

export const agentsApi = {
  list: () => apiClient.get<AgentRow[]>('/agents'),

  create: (name: string, watchPaths: string[]) =>
    apiClient.post<CreateAgentResponse>('/agents', { name, watchPaths }),

  revoke: (id: string) => apiClient.post<void>(`/agents/${id}/revoke`, undefined),

  remove: (id: string) => apiClient.delete<void>(`/agents/${id}`),
};
