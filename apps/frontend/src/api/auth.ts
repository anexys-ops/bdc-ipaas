import { apiClient } from './client';
import type { AuthResponse } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }, { skipAuth: true }),

  refresh: () => apiClient.post<{ accessToken: string }>('/auth/refresh', undefined, { skipAuth: true }),

  logout: () => apiClient.post<void>('/auth/logout'),
};
