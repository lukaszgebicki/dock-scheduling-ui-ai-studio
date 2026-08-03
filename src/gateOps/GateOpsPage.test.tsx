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
import { planningAppointments } from '../calendar/planningCalendar';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import {
  demoUsers,
  type DemoActorId,
  type DemoUser,
} from '../demoDomain/demoDomain';
import type { GateAppointmentSeed } from './gateOps';
import { GateOpsGuard } from './GateOpsGuard';
import { GateOpsPage } from './GateOpsPage';

const activeSecurityWorkflowUsers: readonly DemoUser[] = demoUsers.map((user) =>
  user.id === 'u-4'
    ? { ...user, status: 'Active', lastActive: 'Active Security test fixture' }
    : user);

const confirmedSecuritySeeds: readonly GateAppointmentSeed[] = [
  {
    ...planningAppointments[0],
    appointmentStatus: 'CONFIRMED',
    operationalStatus: 'EXPECTED',
    changeStatus: 'NO_CHANGE_REQUEST',
    flow: 'Material Delivery',
  },
  {
    ...planningAppointments[2],
    appointmentStatus: 'CONFIRMED',
    operationalStatus: 'EXPECTED',
    changeStatus: 'NO_CHANGE_REQUEST',
    flow: 'Material Delivery',
  },
  {
    ...planningAppointments[0],
    id: 'outside-security-week',
    plannedDate: '2026-08-17',
    appointmentStatus: 'CONFIRMED',
    operationalStatus: 'EXPECTED',
    changeStatus: 'NO_CHANGE_REQUEST',
    flow: 'Material Delivery',
  },
];

