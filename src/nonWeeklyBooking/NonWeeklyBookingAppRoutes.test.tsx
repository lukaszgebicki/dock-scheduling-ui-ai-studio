// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../app/AppRoutes';
import { AuthProvider, type AuthApiPort } from '../auth/AuthProvider';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="nonweekly-app-location">{location.pathname}</div>;
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

describe('non-weekly booking AppRoutes integration', () => {
  it('redirects an internal actor from the standard Supplier route', async () => {
    renderApp('/appointments/new');
    await waitFor(() => expect(screen.getByTestId('nonweekly-app-location').textContent).toBe('/users'));
    expect(screen.getByRole('heading', { name: 'Users & access' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Create standard Supplier appointment' })).toBeNull();
  });

  it('shows the route link only to Supplier actors and opens the five-step page', async () => {
    renderApp('/appointments');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined());
    expect(screen.queryByRole('link', { name: 'Create standard appointment' })).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'supplier-administrator' },
      });
    });
    const link = await screen.findByRole('link', { name: 'Create standard appointment' });
    expect(link.getAttribute('href')).toBe('/appointments/new');
    fireEvent.click(link);

    await waitFor(() => expect(screen.getByTestId('nonweekly-app-location').textContent).toBe('/appointments/new'));
    expect(screen.getByRole('heading', { name: 'Create standard Supplier appointment' })).toBeDefined();
    expect(screen.getByText('Standard flow · outside weekly planning')).toBeDefined();
    expect(screen.getAllByText(/Step [1-5]/)).toHaveLength(5);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Demo access context'), {
        target: { value: 'system-administrator' },
      });
    });
    await waitFor(() => expect(screen.getByTestId('nonweekly-app-location').textContent).toBe('/users'));
    expect(screen.getByRole('heading', { name: 'Users & access' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Create standard Supplier appointment' })).toBeNull();
  });
});