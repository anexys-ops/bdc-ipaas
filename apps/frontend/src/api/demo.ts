import { apiClient } from './client';

export interface RequestDemoPayload {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  message?: string;
}

export const demoApi = {
  requestDemo: (data: RequestDemoPayload) =>
    apiClient.post<{ ok: boolean }>('/demo/request', data, { skipAuth: true }),
};
