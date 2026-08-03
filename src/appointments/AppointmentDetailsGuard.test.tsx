// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { AppointmentDetailsGuard } from './AppointmentDetailsGuard';
import { AppointmentWorkspaceProvider } from './AppointmentWorkspaceProvider';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderGuard(path: string, actorId: DemoActorId) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoDomainProvider initialActorId={actorId}>
        <AppointmentWorkspaceProvider>
          <Routes>
            <Route path="/appointments/:appointmentId" element={(
              <AppointmentDetailsGuard><h1>Scoped appointment detail</h1></AppointmentDetailsGuard>
            )} />
            <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          </Routes>
          <LocationDisplay />
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe('AppointmentDetailsGuard', () => {
  it('allows an in-scope direct detail route', () => {
    renderGuard('/appointments/planning-baltic-2001', 'warehouse-operator');
    expect(screen.getByRole('heading', { name: 'Scoped appointment detail' })).toBeDefined();
    expect(screen.getByTestId('location').textContent).toBe('/appointments/planning-baltic-2001');
  });

  it('redirects an out-of-scope Supplier record without rendering detail data', () => {
    renderGuard('/appointments/planning-baltic-2001', 'supplier-user');
    expect(screen.queryByRole('heading', { name: 'Scoped appointment detail' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Appointments fallback' })).toBeDefined();
    expect(screen.getByTestId('location').textContent).toBe('/appointments');
    expect(screen.queryByText('PO-DEMO-2001')).toBeNull();
  });

  it('redirects a missing appointment id fail closed', () => {
    renderGuard('/appointments/missing-record', 'system-administrator');
    expect(screen.queryByRole('heading', { name: 'Scoped appointment detail' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Appointments fallback' })).toBeDefined();
    expect(screen.getByTestId('location').textContent).toBe('/appointments');
  });
});
