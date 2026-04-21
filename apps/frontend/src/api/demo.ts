import { apiClient } from './client';

export interface RequestDemoPayload {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  message?: string;
}

export interface RequestQuotePayload {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
  connectors: number;
  executionsPerMonth: number;
  mappings: number;
  clientEstimatedMonthlyHt: number;
}

export const demoApi = {
  requestDemo: (data: RequestDemoPayload) =>
    apiClient.post<{ ok: boolean }>('/demo/request', data, { skipAuth: true }),

  requestQuote: (data: RequestQuotePayload) =>
    apiClient.post<{ ok: boolean }>('/demo/quote-request', data, { skipAuth: true }),
};
