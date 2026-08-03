// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { ReportingGuard } from './ReportingGuard';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderGuard(actorId: DemoActorId) {
  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <DemoDomainProvider initialActorId={actorId}>
        <Routes>
          <Route path="/reports" element={<ReportingGuard><h1>Scoped reports</h1></ReportingGuard>} />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/gate-operations" element={<h1>Gate fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
        </Routes>
        <LocationDisplay />
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe('ReportingGuard', () => {
  it.each([
    'system-administrator',
    'warehouse-administrator',
    'warehouse-operator',
  ] as const)('allows internal actor %s', (actorId) => {
    renderGuard(actorId);
    expect(screen.getByRole('heading', { name: 'Scoped reports' })).toBeDefined();
    expect(screen.getByTestId('location').textContent).toBe('/reports');
  });

  it('redirects Supplier fail closed without rendering report data', () => {
    renderGuard('supplier-user');
    expect(screen.queryByRole('heading', { name: 'Scoped reports' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Appointments fallback' })).toBeDefined();
    expect(screen.getByTestId('location').textContent).toBe('/appointments');
  });

  it('redirects Security Officer to its canonical default without rendering report data', () => {
    renderGuard('security-officer');
    expect(screen.queryByRole('heading', { name: 'Scoped reports' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Appointments fallback' })).toBeDefined();
    expect(screen.getByTestId('location').textContent).toBe('/appointments');
  });
});
