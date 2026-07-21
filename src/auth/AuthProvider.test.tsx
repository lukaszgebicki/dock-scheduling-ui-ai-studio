import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { AuthProvider, AuthApiPort } from './AuthProvider';
import { useAuth } from './useAuth';
import { ApiError } from '../api/ApiError';

const TestComponent = ({ onMount }: { onMount?: () => void }) => {
  const auth = useAuth();

  useEffect(() => {
    if (onMount) onMount();
  }, [onMount]);

  return (
    <div>
      <div data-testid="status">{auth.status}</div>
      <div data-testid="token">{auth.accessToken ?? 'null'}</div>
      <div data-testid="is-auth">{auth.isAuthenticated ? 'true' : 'false'}</div>
      <button data-testid="login-btn" onClick={() => auth.login({ email: 'test@test.com', password: 'password' }).catch(e => {
        document.getElementById('error-out')!.textContent = e.errorCode || e.message;
      })}>Login</button>
      <button data-testid="refresh-btn" onClick={() => auth.refreshSession().then(res => {
        document.getElementById('refresh-out')!.textContent = res ? 'true' : 'false';
      })}>Refresh</button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>Logout</button>
      <div id="error-out" data-testid="error-out"></div>
      <div id="refresh-out" data-testid="refresh-out"></div>
    </div>
  );
};

const renderWithProvider = (authApi: AuthApiPort, ui: React.ReactNode = <TestComponent />) => {
  return render(
    <AuthProvider authApi={authApi}>
      {ui}
    </AuthProvider>
  );
};

