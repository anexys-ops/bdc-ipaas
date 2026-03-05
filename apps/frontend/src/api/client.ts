import { useAuthStore } from '../stores/auth.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(skipAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth) {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(skipAuth),
        ...fetchOptions.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.getState().logout();
      }

      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_URL);
