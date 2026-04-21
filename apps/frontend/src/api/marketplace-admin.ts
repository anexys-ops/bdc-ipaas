import { apiClient } from './client';

export interface MarketplaceItemResponse {
  id: string;
  connectorId: string;
  stars: number;
  priceLabel: string;
  description: string | null;
  apiJsonPath: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceConnectorAdmin {
  id: string;
  name: string;
  version: string;
  icon: string;
  category: string;
  authType: string;
  docsUrl?: string | null;
  sourceOperationsCount: number;
  destinationOperationsCount: number;
  stars?: number;
  priceLabel?: string;
  description?: string | null;
  apiJsonPath?: string | null;
  enabled?: boolean;
}

export interface CreateMarketplaceItemDto {
  connectorId: string;
  stars?: number;
  priceLabel?: string;
  description?: string;
  apiJsonPath?: string;
  enabled?: boolean;
}

export interface UpdateMarketplaceItemDto {
  stars?: number;
  priceLabel?: string;
  description?: string;
  apiJsonPath?: string;
  enabled?: boolean;
}

export const marketplaceAdminApi = {
  getConnectors: () =>
    apiClient.get<MarketplaceConnectorAdmin[]>('/marketplace/admin/connectors'),

  getOpenApi: (connectorId: string) =>
    apiClient.get<Record<string, unknown>>(`/marketplace/admin/connectors/${encodeURIComponent(connectorId)}/openapi`),

  putOpenApi: (connectorId: string, content: Record<string, unknown>) =>
    apiClient.put<{ ok: boolean }>(`/marketplace/admin/connectors/${encodeURIComponent(connectorId)}/openapi`, content),

  getAll: () => apiClient.get<MarketplaceItemResponse[]>('/marketplace/admin/items'),

  create: (dto: CreateMarketplaceItemDto) =>
    apiClient.post<MarketplaceItemResponse>('/marketplace/admin/items', dto),

  update: (connectorId: string, dto: UpdateMarketplaceItemDto) =>
    apiClient.put<MarketplaceItemResponse>(`/marketplace/admin/items/${encodeURIComponent(connectorId)}`, dto),

  delete: (connectorId: string) =>
    apiClient.delete(`/marketplace/admin/items/${encodeURIComponent(connectorId)}`),
};
