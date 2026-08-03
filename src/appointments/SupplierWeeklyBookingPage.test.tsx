// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, type AuthApiPort } from '../auth/AuthProvider';
import { AppRoutes } from '../app/AppRoutes';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import { demoActors, type DemoActorId } from '../demoDomain/demoDomain';
import { SupplierWeeklyBookingGuard } from './SupplierWeeklyBookingGuard';
import { SupplierWeeklyBookingPage } from './SupplierWeeklyBookingPage';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderGuardedRoute(initialActorId: DemoActorId) {
  return render(
    <MemoryRouter initialEntries={['/appointments/reserve-next-week']}>
      <DemoDomainProvider initialActorId={initialActorId}>
        <Routes>
          <Route
            path="/appointments/reserve-next-week"
            element={(
              <SupplierWeeklyBookingGuard>
                <SupplierWeeklyBookingPage />
              </SupplierWeeklyBookingGuard>
            )}
          />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
          <Route path="*" element={<Navigate to="/appointments" replace />} />
        </Routes>
        <LocationProbe />
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Supplier weekly booking rendered contract', () => {
  it('AC-SUP-006 guards the direct route across all six demo actors and SKIPs unconfigured Supplier participation', async () => {
    for (const actor of demoActors) {
      const view = renderGuardedRoute(actor.id);

      if (actor.id === 'supplier-administrator') {
        expect(screen.getByRole('heading', { name: 'Reserve a next-week delivery slot' })).toBeDefined();
        expect(screen.getByTestId('location').textContent)
          .toBe('/appointments/reserve-next-week');
      } else {
        await waitFor(() => expect(screen.queryByRole('heading', {
          name: 'Reserve a next-week delivery slot',
        })).toBeNull());
        expect(screen.queryByText('Demonstrational reservation created')).toBeNull();
        expect(screen.getByTestId('location').textContent)
          .not.toBe('/appointments/reserve-next-week');
      }

      view.unmount();
    }
  });

  it('AC-SUP-007 fails closed with accessible summary and field diagnostics', () => {
    renderGuardedRoute('supplier-administrator');

    fireEvent.click(screen.getByRole('button', { name: 'Create local demonstration' }));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Reservation was not created');
    expect(alert.textContent).toContain('Purchase order number is required.');
    expect(alert.textContent).toContain('A next-week slot is required.');
    expect(alert.textContent).toContain('Tractor registration is required.');
    expect(alert.textContent).toContain('Trailer or container registration is required.');
    expect(screen.queryByRole('heading', { name: 'Demonstrational reservation created' })).toBeNull();
    expect(screen.getByLabelText('Purchase order number').getAttribute('aria-invalid')).toBe('true');
  });

  it('AC-SUP-008 creates only a local result and keeps a scoped duplicate as a non-blocking warning', () => {
    renderGuardedRoute('supplier-administrator');

    fireEvent.change(screen.getByLabelText('Purchase order number'), {
      target: { value: '  po-demo-1001  ' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Monday 10 Aug, 08:00–09:00' }));
    fireEvent.change(screen.getByLabelText('Tractor registration'), {
      target: { value: '  tr-100  ' },
    });
    fireEvent.change(screen.getByLabelText('Trailer or container registration'), {
      target: { value: '  trailer-200  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create local demonstration' }));

    expect(screen.getByRole('heading', { name: 'Demonstrational reservation created' })).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('local fixture');
    expect(screen.getByText('PO-DEMO-1001')).toBeDefined();
    expect(screen.getByText('TR-100')).toBeDefined();
    expect(screen.getByText('TRAILER-200')).toBeDefined();
    expect(screen.getByText('SUPPLIER_RESERVED')).toBeDefined();
    expect(screen.getByText('AWAITING_DETAILS')).toBeDefined();
    expect(screen.getByText(/No durable save, capacity reservation, email, approval or integration occurred/)).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.body.textContent).not.toContain('SKU');
    expect(document.body.textContent).not.toContain('delivery part');
  });

  it('shows the booking action only when the same BOOK_APPOINTMENT workflow decision allows navigation', async () => {
    const authApi: AuthApiPort = {
      login: vi.fn(),
      refresh: vi.fn().mockResolvedValue({
        access_token: 'token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
      logout: vi.fn(),
    };

    render(
      <AuthProvider authApi={authApi}>
        <MemoryRouter initialEntries={['/appointments']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText('Demo access context')).toBeDefined());
    expect(screen.queryByRole('link', { name: 'Reserve next-week slot' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Demo access context'), {
      target: { value: 'supplier-administrator' },
    });
    await waitFor(() => expect(screen.getByRole('link', {
      name: 'Reserve next-week slot',
    })).toBeDefined());

    fireEvent.change(screen.getByLabelText('Demo access context'), {
      target: { value: 'supplier-user' },
    });
    await waitFor(() => expect(screen.queryByRole('link', {
      name: 'Reserve next-week slot',
    })).toBeNull());
  });
});
