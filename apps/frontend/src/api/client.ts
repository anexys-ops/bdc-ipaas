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

  private async refreshAccessToken(): Promise<string | null> {
    const res = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.accessToken ?? null;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    const doRequest = async (): Promise<Response> => {
      return fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers: {
          ...this.getHeaders(skipAuth),
          ...(fetchOptions.headers as HeadersInit),
        },
        credentials: 'include',
      });
    };

    let response = await doRequest();

    if (response.status === 401) {
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated && !endpoint.includes('/auth/refresh')) {
        const accessToken = await this.refreshAccessToken();
        if (accessToken) {
          useAuthStore.getState().setAccessToken(accessToken);
          response = await doRequest();
        } else {
          useAuthStore.getState().logout();
        }
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.getState().logout();
      }

      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      let message: string;
      if (typeof error?.message === 'string') {
        message = error.message;
      } else if (Array.isArray(error?.message)) {
        message = error.message.join(', ');
      } else if (error?.message != null) {
        message = String(error.message);
      } else {
        message = `Erreur ${response.status}`;
      }
      throw new Error(message || `Erreur ${response.status}`);
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

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
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
