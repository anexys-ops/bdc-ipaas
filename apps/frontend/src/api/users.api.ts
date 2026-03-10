import { apiClient } from './client';

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

  update(id: string, data: UpdateTenantUserDto): Promise<TenantUser> {
    return apiClient.patch<TenantUser>(`/users/${id}`, data);
  },
};
