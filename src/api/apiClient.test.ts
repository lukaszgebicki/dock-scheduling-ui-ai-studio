import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from './apiClient';
import { ApiError } from './ApiError';

describe('ApiClient', () => {
  let mockFetch: any;
  let apiClient: ApiClient;

  beforeEach(() => {
    mockFetch = vi.fn();
    apiClient = new ApiClient({
      fetchImpl: mockFetch,
    });
  });

  it('1. login: credentials include, JSON body, Content-Type, no Auth, no CSRF', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiClient.post('/auth/login', { body: { email: 'a@b.c', password: 'p' } });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, config] = mockFetch.mock.calls[0];
    const headers = config.headers as Headers;

    expect(config.credentials).toBe('include');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-CSRF-Intent')).toBeNull();
    expect(config.body).toBe(JSON.stringify({ email: 'a@b.c', password: 'p' }));
  });

  it('2. refresh: credentials include, CSRF, no Auth, no body, no Content-Type', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiClient.post('/auth/refresh');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, config] = mockFetch.mock.calls[0];
    const headers = config.headers as Headers;

    expect(config.credentials).toBe('include');
    expect(headers.get('X-CSRF-Intent')).toBe('1');
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('Content-Type')).toBeNull();
    expect(config.body).toBeUndefined();
  });

  it('3. logout: credentials include, CSRF, no Auth, no body, no Content-Type', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiClient.post('/auth/logout');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, config] = mockFetch.mock.calls[0];
    const headers = config.headers as Headers;

    expect(config.credentials).toBe('include');
    expect(headers.get('X-CSRF-Intent')).toBe('1');
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('Content-Type')).toBeNull();
    expect(config.body).toBeUndefined();
  });

  it('4. forgot-password: no Auth, no CSRF, correct JSON body', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiClient.post('/auth/forgot-password', { body: { email: 'a@b.c' } });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, config] = mockFetch.mock.calls[0];
    const headers = config.headers as Headers;

    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-CSRF-Intent')).toBeNull();
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(config.body).toBe(JSON.stringify({ email: 'a@b.c' }));
  });

  it('5. reset-password: no Auth, no CSRF, token and password in JSON', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiClient.post('/auth/reset-password', { body: { token: 't', new_password: 'p' } });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, config] = mockFetch.mock.calls[0];
    const headers = config.headers as Headers;

    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-CSRF-Intent')).toBeNull();
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(config.body).toBe(JSON.stringify({ token: 't', new_password: 'p' }));
  });

  it('6. protected request: Auth only after requireAuth:true; no empty Auth', async () => {
    const clientNoToken = new ApiClient({
      fetchImpl: mockFetch,
      getAccessToken: () => null,
    });
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    // With requireAuth but no token
    await clientNoToken.get('/protected', { requireAuth: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    let [, config] = mockFetch.mock.calls[0];
    let headers = config.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();

    // With token but no requireAuth
    const clientToken = new ApiClient({
      fetchImpl: mockFetch,
      getAccessToken: () => 'token123',
    });
    await clientToken.get('/protected');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    [, config] = mockFetch.mock.calls[1];
    headers = config.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();

    // With requireAuth and token
    await clientToken.get('/protected', { requireAuth: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
    [, config] = mockFetch.mock.calls[2];
    headers = config.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token123');
  });

  it('7. requireAuth is not passed to fetch RequestInit', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiClient.get('/test', { requireAuth: true });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, config] = mockFetch.mock.calls[0];
    expect(config).not.toHaveProperty('requireAuth');
  });

  it('8. AbortSignal is passed to fetch', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const controller = new AbortController();
    await apiClient.get('/test', { signal: controller.signal });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, config] = mockFetch.mock.calls[0];
    expect(config.signal).toBe(controller.signal);
  });

  it('9. HTTP 202 with empty body returns undefined', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 202 }));
    const result = await apiClient.post('/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it('10. HTTP 204 returns undefined', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    const result = await apiClient.post('/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it('11. HTTP 401 executes exactly one fetch', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error_code: 'UNAUTHORIZED' }), { status: 401 }));
    try {
      await apiClient.get('/protected', { requireAuth: true });
    } catch {
      // Ignored
    }

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('12. every ordinary call executes exactly one fetch', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiClient.get('/test1');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await apiClient.post('/test2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('13. ApiError is instance of Error and ApiError', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error_code: 'ERR' }), { status: 400 }));
    let error: any;
    try {
      await apiClient.post('/test');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  it('14. ApiError does not contain sensitive or excessive request data', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error_code: 'ERR' }), { status: 400 }));
    let error: any;
    try {
      await apiClient.post('/test');
    } catch (e) {
      error = e;
    }

    expect(error).not.toHaveProperty('body');
    expect(error).not.toHaveProperty('headers');
    expect(error).not.toHaveProperty('password');
    expect(error).not.toHaveProperty('token');
    expect(error).not.toHaveProperty('Authorization');
    expect(error).not.toHaveProperty('Request');
    expect(error).not.toHaveProperty('Response');
  });
});
