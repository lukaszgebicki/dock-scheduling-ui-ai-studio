// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../app/AppRoutes';
import { AuthProvider, type AuthApiPort } from '../auth/AuthProvider';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="standing-app-location">{location.pathname}</div>;
}

function authenticatedApi(): AuthApiPort {
  return {
    login: vi.fn(),
    refresh: vi.fn().mockResolvedValue({
      access_token: 'token',
      token_type: 'Bearer',
      expires_in: 3600,
    }),
    logout: vi.fn(),
  };
}

function renderApp(path: string) {
  return render(
    <AuthProvider authApi={authenticatedApi()}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationDisplay />
      </MemoryRouter>
    </AuthProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('standing appointments AppRoutes integration', () => {
  it('allows System Administrator to inspect /standing-appointments directly', async () => {
    renderApp('/standing-appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Standing appointment series' })).toBeDefined());
    expect(screen.getByTestId('standing-app-location').textContent).toBe('/standing-appointments');
    expect(screen.getByText(/Inspection only/)).toBeDefined();
  });

  it('allows Warehouse Administrator and Supplier Administrator with scoped controls', async () => {
    renderApp('/standing-appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Standing appointment series' })).toBeDefined());

    for (const actorId of ['warehouse-administrator', 'supplier-administrator'] as const) {
      await act(async () => {
        fireEvent.change(screen.getByLabelText('Demo access context'), {
          target: { value: actorId },
        });
      });
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Series definition' })).toBeDefined());
      expect(screen.getByTestId('standing-app-location').textContent).toBe('/standing-appointments');
    }
  });

  it.each([
    'warehouse-operator',
    'supplier-user',
  ] as const)('redirects unauthorized actor %s to appointments fail closed', async (actorId) => {
    renderApp('/standing-appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Standing appointment series' })).toBeDefined());
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: actorId },
      });
    });
    await waitFor(() => expect(screen.getByTestId('standing-app-location').textContent).toBe('/appointments'));
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Standing appointment series' })).toBeNull();
  });

  it('redirects Security Officer to the current default appointments route', async () => {
    renderApp('/standing-appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Standing appointment series' })).toBeDefined());
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'security-officer' },
      });
    });
    await waitFor(() => expect(screen.getByTestId('standing-app-location').textContent).toBe('/appointments'));
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Standing appointment series' })).toBeNull();
  });

  it('shows the standing-series link only to authorized roles', async () => {
    renderApp('/appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined());
    expect(screen.getByRole('link', { name: 'Open standing appointment series' }).getAttribute('href'))
      .toBe('/standing-appointments');

    for (const actorId of ['warehouse-administrator', 'supplier-administrator'] as const) {
      await act(async () => {
        fireEvent.change(screen.getByLabelText('Demo access context'), {
          target: { value: actorId },
        });
      });
      await waitFor(() => expect(screen.getByRole('link', { name: 'Open standing appointment series' })).toBeDefined());
    }

    for (const actorId of ['warehouse-operator', 'supplier-user', 'security-officer'] as const) {
      await act(async () => {
        fireEvent.change(screen.getByLabelText('Demo access context'), {
          target: { value: actorId },
        });
      });
      await waitFor(() => expect(screen.queryByRole('link', { name: 'Open standing appointment series' })).toBeNull());
    }
  });
});
