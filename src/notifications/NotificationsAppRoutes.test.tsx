// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../app/AppRoutes';
import { AuthProvider, type AuthApiPort } from '../auth/AuthProvider';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="notification-location">{location.pathname}</div>;
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

describe('notification AppRoutes integration', () => {
  it('allows an authenticated actor to open /notifications directly', async () => {
    renderApp('/notifications');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Notifications and exceptional states' })).toBeDefined());
    expect(screen.getByTestId('notification-location').textContent).toBe('/notifications');
  });

  it('keeps /notifications available while re-scoping after switching to Supplier', async () => {
    renderApp('/notifications');
    await waitFor(() => expect(screen.getByText(/Active actor: System Administrator/)).toBeDefined());

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'supplier-user' },
      });
    });

    await waitFor(() => expect(screen.getByText(/Active actor: Supplier User/)).toBeDefined());
    expect(screen.getByTestId('notification-location').textContent).toBe('/notifications');
    expect(screen.getAllByText(/Vistula Materials/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Baltic Freight/)).toBeNull();
  });

  it('exposes the notification link to internal, Supplier and Security actors', async () => {
    renderApp('/appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined());
    expect(screen.getByRole('link', { name: 'Open notifications and states' }).getAttribute('href')).toBe('/notifications');

    for (const actorId of ['supplier-user', 'security-officer'] as const) {
      await act(async () => {
        fireEvent.change(screen.getByLabelText('Demo access context'), {
          target: { value: actorId },
        });
      });
      await waitFor(() => expect(screen.getByRole('link', { name: 'Open notifications and states' })).toBeDefined());
    }
  });
});
