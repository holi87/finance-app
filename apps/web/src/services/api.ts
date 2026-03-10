import type { LoginRequest, LoginResponse, RefreshResponse, ApiError } from '@budget-tracker/shared-types';

const TOKEN_KEY = 'bt_access_token';
const REFRESH_KEY = 'bt_refresh_token';

// --- Token storage ---

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// --- Refresh logic ---

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = (await response.json()) as RefreshResponse;
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

// --- API client ---

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, skipAuth = false } = options;

  // Build URL with query params
  let url = path;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (response.status === 401 && !skipAuth) {
    // Deduplicate concurrent refresh requests
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      // Refresh failed - redirect to login
      window.location.href = '/login';
      throw new ApiClientError(401, 'UNAUTHORIZED', 'Session expired');
    }
  }

  if (!response.ok) {
    let errorData: ApiError | undefined;
    try {
      errorData = (await response.json()) as ApiError;
    } catch {
      // Response is not JSON
    }

    throw new ApiClientError(
      response.status,
      errorData?.error?.code ?? 'UNKNOWN_ERROR',
      errorData?.error?.message ?? `Request failed with status ${response.status}`,
      errorData?.error?.details,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// --- Public API methods ---

export const api = {
  // Auth
  login(data: LoginRequest): Promise<LoginResponse> {
    return request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: data,
      skipAuth: true,
    });
  },

  logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    return request<void>('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    });
  },

  // Generic CRUD helpers
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return request<T>(path, { params });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