const createControlledPromise = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('AuthProvider', () => {
  let mockAuthApi: AuthApiPort;
  let originalConsoleError: any;

  beforeEach(() => {
    mockAuthApi = {
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    };
    // Default mock implementation to prevent unhandled rejection during mount if not specified
    (mockAuthApi.refresh as any).mockResolvedValue({ access_token: 'default-token', token_type: 'Bearer', expires_in: 3600 });

    vi.spyOn(console, 'log');
    originalConsoleError = console.error;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    console.error = originalConsoleError;
  });

  describe('Session Bootstrap', () => {
    it('calls authApi.refresh exactly once on mount', async () => {
      renderWithProvider(mockAuthApi);
      await waitFor(() => {
        expect(mockAuthApi.refresh).toHaveBeenCalledTimes(1);
      });
    });

    it('shows bootstrapping status while refresh is unresolved', () => {
      const { promise } = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValue(promise);
      renderWithProvider(mockAuthApi);

      expect(screen.getByTestId('status').textContent).toBe('bootstrapping');
      expect(screen.getByTestId('token').textContent).toBe('null');
      expect(screen.getByTestId('is-auth').textContent).toBe('false');
    });

    it('handles bootstrap success', async () => {
      const { promise, resolve } = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValue(promise);
      renderWithProvider(mockAuthApi);

      await act(async () => {
        resolve({ access_token: 'boot-token', token_type: 'Bearer', expires_in: 3600 });
      });

      expect(screen.getByTestId('status').textContent).toBe('authenticated');
      expect(screen.getByTestId('token').textContent).toBe('boot-token');
      expect(screen.getByTestId('is-auth').textContent).toBe('true');
    });

    it('handles bootstrap HTTP 401 error', async () => {
      const { promise, reject } = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValue(promise);
      renderWithProvider(mockAuthApi);

      await act(async () => {
        reject(new ApiError({ status: 401, errorCode: 'AUTH_FAILED', message: 'Unauthorized' }));
      });

      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
      expect(screen.getByTestId('token').textContent).toBe('null');
      expect(mockAuthApi.refresh).toHaveBeenCalledTimes(1);
    });

    it('handles bootstrap NETWORK_ERROR', async () => {
      const { promise, reject } = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValue(promise);
      renderWithProvider(mockAuthApi);

      await act(async () => {
        reject(new ApiError({ status: 0, errorCode: 'NETWORK_ERROR', message: 'No connection' }));
      });

      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
      expect(mockAuthApi.refresh).toHaveBeenCalledTimes(1);
    });

    it('handles bootstrap HTTP 500', async () => {
      const { promise, reject } = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValue(promise);
      renderWithProvider(mockAuthApi);

      await act(async () => {
        reject(new ApiError({ status: 500, errorCode: 'SERVER_ERROR', message: 'Error' }));
      });

      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
      expect(mockAuthApi.refresh).toHaveBeenCalledTimes(1);
    });

    it('handles invalid TokenResponse on bootstrap', async () => {
      const { promise, resolve } = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValue(promise);
      renderWithProvider(mockAuthApi);

      await act(async () => {
        resolve({ access_token: '', token_type: 'Bearer', expires_in: 3600 });
      });

      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
      expect(screen.getByTestId('token').textContent).toBe('null');
    });
  });

  describe('Single-flight Refresh', () => {
    it('handles multiple concurrent refresh calls', async () => {
      // First bootstrap finishes
      const boot = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValueOnce(boot.promise);

      let externalAuth: any;
      const CaptureAuth = () => {
        externalAuth = useAuth();
        return null;
      };

      renderWithProvider(mockAuthApi, <CaptureAuth />);

      await act(async () => {
        boot.resolve({ access_token: 'boot-token', token_type: 'Bearer', expires_in: 3600 });
      });

      expect(mockAuthApi.refresh).toHaveBeenCalledTimes(1);

      // Now manual refresh
      const manual = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValueOnce(manual.promise);

      let res1, res2, res3;

      await act(async () => {
        const p1 = externalAuth.refreshSession();
        const p2 = externalAuth.refreshSession();
        const p3 = externalAuth.refreshSession();

        manual.resolve({ access_token: 'manual-token', token_type: 'Bearer', expires_in: 3600 });

        [res1, res2, res3] = await Promise.all([p1, p2, p3]);
      });

      // Extra calls should be 1
      expect(mockAuthApi.refresh).toHaveBeenCalledTimes(2);
      expect(res1).toBe(true);
      expect(res2).toBe(true);
      expect(res3).toBe(true);

      // Subsequent refresh starts a new request
      const nextManual = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValueOnce(nextManual.promise);

      let res4;
      await act(async () => {
        const p4 = externalAuth.refreshSession();
        nextManual.resolve({ access_token: 'next-token', token_type: 'Bearer', expires_in: 3600 });
        res4 = await p4;
      });

      expect(mockAuthApi.refresh).toHaveBeenCalledTimes(3);
      expect(res4).toBe(true);
    });
  });

  describe('Stale Response Protection', () => {
    let externalAuth: any;
    const CaptureAuth = () => {
      externalAuth = useAuth();
      return <TestComponent />;
    };

    it('A. Refresh -> Logout -> Refresh success', async () => {
      // Complete bootstrap
      (mockAuthApi.refresh as any).mockResolvedValueOnce({ access_token: 'boot', token_type: 'Bearer', expires_in: 3600 });
      renderWithProvider(mockAuthApi, <CaptureAuth />);
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

      // Start refresh
      const manual = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValueOnce(manual.promise);

      let refreshPromise: Promise<boolean>;
      act(() => {
        refreshPromise = externalAuth.refreshSession();
      });

      // Execute logout
      await act(async () => {
        await externalAuth.logout();
      });

      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
      expect(screen.getByTestId('token').textContent).toBe('null');

      // Resolve stale refresh
      await act(async () => {
        manual.resolve({ access_token: 'stale-token', token_type: 'Bearer', expires_in: 3600 });
        await refreshPromise;
      });

      // Status should remain unauthenticated
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
      expect(screen.getByTestId('token').textContent).toBe('null');
    });

    it('B. Refresh -> Login -> Refresh success', async () => {
      // Complete bootstrap
      (mockAuthApi.refresh as any).mockResolvedValueOnce({ access_token: 'boot', token_type: 'Bearer', expires_in: 3600 });
      renderWithProvider(mockAuthApi, <CaptureAuth />);
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

      // Start refresh
      const manual = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValueOnce(manual.promise);

      let refreshPromise: Promise<boolean>;
      act(() => {
        refreshPromise = externalAuth.refreshSession();
      });

      // Execute login
      (mockAuthApi.login as any).mockResolvedValueOnce({ access_token: 'login-token', token_type: 'Bearer', expires_in: 3600 });
      await act(async () => {
        await externalAuth.login({ email: 'a@a.com', password: 'pw' });
      });

      expect(screen.getByTestId('status').textContent).toBe('authenticated');
      expect(screen.getByTestId('token').textContent).toBe('login-token');

      // Resolve stale refresh
      await act(async () => {
        manual.resolve({ access_token: 'stale-token', token_type: 'Bearer', expires_in: 3600 });
        await refreshPromise;
      });

      // Token should remain login-token
      expect(screen.getByTestId('status').textContent).toBe('authenticated');
      expect(screen.getByTestId('token').textContent).toBe('login-token');
    });

    it('C. Refresh -> Login -> Refresh failure', async () => {
      // Complete bootstrap
      (mockAuthApi.refresh as any).mockResolvedValueOnce({ access_token: 'boot', token_type: 'Bearer', expires_in: 3600 });
      renderWithProvider(mockAuthApi, <CaptureAuth />);
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

      // Start refresh
      const manual = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValueOnce(manual.promise);

      let refreshPromise: Promise<boolean>;
      act(() => {
        refreshPromise = externalAuth.refreshSession();
      });

      // Execute login
      (mockAuthApi.login as any).mockResolvedValueOnce({ access_token: 'login-token', token_type: 'Bearer', expires_in: 3600 });
      await act(async () => {
        await externalAuth.login({ email: 'a@a.com', password: 'pw' });
      });

      // Fail stale refresh
      await act(async () => {
        manual.reject(new Error('fail'));
        await refreshPromise;
      });

      // Token should remain login-token, not cleared
      expect(screen.getByTestId('status').textContent).toBe('authenticated');
      expect(screen.getByTestId('token').textContent).toBe('login-token');
    });
  });

  describe('StrictMode Behavior', () => {
    it('executes bootstrap exactly once when wrapped in StrictMode', async () => {
      const boot = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValue(boot.promise);

      let _renderCount = 0;
      const StrictConsumer = () => {
        _renderCount++;
        const auth = useAuth();
        return <div data-testid="strict-status">{auth.status}</div>;
      };

      render(
        <AuthProvider authApi={mockAuthApi}>
          <React.StrictMode>
            <StrictConsumer />
          </React.StrictMode>
        </AuthProvider>
      );

      await act(async () => {
        boot.resolve({ access_token: 'strict-token', token_type: 'Bearer', expires_in: 3600 });
      });

      expect(mockAuthApi.refresh).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('strict-status').textContent).toBe('authenticated');
    });
  });

  describe('Unmount Safety', () => {
    it('does not update state or throw when unresolved promise finishes after unmount', async () => {
      const boot = createControlledPromise<any>();
      (mockAuthApi.refresh as any).mockReturnValue(boot.promise);

      const originalError = console.error;
      const errorSpy = vi.fn();
      console.error = errorSpy;

      const { unmount } = renderWithProvider(mockAuthApi);

      unmount();

      await act(async () => {
        boot.resolve({ access_token: 'unmount-token', token_type: 'Bearer', expires_in: 3600 });
      });

      expect(errorSpy).not.toHaveBeenCalled();
      console.error = originalError;
    });
  });

  describe('Other behaviors (Login/Logout)', () => {
    beforeEach(async () => {
      // Wait for bootstrap to finish for these tests
      (mockAuthApi.refresh as any).mockResolvedValue({ access_token: 'boot', token_type: 'Bearer', expires_in: 3600 });
    });

    it('handles login success', async () => {
      renderWithProvider(mockAuthApi);
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

      const response = { access_token: 'test-token', token_type: 'Bearer', expires_in: 3600 };
      (mockAuthApi.login as any).mockResolvedValue(response);
      screen.getByTestId('login-btn').click();

      await waitFor(() => {
        expect(screen.getByTestId('token').textContent).toBe('test-token');
      });
      expect(mockAuthApi.login).toHaveBeenCalledTimes(1);
    });

    it('handles login failure', async () => {
      renderWithProvider(mockAuthApi);
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

      const error = new ApiError({ status: 401, errorCode: 'AUTH_FAILED', message: 'Failed' });
      (mockAuthApi.login as any).mockRejectedValue(error);
      screen.getByTestId('login-btn').click();

      await waitFor(() => {
        expect(screen.getByTestId('error-out').textContent).toBe('AUTH_FAILED');
      });
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    });

    it('handles logout success', async () => {
      renderWithProvider(mockAuthApi);
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

      (mockAuthApi.logout as any).mockResolvedValue(undefined);
      screen.getByTestId('logout-btn').click();

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
      });
      expect(mockAuthApi.logout).toHaveBeenCalledTimes(1);
    });

    it('does not leak token to storage', async () => {
      renderWithProvider(mockAuthApi);
      await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

      const response = { access_token: 'secret-token', token_type: 'Bearer', expires_in: 3600 };
      (mockAuthApi.login as any).mockResolvedValue(response);
      screen.getByTestId('login-btn').click();

      await waitFor(() => {
        expect(screen.getByTestId('token').textContent).toBe('secret-token');
      });

      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).not.toContain('secret-token');
    });

    it('throws error when useAuth is used outside of AuthProvider', () => {
      const originalConsoleError = console.error;
      console.error = vi.fn();
      expect(() => render(<TestComponent />)).toThrow('useAuth must be used within AuthProvider');
      console.error = originalConsoleError;
    });
  });
});
