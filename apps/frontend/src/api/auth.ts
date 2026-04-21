import { apiClient } from './client';
import type { AuthResponse } from '../types';

export interface SignupTrialPayload {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }, { skipAuth: true }),

  signupTrial: (data: SignupTrialPayload) =>
    apiClient.post<AuthResponse>('/auth/signup-trial', data, { skipAuth: true }),

  refresh: () => apiClient.post<{ accessToken: string }>('/auth/refresh', undefined, { skipAuth: true }),

  logout: () => apiClient.post<void>('/auth/logout'),

  keycloakLogin: (keycloakAccessToken: string) =>
    apiClient.post<AuthResponse>('/auth/keycloak', { keycloakAccessToken }, { skipAuth: true }),
};
