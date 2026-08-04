// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppointmentWorkspaceProvider, useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  canViewAppointment,
  getDemoActor,
  type DemoActorId,
} from '../demoDomain/demoDomain';
import { StandingAppointmentsPage } from './StandingAppointmentsPage';
import {
  standingScopeChoices,
  type StandingScopeChoice,
} from './standingAppointmentDomain';

const sourceRecords = createInitialAppointmentWorkspaceState().records;

function choicesFor(actorId: DemoActorId): readonly StandingScopeChoice[] {
  const actor = getDemoActor(actorId);
  const visibleRecords = sourceRecords.filter((record) => canViewAppointment(actor, record));
  return standingScopeChoices(visibleRecords, actor);
}

function requireChoice(
  choice: StandingScopeChoice | undefined,
  message: string,
): StandingScopeChoice {
  if (!choice) throw new Error(message);
  return choice;
}

const warehouseAdminChoices = choicesFor('warehouse-administrator');
const warehouseAdminConflictChoice = requireChoice(
  warehouseAdminChoices.find((choice) => sourceRecords.some((record) =>
    record.supplierOrganizationId === choice.supplierOrganizationId
    && record.warehouseId === choice.warehouseId
    && record.plannedDate === '2026-08-10'
    && record.plannedTime === '08:00')),
  'Warehouse Administrator must have a visible choice with the default conflict fixture.',
);
const supplierAdminChoice = requireChoice(
  choicesFor('supplier-administrator')[0],
  'Supplier Administrator must have at least one visible standing scope choice.',
);
const warehouseAdminOnlyChoice = requireChoice(
  warehouseAdminChoices.find((choice) =>
    choice.supplierOrganizationId !== supplierAdminChoice.supplierOrganizationId),
  'Warehouse Administrator must have a choice outside Supplier Administrator scope.',
);

function eligibilityLabel(choice: StandingScopeChoice): string {
  return `Standing eligible ${choice.supplierName} at ${choice.warehouseName}`;
}

