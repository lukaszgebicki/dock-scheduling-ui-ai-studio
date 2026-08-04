// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router';
import {
  AppointmentWorkspaceProvider,
  useAppointmentWorkspace,
} from '../appointments/AppointmentWorkspaceProvider';
import {
  createInitialAppointmentWorkspaceState,
  type AppointmentWorkspaceState,
} from '../appointments/appointmentWorkspace';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { DemoRouteGuard } from '../demoDomain/DemoRouteGuard';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { PlanningCalendarPage } from './PlanningCalendarPage';

function WorkspaceProbe() {
  const { records } = useAppointmentWorkspace();
  return <output aria-label="Calendar workspace records">{JSON.stringify(records)}</output>;
}

function SwitchActor() {
  const { setActiveActorId } = useDemoDomain();
  return (
    <button type="button" onClick={() => setActiveActorId('supplier-administrator')}>
      Switch calendar actor
    </button>
  );
}

function renderPage(
  initialActorId: DemoActorId,
  initialState: AppointmentWorkspaceState = createInitialAppointmentWorkspaceState(),
  withProbe = false,
) {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId={initialActorId}>
        <AppointmentWorkspaceProvider initialState={initialState}>
          <PlanningCalendarPage />
          {withProbe && <WorkspaceProbe />}
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function cardFor(reference: string): HTMLElement {
  const article = screen.getByRole('heading', { name: reference }).closest('article');
  if (!article) throw new Error(`Missing calendar article for ${reference}.`);
  return article;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PO planning calendar page', () => {
  it('uses the existing appointment route decision and scoped workspace source', () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <DemoDomainProvider initialActorId="supplier-administrator">
          <AppointmentWorkspaceProvider>
            <Routes>
              <Route
                path="/calendar"
                element={<DemoRouteGuard route="/appointments"><PlanningCalendarPage /></DemoRouteGuard>}
              />
              <Route path="*" element={<Navigate to="/appointments" replace />} />
            </Routes>
          </AppointmentWorkspaceProvider>
        </DemoDomainProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'PO planning calendar' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'PO-DEMO-1001' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'PO-DEMO-2001' })).toBeNull();
  });

  it('exposes exactly six accessible touch-safe view controls', () => {
    renderPage('system-administrator');

    const viewGroup = screen.getByRole('group', { name: 'Calendar view' });
    const buttons = within(viewGroup).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons.every((button) => button.className.includes('min-h-11'))).toBe(true);
    expect(within(viewGroup).getByRole('button', { name: 'Week view' })
      .getAttribute('aria-pressed')).toBe('true');
    expect(viewGroup.className).toContain('overflow-x-auto');
  });

  it.each([
    ['supplier-administrator', 'day'],
    ['supplier-user', 'day'],
    ['warehouse-operator', 'day'],
    ['system-administrator', 'week'],
    ['warehouse-administrator', 'week'],
    ['security-officer', 'week'],
  ] as const)('uses the approved %s responsive default', (actorId, expectedView) => {
    renderPage(actorId);
    const root = screen.getByRole('heading', { name: 'PO planning calendar' })
      .closest('section');
    expect(root?.getAttribute('data-responsive-default-view')).toBe(expectedView);
    expect(screen.getByRole('button', {
      name: expectedView === 'day' ? 'Day view' : 'Week view',
    }).getAttribute('aria-pressed')).toBe('true');
  });

  it('renders one card per visible record and exact PO/SKU totals', () => {
    renderPage('system-administrator');

    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'PO-DEMO-2001' })).toBeDefined();
    expect(screen.getByText('3 SKU · 2100 units · 4.25 pallets')).toBeDefined();
    expect(screen.getAllByRole('heading').filter((heading) =>
      heading.textContent === 'PO-DEMO-2001')).toHaveLength(1);
  });

  it('shows Awaiting SKU details without fabricated zero quantities', () => {
    renderPage('supplier-administrator');

    expect(screen.getByText('Awaiting SKU details')).toBeDefined();
    expect(document.body.textContent).not.toContain('0 pallets');
    expect(document.body.textContent).not.toContain('0 units');
  });

  it('preserves the exact Polish keyboard-operable details action and local table overflow', () => {
    renderPage('supplier-user');

    const article = cardFor('PO-DEMO-3001');
    const action = within(article).getByRole('button', {
      name: 'Pokaż zawartość dostawy',
    });
    expect(action.tagName).toBe('BUTTON');
    expect(action.className).toContain('min-h-11');
    expect(action.className).toContain('w-full');
    action.focus();
    expect(document.activeElement).toBe(action);
    fireEvent.click(action);

    expect(action.getAttribute('aria-expanded')).toBe('true');
    expect(within(article).getByText('SKU-101')).toBeDefined();
    expect(within(article).getByText('Fragile')).toBeDefined();
    expect(article.querySelector('[data-responsive-overflow="delivery-contents"]'))
      .not.toBeNull();
  });

  it('keeps Supplier visibility inside organization scope and hides internal evidence', () => {
    renderPage('supplier-administrator');

    expect(screen.getByRole('heading', { name: 'PO-DEMO-1001' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'PO-DEMO-2001' })).toBeNull();
    expect(document.body.textContent).not.toContain('Internal import review complete');
    expect(document.body.textContent).not.toContain('batch-demo-1');
    expect(document.body.textContent).not.toContain('EXACT_MATCH');
    expect(document.body.textContent).not.toContain('Internal-only note');
  });

  it('renders all six deterministic compositions and contains desktop table overflow', () => {
    renderPage('system-administrator');

    expect(screen.getByRole('heading', { name: '2026-08-10 – 2026-08-16' }))
      .toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Day view' }));
    expect(screen.getByRole('heading', { name: '2026-08-10' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Dock view' }));
    expect(screen.getByRole('heading', { name: 'Unassigned' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Load Type view' }));
    expect(screen.getByRole('heading', { name: 'Material Delivery' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    const list = screen.getByRole('table', { name: 'Visible appointment calendar list' });
    expect(within(list).getAllByRole('row')).toHaveLength(5);
    expect(list.closest('[data-responsive-overflow="calendar-list"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Workflow view' }));
    expect(screen.getByRole('heading', {
      name: 'READY · CONFIRMED · EXPECTED · No action required',
    })).toBeDefined();
  });

  it('applies AND filters and validates date range', () => {
    renderPage('system-administrator');

    fireEvent.change(screen.getByLabelText('Planned date from'), {
      target: { value: '2026-08-11' },
    });
    fireEvent.change(screen.getByLabelText('Planned date to'), {
      target: { value: '2026-08-14' },
    });
    fireEvent.change(screen.getByLabelText('Warehouse'), {
      target: { value: 'nowy-kisielin-distribution-center' },
    });
    fireEvent.change(screen.getByLabelText('Delivery type'), {
      target: { value: 'Material Delivery' },
    });

    expect(screen.getByText('1 visible appointment')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'PO-DEMO-3001' })).toBeDefined();
    fireEvent.change(screen.getByLabelText('Planned date from'), {
      target: { value: '2026-08-15' },
    });
    expect(screen.getByRole('alert').textContent)
      .toContain('Planned date from must not be after planned date to.');
  });

  it('renders newly supplied local workspace records', () => {
    const initial = createInitialAppointmentWorkspaceState();
    const seed = initial.records[0];
    const nextState: AppointmentWorkspaceState = {
      ...initial,
      records: [...initial.records, {
        ...seed,
        id: 'calendar-local-operator-record',
        systemReference: 'APT-CALENDAR-LOCAL',
        externalReference: 'REF-CALENDAR-LOCAL',
        purchaseOrderNumber: 'PO-CALENDAR-LOCAL',
        plannedDate: '2026-08-17',
        plannedTime: '06:00',
        bookingOrigin: 'ADMIN_ADDED',
        supplierOrganizationId: 'vistula-materials',
        supplierName: 'Vistula Materials',
        warehouseId: 'nowy-kisielin-distribution-center',
        warehouseName: 'Nowy Kisielin Distribution Center',
      }],
    };

    renderPage('system-administrator', nextState);
    expect(screen.getByRole('heading', { name: 'PO-CALENDAR-LOCAL' })).toBeDefined();
    expect(screen.getByRole('heading', { name: '2026-08-17 – 2026-08-23' }))
      .toBeDefined();
  });

  it('resets view, filters and expansion to the new actor responsive default', () => {
    render(
      <MemoryRouter>
        <DemoDomainProvider initialActorId="system-administrator">
          <AppointmentWorkspaceProvider>
            <SwitchActor />
            <PlanningCalendarPage />
          </AppointmentWorkspaceProvider>
        </DemoDomainProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    fireEvent.change(screen.getByLabelText('Warehouse'), {
      target: { value: 'zielona-gora-plant' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż zawartość dostawy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch calendar actor' }));

    expect(screen.getByRole('button', { name: 'Day view' })
      .getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Warehouse')).toHaveProperty('value', 'all');
    expect(screen.getByText('1 visible appointment')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'PO-DEMO-1001' })).toBeDefined();
    expect(screen.queryByText('PO-DEMO-2001')).toBeNull();
  });

  it('presentation interactions make no network, storage or workspace mutation', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage('system-administrator', createInitialAppointmentWorkspaceState(), true);
    const before = screen.getByLabelText('Calendar workspace records').textContent;

    fireEvent.click(screen.getByRole('button', { name: 'Day view' }));
    fireEvent.change(screen.getByLabelText('Delivery type'), {
      target: { value: 'Material Delivery' },
    });
    fireEvent.click(screen.getAllByRole('button', {
      name: 'Pokaż zawartość dostawy',
    })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear calendar filters' }));

    expect(screen.getByLabelText('Calendar workspace records').textContent).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