function renderRoute(
  actorId: DemoActorId,
  workflowUsers: readonly DemoUser[] = demoUsers,
  initialSeeds?: readonly GateAppointmentSeed[],
) {
  return render(
    <MemoryRouter initialEntries={['/gate-operations']}>
      <DemoDomainProvider
        initialActorId={actorId}
        initialWorkflowUsers={workflowUsers}
      >
        <Routes>
          <Route path="/gate-operations" element={(
            <GateOpsGuard>
              <GateOpsPage initialSeeds={initialSeeds} />
            </GateOpsGuard>
          )} />
          <Route path="/appointments" element={<h1>Appointments fallback</h1>} />
          <Route path="/users" element={<h1>Users fallback</h1>} />
        </Routes>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function renderActiveSecurityRoute(initialSeeds?: readonly GateAppointmentSeed[]) {
  return renderRoute('security-officer', activeSecurityWorkflowUsers, initialSeeds);
}

function articleFor(po: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: po });
  const article = heading.closest('article');
  if (!article) throw new Error(`Missing gate article for ${po}.`);
  return article;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GateOpsPage', () => {
  it.each<DemoActorId>([
    'warehouse-operator',
    'warehouse-administrator',
  ])('allows a routed direct route for %s', (actorId) => {
    renderRoute(actorId);
    expect(screen.getByRole('heading', { name: 'Gate operations' })).toBeDefined();
  });

  it('does not fabricate confirmed lifecycle evidence for active Security', () => {
    renderActiveSecurityRoute();
    expect(screen.getByRole('heading', { name: 'Gate operations' })).toBeDefined();
    expect(screen.getByText('Search result count: 0')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Check in appointment' })).toBeNull();
  });

  it.each<DemoActorId>([
    'security-officer',
    'system-administrator',
    'supplier-administrator',
    'supplier-user',
  ])('fails closed on the direct route for unavailable or unauthorized actor %s', (actorId) => {
    renderRoute(actorId);
    expect(screen.queryByRole('heading', { name: 'Gate operations' })).toBeNull();
    expect(screen.getByRole('heading', { name: /fallback/i })).toBeDefined();
  });

  it('limits active Security to the assigned workweek and gate-safe fields', () => {
    renderActiveSecurityRoute(confirmedSecuritySeeds);
    expect(screen.getByText('Search result count: 2')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'PO-DEMO-1001' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'PO-DEMO-3001' })).toBeDefined();
    expect(screen.queryByText('outside-security-week')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'PO-DEMO-2001' })).toBeNull();
    expect(screen.queryByText('Internal import review complete')).toBeNull();
    expect(screen.queryByText('EXACT_MATCH')).toBeNull();
    expect(screen.queryByText('batch-demo-1')).toBeNull();
  });

  it('uses exact search and never fuzzy-matches', () => {
    renderRoute('warehouse-operator');
    expect(screen.getByText('Search result count: 1')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Exact gate search'), {
      target: { value: 'baltic freight group' },
    });
    expect(screen.getByText('Search result count: 0')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Exact gate search'), {
      target: { value: ' PO-DEMO-2001 ' },
    });
    expect(screen.getByText('Search result count: 1')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'PO-DEMO-2001' })).toBeDefined();
  });

  it('lets active Security check in a separately confirmed fixture with RUN routing', () => {
    renderActiveSecurityRoute(confirmedSecuritySeeds);
    const article = articleFor('PO-DEMO-1001');
    expect(within(article).getByText((_content, element) =>
      element?.tagName === 'P'
      && element.textContent?.includes('Check-in route: RUN') === true)).toBeDefined();

    fireEvent.click(within(article).getByRole('button', { name: 'Check in appointment' }));
    const checkedInArticle = articleFor('PO-DEMO-1001');
    expect(within(checkedInArticle).getByText('Operational: CHECKED_IN')).toBeDefined();
    expect(within(checkedInArticle).getByText('ON_TIME')).toBeDefined();
    expect(within(checkedInArticle).getByText('CONFIRMED')).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('Lifecycle, slot and Supplier-origin registrations were preserved');
  });

  it('lets the routed Warehouse Operator complete the exact delegated gate sequence', () => {
    renderRoute('warehouse-operator');
    fireEvent.change(screen.getByLabelText('Arrival timestamp'), {
      target: { value: '2026-08-11T10:00' },
    });
    fireEvent.change(screen.getByLabelText('Gate tractor registration'), {
      target: { value: 'TR-210' },
    });
    fireEvent.change(screen.getByLabelText('Gate trailer or container registration'), {
      target: { value: 'TRL-220' },
    });
    fireEvent.click(within(articleFor('PO-DEMO-2001')).getByRole('button', { name: 'Check in appointment' }));

    const dockId = initialDemoConfiguration.warehouses[1].docks[0].id;
    const dockSelect = screen.getByLabelText('Explicit dock') as HTMLSelectElement;
    fireEvent.change(dockSelect, { target: { value: dockId } });
    fireEvent.click(within(articleFor('PO-DEMO-2001')).getByRole('button', { name: 'Assign selected dock' }));
    expect(screen.getByRole('status').textContent).toContain('Dock assigned locally');

    fireEvent.click(within(articleFor('PO-DEMO-2001')).getByRole('button', { name: 'Move to assigned dock' }));
    fireEvent.click(within(articleFor('PO-DEMO-2001')).getByRole('button', { name: 'Start unloading' }));
    fireEvent.click(within(articleFor('PO-DEMO-2001')).getByRole('button', { name: 'Complete operation' }));
    fireEvent.click(within(articleFor('PO-DEMO-2001')).getByRole('button', { name: 'Check out appointment' }));

    expect(within(articleFor('PO-DEMO-2001')).getByText('Operational: CHECKED_OUT')).toBeDefined();
    expect(screen.getByText(/CHECK_OUT · planning-baltic-2001 · COMPLETED → CHECKED_OUT · DELEGATE/)).toBeDefined();
  });

  it('requires human confirmation before No Show and leaves the record visible', () => {
    renderRoute('warehouse-operator');
    const article = articleFor('PO-DEMO-2001');
    expect(within(article).getByText('Operational: EXPECTED')).toBeDefined();
    fireEvent.click(within(article).getByRole('button', { name: 'Confirm No Show' }));
    const noShowArticle = articleFor('PO-DEMO-2001');
    expect(within(noShowArticle).getByText('Operational: NO_SHOW')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'PO-DEMO-2001' })).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('record remains visible');
  });

  it('preserves Supplier registrations when Security corrects gate-observed evidence', () => {
    renderActiveSecurityRoute(confirmedSecuritySeeds);
    fireEvent.change(screen.getByLabelText('Gate tractor registration'), { target: { value: 'GATE-TR-9' } });
    fireEvent.change(screen.getByLabelText('Gate trailer or container registration'), { target: { value: 'GATE-TRL-9' } });
    fireEvent.click(within(articleFor('PO-DEMO-1001')).getByRole('button', { name: 'Correct gate registration' }));

    const correctedArticle = articleFor('PO-DEMO-1001');
    expect(within(correctedArticle).getByText('TR-100')).toBeDefined();
    expect(within(correctedArticle).getByText('GATE-TR-9')).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('Supplier-origin values remain immutable');
  });

  it('creates an unannounced PENDING_DECISION record without slot, dock, capacity or lifecycle', () => {
    renderActiveSecurityRoute();
    fireEvent.click(screen.getByRole('button', { name: 'Create pending-decision visit' }));
    expect(screen.getByText(/PO-UNANNOUNCED-1 · PENDING_DECISION · no slot\/dock\/capacity\/lifecycle/)).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('no slot, dock, capacity or lifecycle status');
  });

  it('performs no network, storage, lifecycle approval or cancellation action', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderActiveSecurityRoute(confirmedSecuritySeeds);
    fireEvent.change(screen.getByLabelText('Gate tractor registration'), { target: { value: 'LOCAL-ONLY' } });
    fireEvent.change(screen.getByLabelText('Gate trailer or container registration'), { target: { value: 'LOCAL-TRAILER' } });
    fireEvent.click(within(articleFor('PO-DEMO-1001')).getByRole('button', { name: 'Correct gate registration' }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /approve|reject|reschedule|cancel|restore/i })).toBeNull();
    expect(screen.getByText(/Blocked: operator-created appointment requires a reusable lifecycle approval handoff/)).toBeDefined();
  });
});
