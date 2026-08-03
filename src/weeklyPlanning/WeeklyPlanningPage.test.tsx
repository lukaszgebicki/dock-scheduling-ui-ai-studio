// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import {
  getWeeklyPlanningWarehouseUniverse,
  WeeklyPlanningGuard,
} from './WeeklyPlanningGuard';
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
  vi.unstubAllGlobals();
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

  it('uses the same published warehouse universe for System Administrator navigation and route access', () => {
    expect(getWeeklyPlanningWarehouseUniverse(
      'System Administrator',
      [],
      ['nowy-kisielin-distribution-center', 'zielona-gora-plant'],
    )).toEqual(['nowy-kisielin-distribution-center', 'zielona-gora-plant']);
    expect(getWeeklyPlanningWarehouseUniverse(
      'Warehouse Administrator',
      ['nowy-kisielin-distribution-center'],
      ['nowy-kisielin-distribution-center', 'zielona-gora-plant'],
    )).toEqual(['nowy-kisielin-distribution-center']);
  });

  it('requires an explicit primary-actor enrichment action, records before/after history and performs no external write', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderRoute('warehouse-administrator');

    expect(screen.getByText('No planning action has been applied.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Attach exact SKU details' }));

    expect(screen.getByRole('status').textContent).toContain('preserved');
    const historyItem = screen.getByText(/ATTACH_DETAILS/).closest('li')!;
    expect(within(historyItem).getByText('Before and after evidence')).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('exposes an accessible reasoned ambiguous-target selection without auto-attaching details', () => {
    renderRoute('warehouse-administrator');
    const selector = screen.getByLabelText('Exact target for PO-AMBIG-1') as HTMLSelectElement;
    expect(selector.options).toHaveLength(2);
    fireEvent.change(selector, { target: { value: 'planning-ambiguous-b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm exact target' }));

    expect(screen.getByRole('status').textContent).toContain('planning-ambiguous-b');
    expect(screen.getByText(/RESOLVE_AMBIGUOUS/).textContent).toContain('Reviewed local planning evidence');
    expect(screen.getAllByRole('button', { name: 'Attach exact SKU details' }).length).toBeGreaterThan(0);
  });

  it('resolves transport conflict by retaining Supplier values before separately enabling enrichment', () => {
    renderRoute('warehouse-administrator');
    expect(screen.getByText(/Supplier TR-310; imported IMPORTED-TR/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Keep Supplier transport values' }));

    expect(screen.getByRole('status').textContent).toContain('Supplier transport values were retained');
    expect(screen.getByText(/RESOLVE_TRANSPORT/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Keep Supplier transport values' })).toBeNull();
  });

  it('does not expose lifecycle, approval, gate or override actions', () => {
    renderRoute('system-administrator');
    expect(screen.queryByRole('button', { name: /approve|reject|check in|check out|override|cancel/i })).toBeNull();
  });
});
