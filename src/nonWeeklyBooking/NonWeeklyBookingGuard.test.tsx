// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import { getDefaultRoute, getDemoActor, type DemoActorId } from '../demoDomain/demoDomain';
import { NonWeeklyBookingGuard } from './NonWeeklyBookingGuard';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="nonweekly-location">{location.pathname}</div>;
}

function renderGuard(actorId: DemoActorId) {
  return render(
    <MemoryRouter initialEntries={['/appointments/new']}>
      <DemoDomainProvider initialActorId={actorId}>
        <Routes>
          <Route path="/appointments/new" element={<NonWeeklyBookingGuard><h1>Standard booking data</h1></NonWeeklyBookingGuard>} />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
        </Routes>
        <LocationDisplay />
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('NonWeeklyBookingGuard', () => {
  it.each(['supplier-administrator', 'supplier-user'] as const)('allows configured Supplier actor %s', (actorId) => {
    renderGuard(actorId);
    expect(screen.getByRole('heading', { name: 'Standard booking data' })).toBeDefined();
    expect(screen.getByTestId('nonweekly-location').textContent).toBe('/appointments/new');
  });

  it.each([
    'system-administrator',
    'warehouse-administrator',
    'warehouse-operator',
    'security-officer',
  ] as const)('redirects unauthorized actor %s fail closed', (actorId) => {
    renderGuard(actorId);
    const defaultRoute = getDefaultRoute(getDemoActor(actorId));
    const fallbackHeading = defaultRoute === '/users' ? 'Users fallback' : 'Appointments fallback';
    expect(screen.queryByRole('heading', { name: 'Standard booking data' })).toBeNull();
    expect(screen.getByRole('heading', { name: fallbackHeading })).toBeDefined();
    expect(screen.getByTestId('nonweekly-location').textContent).toBe(defaultRoute);
  });
});