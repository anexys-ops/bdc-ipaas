import { apiClient } from './client';
import type { CreateTenantUserDto } from './tenants';

export type { CreateTenantUserDto };
export type TenantUserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: TenantUserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface UpdateTenantUserDto {
  firstName?: string;
  lastName?: string;
  role?: TenantUserRole;
  isActive?: boolean;
}

export const usersApi = {
  getList(): Promise<TenantUser[]> {
    return apiClient.get<TenantUser[]>('/users');
  },

  getOne(id: string): Promise<TenantUser> {
    return apiClient.get<TenantUser>(`/users/${id}`);
  },

  create(data: CreateTenantUserDto): Promise<TenantUser> {
    return apiClient.post<TenantUser>('/users', data);
  },

  update(id: string, data: UpdateTenantUserDto): Promise<TenantUser> {
    return apiClient.patch<TenantUser>(`/users/${id}`, data);
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`/users/${id}`);
  },
};
