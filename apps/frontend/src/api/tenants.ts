import { apiClient } from './client';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stripeCustomerId?: string | null;
}

export interface TenantStats {
  usersCount: number;
  connectorsCount: number;
  flowsCount: number;
  executionsCount: number;
  lastLoginAt?: string | null;
}

export interface TenantWithStats extends Tenant {
  stats?: TenantStats;
}

export interface TenantConnector {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  lastTestedAt?: string | null;
  lastTestOk?: boolean | null;
  createdAt: string;
}

export interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface TenantFlow {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  environment: string;
  createdAt: string;
}

export interface TenantBillingInfo {
  plan: string;
  stripeCustomerId: string | null;
  currentPeriodUsage: {
    flowsExecuted: number;
    recordsProcessed: number;
    apiCallsMade: number;
  } | null;
}

export interface ImpersonateResult {
  token: string;
  expiresIn: string;
  tenantName: string;
}

export interface CreateTenantDto {
  slug: string;
  name: string;
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
}

export interface UpdateTenantDto {
  name?: string;
  plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  isActive?: boolean;
}

export type TenantUserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface CreateTenantUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: TenantUserRole;
}

export interface UpdateTenantUserDto {
  firstName?: string;
  lastName?: string;
  role?: TenantUserRole;
  isActive?: boolean;
}

export const tenantsApi = {
  // Listing & détail
  getAll: (withStats?: boolean) =>
    apiClient.get<TenantWithStats[]>(`/tenants${withStats ? '?withStats=true' : ''}`),
  getOne: (id: string) => apiClient.get<Tenant>(`/tenants/${id}`),
  getStats: (id: string) => apiClient.get<TenantStats>(`/tenants/${id}/stats`),
  getBillingInfo: (id: string) => apiClient.get<TenantBillingInfo>(`/tenants/${id}/billing`),

  // Création & édition
  create: (data: CreateTenantDto) => apiClient.post<Tenant>('/tenants', data),
  update: (id: string, data: UpdateTenantDto) => apiClient.patch<Tenant>(`/tenants/${id}`, data),

  // Gestion du statut
  suspend: (id: string) => apiClient.post<void>(`/tenants/${id}/suspend`, {}),
  activate: (id: string) => apiClient.post<Tenant>(`/tenants/${id}/activate`, {}),

  // Impersonation
  impersonate: (id: string) => apiClient.post<ImpersonateResult>(`/tenants/${id}/impersonate`, {}),

  // Connecteurs
  getConnectors: (id: string) => apiClient.get<TenantConnector[]>(`/tenants/${id}/connectors`),
  deleteConnector: (tenantId: string, connectorId: string) =>
    apiClient.delete(`/tenants/${tenantId}/connectors/${connectorId}`),

  // Flux
  getFlows: (id: string) => apiClient.get<TenantFlow[]>(`/tenants/${id}/flows`),

  // Utilisateurs
  getUsers: (id: string) => apiClient.get<TenantUser[]>(`/tenants/${id}/users`),
  createUser: (tenantId: string, data: CreateTenantUserDto) =>
    apiClient.post<TenantUser>(`/tenants/${tenantId}/users`, data),
  updateUser: (tenantId: string, userId: string, data: UpdateTenantUserDto) =>
    apiClient.patch<TenantUser>(`/tenants/${tenantId}/users/${userId}`, data),
  disableUser: (tenantId: string, userId: string) =>
    apiClient.delete(`/tenants/${tenantId}/users/${userId}`),

  // Compte courant
  getMyInfo: () => apiClient.get<Tenant>('/tenants/me/info'),
  getMyUsage: () => apiClient.get<TenantBillingInfo>('/tenants/me/usage'),
};
