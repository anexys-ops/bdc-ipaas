import { apiClient } from './client';

export interface GroupPermission {
  id: string;
  resource: string;
  action: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  permissions: GroupPermission[];
  usersCount: number;
  createdAt: string;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export const groupsApi = {
  getList(): Promise<Group[]> {
    return apiClient.get<Group[]>('/groups');
  },

  getOne(id: string): Promise<Group> {
    return apiClient.get<Group>(`/groups/${id}`);
  },

  create(data: CreateGroupDto): Promise<Group> {
    return apiClient.post<Group>('/groups', data);
  },

  update(id: string, data: UpdateGroupDto): Promise<Group> {
    return apiClient.patch<Group>(`/groups/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/groups/${id}`);
  },
};
