// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../app/AppRoutes';
import { AuthProvider, type AuthApiPort } from '../auth/AuthProvider';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="report-location">{location.pathname}</div>;
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

describe('reporting AppRoutes integration', () => {
  it('allows an authenticated internal actor to open /reports', async () => {
    renderApp('/reports');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'PO and SKU reports' })).toBeDefined());
    expect(screen.getByTestId('report-location').textContent).toBe('/reports');
  });

  it('redirects a Supplier actor from /reports without rendering report data', async () => {
    renderApp('/reports');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'PO and SKU reports' })).toBeDefined());

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'supplier-user' },
      });
    });

    await waitFor(() => expect(screen.getByTestId('report-location').textContent).toBe('/appointments'));
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'PO and SKU reports' })).toBeNull();
    expect(screen.queryByText('Baltic Freight')).toBeNull();
  });

  it('redirects Security Officer from /reports to its canonical default route', async () => {
    renderApp('/reports');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'PO and SKU reports' })).toBeDefined());

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'security-officer' },
      });
    });

    await waitFor(() => expect(screen.getByTestId('report-location').textContent).toBe('/appointments'));
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'PO and SKU reports' })).toBeNull();
  });

  it('shows the reporting link only to authorized internal actors', async () => {
    renderApp('/appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined());
    expect(screen.getByRole('link', { name: 'Open PO/SKU reports' }).getAttribute('href')).toBe('/reports');

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'supplier-user' },
      });
    });

    await waitFor(() => expect(screen.queryByRole('link', { name: 'Open PO/SKU reports' })).toBeNull());
  });
});
