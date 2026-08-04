// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import { getDefaultRoute, getDemoActor, type DemoActorId } from '../demoDomain/demoDomain';
import { OperatorManualBookingGuard } from './OperatorManualBookingGuard';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="operator-booking-location">{location.pathname}</div>;
}

function renderGuard(actorId: DemoActorId) {
  return render(
    <MemoryRouter initialEntries={['/appointments/manual/new']}>
      <DemoDomainProvider initialActorId={actorId}>
        <Routes>
          <Route path="/appointments/manual/new" element={<OperatorManualBookingGuard><h1>Operator manual booking data</h1></OperatorManualBookingGuard>} />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
        </Routes>
        <LocationDisplay />
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('OperatorManualBookingGuard', () => {
  it('allows the assigned Warehouse Operator', () => {
    renderGuard('warehouse-operator');
    expect(screen.getByRole('heading', { name: 'Operator manual booking data' })).toBeDefined();
    expect(screen.getByTestId('operator-booking-location').textContent)
      .toBe('/appointments/manual/new');
  });

  it.each([
    'system-administrator',
    'warehouse-administrator',
    'security-officer',
    'supplier-administrator',
    'supplier-user',
  ] as const)('redirects unauthorized actor %s fail closed', (actorId) => {
    renderGuard(actorId);
    const defaultRoute = getDefaultRoute(getDemoActor(actorId));
    const fallbackHeading = defaultRoute === '/users' ? 'Users fallback' : 'Appointments fallback';
    expect(screen.queryByRole('heading', { name: 'Operator manual booking data' })).toBeNull();
    expect(screen.getByRole('heading', { name: fallbackHeading })).toBeDefined();
    expect(screen.getByTestId('operator-booking-location').textContent).toBe(defaultRoute);
  });
});
