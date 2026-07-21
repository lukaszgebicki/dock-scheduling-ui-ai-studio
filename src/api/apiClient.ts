import { ApiError } from './ApiError';

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => string | null;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  requireAuth?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private getAccessToken: () => string | null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '/api/v1';
    this.fetchImpl = options.fetchImpl || fetch.bind(window);
    this.getAccessToken = options.getAccessToken || (() => null);
  }

  public async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public async post<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST' });
  }

  private async request<T>(path: string, options: ApiRequestOptions): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { body, requireAuth, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers);

    headers.set('Accept', 'application/json');

    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    if (requireAuth && !headers.has('Authorization')) {
      const token = this.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (path === '/auth/refresh' || path === '/auth/logout') {
      headers.set('X-CSRF-Intent', '1');
      fetchOptions.credentials = 'include';
    } else if (this.isAuthRoute(path)) {
      fetchOptions.credentials = 'include';
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers,
    };

    if (body !== undefined) {
      config.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, config);
    } catch {
      throw new ApiError({
        status: 0,
        errorCode: 'NETWORK_ERROR',
        message: 'Unable to connect to the service.',
      });
    }

    const text = await response.text().catch(() => '');

    if (response.status === 204 || (response.status === 202 && !text)) {
      return undefined as T;
    }

    if (response.ok && !text) {
      return undefined as T;
    }

    let responseData: unknown = null;
    if (text) {
      try {
        responseData = JSON.parse(text);
      } catch {
        // Not a JSON
      }
    }

    if (!response.ok) {
      if (
        responseData !== null &&
        typeof responseData === 'object' &&
        'error_code' in responseData &&
        typeof (responseData as Record<string, unknown>).error_code === 'string'
      ) {
        const errorData = responseData as Record<string, unknown>;
        throw new ApiError({
          status: response.status,
          errorCode: errorData.error_code as string,
          message: (errorData.message as string) || 'The request could not be completed.',
          details: errorData.details || null,
          correlationId: (errorData.correlation_id as string) || null,
        });
      }

      throw new ApiError({
        status: response.status,
        errorCode: 'HTTP_ERROR',
        message: 'The request could not be completed.',
      });
    }

    return responseData as T;
  }

  private isAuthRoute(path: string): boolean {
    return path.startsWith('/auth/');
  }
}
