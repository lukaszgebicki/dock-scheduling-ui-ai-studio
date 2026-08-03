// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../app/AppRoutes';
import { AuthProvider, type AuthApiPort } from '../auth/AuthProvider';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="dashboard-location">{location.pathname}{location.search}</div>;
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

describe('dashboard AppRoutes integration', () => {
  it('allows an authenticated actor to open /dashboard directly', async () => {
    renderApp('/dashboard');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Role dashboard' })).toBeDefined());
    expect(screen.getByTestId('dashboard-location').textContent).toBe('/dashboard');
  });

  it('keeps /dashboard available and scoped for Supplier after actor change', async () => {
    renderApp('/dashboard');
    await waitFor(() => expect(screen.getByText(/Active actor: System Administrator/)).toBeDefined());

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'supplier-user' },
      });
    });

    await waitFor(() => expect(screen.getByText(/Active actor: Supplier User/)).toBeDefined());
    expect(screen.getByTestId('dashboard-location').textContent).toBe('/dashboard');
    expect(screen.getByText('Supplier mobile day and time list')).toBeDefined();
    expect(screen.getByText('APT-WPL-003')).toBeDefined();
    expect(screen.queryByText('Baltic Freight')).toBeNull();
  });

  it('keeps /dashboard available and gate-safe for Security Officer', async () => {
    renderApp('/dashboard');
    await waitFor(() => expect(screen.getByText(/Active actor: System Administrator/)).toBeDefined());

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'security-officer' },
      });
    });

    await waitFor(() => expect(screen.getByText(/Active actor: Security Officer/)).toBeDefined());
    expect(screen.getByTestId('dashboard-location').textContent).toBe('/dashboard');
    expect(screen.getByRole('link', { name: 'Open authorized gate operations' })).toBeDefined();
    expect(screen.queryByText('Slot utilization')).toBeNull();
  });

  it('exposes the dashboard link to internal, Supplier and Security actors', async () => {
    renderApp('/appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined());
    expect(screen.getByRole('link', { name: 'Open role dashboard' }).getAttribute('href')).toBe('/dashboard');

    for (const actorId of ['supplier-user', 'security-officer'] as const) {
      await act(async () => {
        fireEvent.change(screen.getByLabelText('Demo access context'), {
          target: { value: actorId },
        });
      });
      await waitFor(() => expect(screen.getByRole('link', { name: 'Open role dashboard' })).toBeDefined());
    }
  });

  it('revalidates an actor-bound KPI query after switching actors', async () => {
    renderApp('/dashboard?filter=ACTIVE_WEEK&actor=system-administrator');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Appointments this week — filtered appointments' })).toBeDefined());

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'supplier-user' },
      });
    });

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('KPI filter was cleared'));
    expect(screen.getByTestId('dashboard-location').textContent).toBe('/dashboard?filter=ACTIVE_WEEK&actor=system-administrator');
    expect(screen.getByRole('heading', { name: 'Actor-scoped agenda' })).toBeDefined();
    expect(screen.queryByText('Baltic Freight')).toBeNull();
  });
});
