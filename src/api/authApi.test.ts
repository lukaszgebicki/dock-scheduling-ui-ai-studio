import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import { AuthApi } from './authApi';
import { ApiClient, ApiRequestOptions } from './apiClient';

describe('AuthApi', () => {
  let apiClient: ApiClient;
  let authApi: AuthApi;
  let mockPost: MockInstance<(path: string, options?: ApiRequestOptions) => Promise<unknown>>;

  beforeEach(() => {
    apiClient = new ApiClient();
    mockPost = vi.spyOn(apiClient, 'post');
    authApi = new AuthApi(apiClient);
  });

  it('login sends correct payload and gets TokenResponse', async () => {
    mockPost.mockResolvedValue({ access_token: 'token', token_type: 'Bearer', expires_in: 900 });
    const res = await authApi.login({ email: 'test@example.com', password: 'password' });

    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      body: { email: 'test@example.com', password: 'password' },
    });
    expect(res).toEqual({ access_token: 'token', token_type: 'Bearer', expires_in: 900 });
  });

  it('refresh sends X-CSRF-Intent and gets TokenResponse', async () => {
    mockPost.mockResolvedValue({ access_token: 'token2', token_type: 'Bearer', expires_in: 900 });
    const res = await authApi.refresh();

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
      headers: { 'X-CSRF-Intent': '1' },
    });
    expect(res).toEqual({ access_token: 'token2', token_type: 'Bearer', expires_in: 900 });
  });

  it('logout sends X-CSRF-Intent and returns void', async () => {
    mockPost.mockResolvedValue(undefined);
    const res = await authApi.logout();

    expect(mockPost).toHaveBeenCalledWith('/auth/logout', {
      headers: { 'X-CSRF-Intent': '1' },
    });
    expect(res).toBeUndefined();
  });

  it('forgotPassword sends payload and returns void', async () => {
    mockPost.mockResolvedValue(undefined);
    const res = await authApi.forgotPassword({ email: 'test@example.com' });

    expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', {
      body: { email: 'test@example.com' },
    });
    expect(res).toBeUndefined();
  });

  it('resetPassword sends payload and returns void', async () => {
    mockPost.mockResolvedValue(undefined);
    const res = await authApi.resetPassword({ token: 'abc', new_password: 'pwd' });

    expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
      body: { token: 'abc', new_password: 'pwd' },
    });
    expect(res).toBeUndefined();
  });
});
