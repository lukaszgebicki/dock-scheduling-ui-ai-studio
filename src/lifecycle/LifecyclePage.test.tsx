// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import {
  planningAppointments,
  type PlanningAppointment,
} from '../calendar/planningCalendar';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { LifecycleGuard } from './LifecycleGuard';
import { LifecyclePage } from './LifecyclePage';

function renderRoute(
  actorId: DemoActorId,
  initialAppointments: readonly PlanningAppointment[] = planningAppointments,
) {
  return render(
    <MemoryRouter initialEntries={['/appointments/lifecycle']}>
      <DemoDomainProvider initialActorId={actorId}>
        <Routes>
          <Route
            path="/appointments/lifecycle"
            element={(
              <LifecycleGuard>
                <LifecyclePage initialAppointments={initialAppointments} />
              </LifecycleGuard>
            )}
          />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
        </Routes>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function articleForPurchaseOrder(purchaseOrderNumber: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: purchaseOrderNumber });
  const article = heading.closest('article');
  if (!article) throw new Error(`Missing lifecycle article for ${purchaseOrderNumber}.`);
  return article;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('LifecyclePage', () => {
  it.each<DemoActorId>([
    'system-administrator',
    'warehouse-administrator',
    'warehouse-operator',
    'supplier-administrator',
    'supplier-user',
  ])('allows the scoped direct route for %s', (actorId) => {
    renderRoute(actorId);
    expect(screen.getByRole('heading', { name: 'Appointment lifecycle' })).toBeDefined();
  });

  it('fails closed on the direct route for Security Officer', () => {
    renderRoute('security-officer');
    expect(screen.queryByRole('heading', { name: 'Appointment lifecycle' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Appointments fallback' })).toBeDefined();
  });

  it('lets the owning Supplier submit a draft through an explicit local action', () => {
    const draftAppointments = planningAppointments.map((appointment) =>
      appointment.id === 'planning-northstar-1001'
        ? { ...appointment, appointmentStatus: 'DRAFT' }
        : appointment);
    renderRoute('supplier-administrator', draftAppointments);

    const article = articleForPurchaseOrder('PO-DEMO-1001');
    expect(within(article).getByText('Lifecycle: DRAFT')).toBeDefined();
    fireEvent.click(within(article).getByRole('button', { name: 'Submit draft appointment' }));

    expect(within(article).getByText('Lifecycle: SUBMITTED')).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('No approval or gate action was inferred');
    expect(screen.getByText(/SUBMIT · planning-northstar-1001 · DRAFT → SUBMITTED/)).toBeDefined();
  });

  it('uses routed Warehouse Administrator actions and preserves independent status categories', () => {
    renderRoute('warehouse-administrator');
    const article = articleForPurchaseOrder('PO-DEMO-1001');

    fireEvent.click(within(article).getByRole('button', { name: 'Evaluate approval mode' }));
    expect(within(article).getByText('Lifecycle: PENDING_APPROVAL')).toBeDefined();
    expect(within(article).getByText(/Approve route:/).textContent).toContain('RUN');
    expect(within(article).getByRole('button', { name: 'Approve appointment' })).toBeDefined();
    expect(within(article).getByRole('button', { name: 'Reject appointment' })).toBeDefined();
    expect(within(article).getByRole('button', { name: 'Request appointment data' })).toBeDefined();

    fireEvent.click(within(article).getByRole('button', { name: 'Request appointment data' }));
    expect(within(article).getByText('SUPPLIER_ACTION_REQUIRED')).toBeDefined();
    expect(within(article).getByText('AWAITING_DETAILS')).toBeDefined();
    expect(within(article).getByText('EXPECTED')).toBeDefined();
    expect(screen.getByText(/REQUEST_DATA · planning-northstar-1001 · PENDING_APPROVAL → PENDING_APPROVAL/)).toBeDefined();
  });

  it('turns a Supplier after-cut-off reschedule into a request without moving the slot', () => {
    renderRoute('supplier-administrator');
    const article = articleForPurchaseOrder('PO-DEMO-1001');

    fireEvent.change(screen.getByLabelText('Cut-off reference'), {
      target: { value: '2026-08-10T02:00' },
    });
    fireEvent.click(within(article).getByRole('button', { name: 'Reschedule appointment' }));

    expect(within(article).getByText('RESCHEDULE_REQUESTED')).toBeDefined();
    expect(within(article).getByText(/2026-08-10 08:00/)).toBeDefined();
    expect(screen.getByText(/REQUEST_RESCHEDULE · planning-northstar-1001/)).toBeDefined();
  });

  it('keeps late cancellation visible, releases the action surface and performs no network or storage write', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderRoute('supplier-administrator');
    const article = articleForPurchaseOrder('PO-DEMO-1001');

    fireEvent.change(screen.getByLabelText('Cut-off reference'), {
      target: { value: '2026-08-10T02:00' },
    });
    fireEvent.click(within(article).getByRole('button', { name: 'Cancel appointment' }));

    expect(within(article).getByText('Lifecycle: CANCELLED')).toBeDefined();
    expect(within(article).getByText('Yes')).toBeDefined();
    expect(within(article).queryByRole('button', { name: 'Cancel appointment' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('visible record remains');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('does not expose gate, dock, no-show or operational progression actions', () => {
    renderRoute('system-administrator');
    expect(screen.queryByRole('button', {
      name: /check in|check out|assign dock|change dock|no show|progress operation/i,
    })).toBeNull();
  });

  it('keeps Supplier organization data isolated', () => {
    renderRoute('supplier-administrator');
    expect(screen.getByRole('heading', { name: 'PO-DEMO-1001' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'PO-DEMO-2001' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'PO-DEMO-3001' })).toBeNull();
  });
});