function renderPage(actorId: DemoActorId = 'warehouse-administrator') {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId={actorId}>
        <AppointmentWorkspaceProvider>
          <StandingAppointmentsPage />
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function SwitchActor({ actorId }: { actorId: DemoActorId }) {
  const { setActiveActorId } = useDemoDomain();
  return <button type="button" onClick={() => setActiveActorId(actorId)}>Switch standing actor</button>;
}

function RecordProbe() {
  const { records } = useAppointmentWorkspace();
  return <output aria-label="Standing source records">{JSON.stringify(records)}</output>;
}

function eligibilitySection(): HTMLElement {
  return screen.getByRole('heading', { name: 'Scoped standing eligibility' }).closest('section')!;
}

function createWarehouseAdminPreview() {
  fireEvent.change(screen.getByLabelText('Standing scope'), {
    target: { value: warehouseAdminConflictChoice.key },
  });
  fireEvent.click(screen.getByRole('checkbox', {
    name: eligibilityLabel(warehouseAdminConflictChoice),
  }));
  fireEvent.click(screen.getByRole('button', { name: 'Create local series preview' }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('StandingAppointmentsPage', () => {
  it('starts eligibility disabled and blocks preview until the scoped pair is locally eligible', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Standing appointment series' })).toBeDefined();
    fireEvent.change(screen.getByLabelText('Standing scope'), {
      target: { value: warehouseAdminConflictChoice.key },
    });
    const eligibleChoice = screen.getByRole('checkbox', {
      name: eligibilityLabel(warehouseAdminConflictChoice),
    });
    expect(eligibleChoice).toHaveProperty('checked', false);
    expect(eligibleChoice).toHaveProperty('disabled', false);

    fireEvent.click(screen.getByRole('button', { name: 'Create local series preview' }));
    expect(screen.getByRole('alert').textContent).toContain('not locally eligible');
    expect(screen.queryByRole('heading', { name: 'Occurrence preview' })).toBeNull();

    fireEvent.click(eligibleChoice);
    expect(eligibleChoice).toHaveProperty('checked', true);
    expect(screen.getByRole('status').textContent).toContain('Supplier configuration was not updated');
    fireEvent.click(screen.getByRole('button', { name: 'Create local series preview' }));
    expect(screen.getByRole('heading', { name: 'Occurrence preview' })).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('No appointment or capacity hold was created');
  });

  it('generates deterministic occurrence cards with independent readiness and conflict evidence', () => {
    renderPage();
    createWarehouseAdminPreview();
    const list = screen.getByRole('list', { name: 'Standing appointment occurrences' });
    const cards = within(list).getAllByRole('listitem');
    expect(cards).toHaveLength(4);
    expect(cards[0].textContent).toContain('2026-08-10 · 08:00');
    expect(cards[0].textContent).toContain('VISIBLE_APPOINTMENT_CONFLICT');
    expect(cards[0].textContent).toContain('CAPACITY_NOT_RESERVED');
    expect(cards[0].textContent).toContain('STANDARD_APPROVAL_PENDING');
    expect(cards[0].textContent).toContain('ILLUSTRATIVE_HOLD_NOT_STARTED');
    expect(cards[1].textContent).toContain('2026-08-17 · 08:00');
    expect(cards[1].textContent).toContain('NO_VISIBLE_CONFLICT');
  });

  it('previews one occurrence exception without changing the remaining series and supports reset', () => {
    renderPage();
    createWarehouseAdminPreview();
    const list = screen.getByRole('list', { name: 'Standing appointment occurrences' });
    let cards = within(list).getAllByRole('listitem');
    fireEvent.click(within(cards[0]).getByRole('button', { name: 'Preview cancel occurrence' }));
    cards = within(list).getAllByRole('listitem');
    expect(cards[0].textContent).toContain('CANCELLED_PREVIEW');
    expect(cards[1].textContent).toContain('ACTIVE_PREVIEW');
    expect(screen.getByRole('status').textContent).toContain('All other occurrences');

    fireEvent.click(within(cards[0]).getByRole('button', { name: 'Reset occurrence preview' }));
    cards = within(list).getAllByRole('listitem');
    expect(cards[0].textContent).toContain('ACTIVE_PREVIEW');

    fireEvent.click(within(cards[0]).getByRole('button', { name: 'Preview edit time +15 minutes' }));
    cards = within(list).getAllByRole('listitem');
    expect(cards[0].textContent).toContain('2026-08-10 · 08:15');
    expect(cards[0].textContent).toContain('EDITED_TIME_PREVIEW');
    expect(cards[1].textContent).toContain('2026-08-17 · 08:00');
  });

  it('pauses, resumes and ends the local series preview with terminal controls', () => {
    renderPage();
    createWarehouseAdminPreview();
    fireEvent.click(screen.getByRole('button', { name: 'Pause preview' }));
    expect(screen.getByText(/Series state:/).textContent).toContain('PAUSED');
    expect(screen.getByRole('button', { name: 'Pause preview' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Resume preview' })).toHaveProperty('disabled', false);

    fireEvent.click(screen.getByRole('button', { name: 'Resume preview' }));
    expect(screen.getByText(/Series state:/).textContent).toContain('ACTIVE');

    fireEvent.click(screen.getByRole('button', { name: 'End preview' }));
    expect(screen.getByText(/Series state:/).textContent).toContain('ENDED');
    expect(screen.getByRole('button', { name: 'End preview' })).toHaveProperty('disabled', true);
    const occurrenceList = screen.getByRole('list', { name: 'Standing appointment occurrences' });
    const firstCard = within(occurrenceList).getAllByRole('listitem')[0];
    expect(within(firstCard).getByRole('button', { name: 'Preview cancel occurrence' }))
      .toHaveProperty('disabled', true);
  });

  it('keeps Supplier Administrator choices and preview isolated to its organization', () => {
    renderPage('supplier-administrator');
    const section = eligibilitySection();
    expect(within(section).getAllByText(supplierAdminChoice.supplierName).length).toBeGreaterThan(0);

    const otherSupplierNames = Array.from(new Set(
      sourceRecords
        .filter((record) =>
          record.supplierOrganizationId !== supplierAdminChoice.supplierOrganizationId)
        .map((record) => record.supplierName),
    ));
    for (const supplierName of otherSupplierNames) {
      expect(within(section).queryByText(supplierName)).toBeNull();
    }

    const eligible = screen.getByRole('checkbox', {
      name: eligibilityLabel(supplierAdminChoice),
    });
    fireEvent.click(eligible);
    fireEvent.click(screen.getByRole('button', { name: 'Create local series preview' }));
    expect(screen.getByText((_content, element) =>
      element?.tagName === 'P'
      && element.textContent?.includes(
        `${supplierAdminChoice.supplierName} · ${supplierAdminChoice.warehouseName} · Series state:`,
      ) === true)).toBeDefined();
    for (const supplierName of otherSupplierNames) {
      expect(screen.queryByText(supplierName)).toBeNull();
    }
    expect(screen.queryByText('EXACT_MATCH')).toBeNull();
    expect(screen.queryByText('batch-demo-1')).toBeNull();
    expect(screen.queryByText('Internal-only note')).toBeNull();
  });

  it('gives System Administrator a fixed inspection-only preview', () => {
    renderPage('system-administrator');
    expect(screen.getByText(/Inspection only/)).toBeDefined();
    for (const checkbox of screen.getAllByRole('checkbox', { name: /Standing eligible/ })) {
      expect(checkbox).toHaveProperty('disabled', true);
    }
    expect(screen.queryByRole('heading', { name: 'Series definition' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create local series preview' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Occurrence preview' })).toBeDefined();
    expect(screen.getByRole('list', { name: 'Standing appointment occurrences' })
      .querySelectorAll('li')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Pause preview' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Preview cancel occurrence' })).toBeNull();
  });

  it('resets eligibility and preview when the actor changes', () => {
    render(
      <MemoryRouter>
        <DemoDomainProvider initialActorId="warehouse-administrator">
          <AppointmentWorkspaceProvider>
            <SwitchActor actorId="supplier-administrator" />
            <StandingAppointmentsPage />
          </AppointmentWorkspaceProvider>
        </DemoDomainProvider>
      </MemoryRouter>,
    );
    createWarehouseAdminPreview();
    expect(screen.getByRole('heading', { name: 'Occurrence preview' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Switch standing actor' }));
    expect(screen.queryByRole('heading', { name: 'Occurrence preview' })).toBeNull();
    const supplierEligibility = screen.getByRole('checkbox', {
      name: eligibilityLabel(supplierAdminChoice),
    });
    expect(supplierEligibility).toHaveProperty('checked', false);
    expect(screen.queryByText(warehouseAdminOnlyChoice.supplierName)).toBeNull();
  });

  it('performs no network, browser storage or source appointment mutation', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <MemoryRouter>
        <DemoDomainProvider initialActorId="warehouse-administrator">
          <AppointmentWorkspaceProvider>
            <StandingAppointmentsPage />
            <RecordProbe />
          </AppointmentWorkspaceProvider>
        </DemoDomainProvider>
      </MemoryRouter>,
    );
    const before = screen.getByLabelText('Standing source records').textContent;
    createWarehouseAdminPreview();
    const firstCard = screen.getByRole('list', { name: 'Standing appointment occurrences' })
      .querySelector('li')!;
    fireEvent.click(within(firstCard).getByRole('button', { name: 'Preview reschedule +1 day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause preview' }));
    expect(screen.getByLabelText('Standing source records').textContent).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /approve|reject|check in|check out|assign dock|save appointment|reserve capacity/i })).toBeNull();
    expect(screen.getByText(/No timer, recurrence scheduler, background task/)).toBeDefined();
  });
});
