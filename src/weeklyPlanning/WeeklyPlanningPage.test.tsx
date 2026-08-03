// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { WeeklyPlanningGuard } from './WeeklyPlanningGuard';
import { WeeklyPlanningPage } from './WeeklyPlanningPage';

function renderRoute(actorId: DemoActorId) {
  return render(
    <MemoryRouter initialEntries={['/weekly-planning']}>
      <DemoDomainProvider initialActorId={actorId}>
        <Routes>
          <Route path="/weekly-planning" element={<WeeklyPlanningGuard><WeeklyPlanningPage /></WeeklyPlanningGuard>} />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
        </Routes>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Weekly planning page', () => {
  it.each<DemoActorId>(['system-administrator', 'warehouse-administrator'])('allows authorized Administrator actor %s', (actorId) => {
    renderRoute(actorId);
    expect(screen.getByRole('heading', { name: 'Weekly planning queue' })).toBeDefined();
    expect(screen.getByLabelText('Resolution reason')).toBeDefined();
  });

  it.each<DemoActorId>(['warehouse-operator', 'security-officer', 'supplier-administrator', 'supplier-user'])('fails closed on direct route for %s', (actorId) => {
    renderRoute(actorId);
    expect(screen.queryByRole('heading', { name: 'Weekly planning queue' })).toBeNull();
    expect(screen.getByRole('heading', { name: /fallback/i })).toBeDefined();
  });

  it('requires an explicit primary-actor action, records local history and performs no network or storage write', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderRoute('warehouse-administrator');

    expect(screen.getByText('No planning action has been applied.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Attach exact SKU details' }));

    expect(screen.getByRole('status').textContent).toContain('preserved');
    expect(screen.getByText(/ATTACH_DETAILS/)).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not expose lifecycle, approval, gate or override actions', () => {
    renderRoute('system-administrator');
    expect(screen.queryByRole('button', { name: /approve|reject|check in|check out|override|cancel/i })).toBeNull();
  });
});
