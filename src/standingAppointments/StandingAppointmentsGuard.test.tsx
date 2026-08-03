// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { StandingAppointmentsGuard } from './StandingAppointmentsGuard';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="standing-location">{location.pathname}</div>;
}

function renderGuard(actorId: DemoActorId) {
  return render(
    <MemoryRouter initialEntries={['/standing-appointments']}>
      <DemoDomainProvider initialActorId={actorId}>
        <Routes>
          <Route path="/standing-appointments" element={<StandingAppointmentsGuard><h1>Standing series data</h1></StandingAppointmentsGuard>} />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
        </Routes>
        <LocationDisplay />
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe('StandingAppointmentsGuard', () => {
  it.each([
    'system-administrator',
    'warehouse-administrator',
    'supplier-administrator',
  ] as const)('allows authorized actor %s', (actorId) => {
    renderGuard(actorId);
    expect(screen.getByRole('heading', { name: 'Standing series data' })).toBeDefined();
    expect(screen.getByTestId('standing-location').textContent).toBe('/standing-appointments');
  });

  it.each([
    'warehouse-operator',
    'supplier-user',
    'security-officer',
  ] as const)('redirects unauthorized actor %s fail closed', (actorId) => {
    renderGuard(actorId);
    expect(screen.queryByRole('heading', { name: 'Standing series data' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Appointments fallback' })).toBeDefined();
    expect(screen.getByTestId('standing-location').textContent).toBe('/appointments');
  });
});
