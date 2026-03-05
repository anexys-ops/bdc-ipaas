import { apiClient } from './client';
import type { MarketplaceConnector, MarketplaceCategory, MarketplaceConnectorDetail } from '../types';

export const marketplaceApi = {
  getAll: () => apiClient.get<MarketplaceConnector[]>('/marketplace', { skipAuth: true }),

  getByCategories: () => apiClient.get<MarketplaceCategory[]>('/marketplace/categories', { skipAuth: true }),

  getDetail: (type: string) =>
    apiClient.get<MarketplaceConnectorDetail>(`/marketplace/${type}`, { skipAuth: true }),

  getOperationSchema: (type: string, operationId: string) =>
    apiClient.get<{ input?: unknown; output?: unknown; config?: unknown }>(
      `/marketplace/${type}/operations/${operationId}/schema`,
      { skipAuth: true },
    ),
};
