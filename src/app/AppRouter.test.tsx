// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from './AppRoutes';
import { AuthProvider, AuthApiPort } from '../auth/AuthProvider';
import { ApiError } from '../api/ApiError';

const createControlledPromise = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Helper to capture location
const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}{location.search}</div>;
};
const LocationStateDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-state">{JSON.stringify(location.state)}</div>;
};

describe('AppRouter', () => {
  let mockAuthApi: AuthApiPort;

  beforeEach(() => {
    mockAuthApi = {
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  const renderRouter = (initialRoute: string) => {
    return render(
      <AuthProvider authApi={mockAuthApi}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AppRoutes />
          <LocationDisplay />
          <LocationStateDisplay />
        </MemoryRouter>
      </AuthProvider>
    );
  };

  it('1. bootstrapping on /: shows Restoring session..., no shell, no Login', async () => {
    const { promise } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/');

    expect(screen.getByText('Restoring session…')).toBeDefined();
    expect(screen.queryByText('Users & access')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull();
    expect(screen.getByTestId('location-display').textContent).toBe('/');
  });

  it('2. unauthenticated on /: redirects to /login and shows Login', async () => {
    const { promise, reject } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/');

    await act(async () => {
      reject(new ApiError({ status: 401, errorCode: 'AUTH_FAILED', message: 'Unauthorized' }));
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toBeDefined());
    expect(screen.getByTestId('location-display').textContent).toBe('/login');
    // Check that state.from contains only pathname
    expect(screen.getByTestId('location-state').textContent).toContain('{"from":"/"}');
  });

  it('3. authenticated on /: shows Authenticated application shell', async () => {
    const { promise, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });

    await waitFor(() => expect(screen.getAllByText('Users & access').length).toBeGreaterThan(0));
    expect(screen.getByTestId('location-display').textContent).toBe('/users');
  });

  it('4. authenticated on /login: redirects to /', async () => {
    const { promise, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/login');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });

    await waitFor(() => expect(screen.getByTestId('location-display').textContent).toBe('/users'));
    expect(screen.getAllByText('Users & access').length).toBeGreaterThan(0);
  });

  it('5. unauthenticated on /login: shows Login', async () => {
    const { promise, reject } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/login');

    await act(async () => {
      reject(new ApiError({ status: 401, errorCode: 'AUTH_FAILED', message: 'Unauthorized' }));
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toBeDefined());
    expect(screen.getByTestId('location-display').textContent).toBe('/login');
  });

  it('6. /forgot-password: available for authenticated and unauthenticated', async () => {
    // Unauthenticated
    const { promise: p1, reject } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValueOnce(p1);

    const { unmount } = renderRouter('/forgot-password');

    await act(async () => {
      reject(new ApiError({ status: 401, errorCode: 'AUTH_FAILED', message: 'Unauthorized' }));
    });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeDefined());
    unmount();

    // Authenticated
    const { promise: p2, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValueOnce(p2);

    renderRouter('/forgot-password');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Forgot password?' }).length).toBeGreaterThan(0));
  });

  it('7. /reset-password: available for authenticated and unauthenticated', async () => {
    // Unauthenticated
    const { promise: p1, reject } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValueOnce(p1);

    const { unmount } = renderRouter('/reset-password?token=test-token');

    await act(async () => {
      reject(new ApiError({ status: 401, errorCode: 'AUTH_FAILED', message: 'Unauthorized' }));
    });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeDefined());
    expect(screen.getByTestId('location-display').textContent).toBe('/reset-password');
    unmount();

    // Authenticated
    const { promise: p2, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValueOnce(p2);

    renderRouter('/reset-password?token=test-token');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });
    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Reset your password' }).length).toBeGreaterThan(0));
    expect(screen.getByTestId('location-display').textContent).toBe('/reset-password');
  });

  it('8. unknown route: redirects authenticated to / and unauthenticated to /login', async () => {
    // Unauthenticated
    const { promise: p1, reject } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValueOnce(p1);

    const { unmount } = renderRouter('/unknown');

    await act(async () => {
      reject(new ApiError({ status: 401, errorCode: 'AUTH_FAILED', message: 'Unauthorized' }));
    });
    await waitFor(() => expect(screen.getByTestId('location-display').textContent).toBe('/login'));
    unmount();

    // Authenticated
    const { promise: p2, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValueOnce(p2);

    renderRouter('/unknown2');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });
    await waitFor(() => expect(screen.getByTestId('location-display').textContent).toBe('/users'));
  });

  it('9. logout button: calls authApi.logout exactly once and navigates to Login via AuthState change', async () => {
    const { promise, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });

    await waitFor(() => expect(screen.getAllByText('Users & access').length).toBeGreaterThan(0));

    (mockAuthApi.logout as any).mockResolvedValueOnce(undefined);

    const logoutBtn = screen.getByText('Log out');
    await act(async () => {
      logoutBtn.click();
    });

    expect(mockAuthApi.logout).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('location-display').textContent).toBe('/login'));
  });

  it('10. protected content does not appear during bootstrapping', async () => {
    const { promise } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/');

    expect(screen.queryByText('Users & access')).toBeNull();
    expect(screen.getByText('Restoring session…')).toBeDefined();
  });

  it('11. routing does not trigger extra refresh calls beyond the provider bootstrap', async () => {
    const { promise, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });

    await waitFor(() => expect(screen.getAllByText('Users & access').length).toBeGreaterThan(0));

    expect(mockAuthApi.refresh).toHaveBeenCalledTimes(1);
  });

  it('12. unauthenticated access to /supplier-organizations is protected and redirects to /login', async () => {
    const { promise, reject } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/supplier-organizations');

    await act(async () => {
      reject(new ApiError({ status: 401, errorCode: 'AUTH_FAILED', message: 'Unauthorized' }));
    });

    await waitFor(() => expect(screen.getByTestId('location-display').textContent).toBe('/login'));
    expect(screen.getByRole('heading', { name: 'Sign in' }).textContent).toBe('Sign in');
  });

  it('13. authenticated access to /supplier-organizations renders the Supplier organizations overview and retains the exact path', async () => {
    const { promise, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/supplier-organizations');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });

    await waitFor(() => expect(screen.getByTestId('location-display').textContent).toBe('/supplier-organizations'));
    expect(screen.getByRole('heading', { name: 'Supplier organizations', level: 1 }).textContent).toBe('Supplier organizations');
  });

  it('14. authenticated access to /supplier-organizations/new renders Add supplier organization and retains the exact path', async () => {
    const { promise, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    renderRouter('/supplier-organizations/new');

    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });

    await waitFor(() => expect(screen.getByTestId('location-display').textContent).toBe('/supplier-organizations/new'));
    expect(screen.getByRole('heading', { name: 'Add supplier organization', level: 1 }).textContent).toBe('Add supplier organization');
  });

  it('15. authenticated System Administrator reaches both configuration routes', async () => {
    const { promise, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    const { unmount } = renderRouter(
      '/warehouses/nowy-kisielin-distribution-center/configuration',
    );
    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });

    await waitFor(() => expect(screen.getByRole('heading', {
      name: 'Configure Nowy Kisielin Distribution Center',
    })).toBeDefined());
    expect(screen.getByTestId('location-display').textContent)
      .toBe('/warehouses/nowy-kisielin-distribution-center/configuration');
    unmount();

    const second = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(second.promise);
    renderRouter('/supplier-organizations/northstar-packaging/configuration');
    await act(async () => {
      second.resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });

    await waitFor(() => expect(screen.getByRole('heading', {
      name: 'Configure Northstar Packaging',
    })).toBeDefined());
  });

  it('16. actor switching preserves assigned warehouse configuration access and rejects supplier configuration', async () => {
    const { promise, resolve } = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(promise);

    const { unmount } = renderRouter(
      '/warehouses/nowy-kisielin-distribution-center/configuration',
    );
    await act(async () => {
      resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });
    await waitFor(() => expect(screen.getByLabelText('Demo access context')).toBeDefined());

    fireEvent.change(screen.getByLabelText('Demo access context'), {
      target: { value: 'warehouse-administrator' },
    });
    await waitFor(() => expect(screen.getByTestId('location-display').textContent)
      .toBe('/warehouses/nowy-kisielin-distribution-center/configuration'));
    expect(screen.getByRole('heading', {
      name: 'Configure Nowy Kisielin Distribution Center',
    })).toBeDefined();
    unmount();

    const second = createControlledPromise<any>();
    (mockAuthApi.refresh as any).mockReturnValue(second.promise);
    renderRouter('/supplier-organizations/northstar-packaging/configuration');
    await act(async () => {
      second.resolve({ access_token: 'token', token_type: 'Bearer', expires_in: 3600 });
    });
    fireEvent.change(screen.getByLabelText('Demo access context'), {
      target: { value: 'warehouse-administrator' },
    });

    await waitFor(() => expect(screen.getByTestId('location-display').textContent).toBe('/users'));
    expect(screen.queryByRole('heading', { name: 'Configure Northstar Packaging' })).toBeNull();
  });
});
