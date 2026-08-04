// @vitest-environment jsdom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AppointmentWorkspaceProvider,
  useAppointmentWorkspace,
} from '../appointments/AppointmentWorkspaceProvider';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import { getDemoActor, type DemoActorId } from '../demoDomain/demoDomain';
import {
  confirmNonWeeklyBooking,
  emptyNonWeeklyBookingInput,
  nonWeeklyBookingOptions,
  type NonWeeklyBookingInput,
} from './nonWeeklyBookingDomain';

const supplierActor = getDemoActor('supplier-administrator');
const initialState = createInitialAppointmentWorkspaceState();
const option = nonWeeklyBookingOptions(supplierActor, initialDemoConfiguration)[0];

function validInput(overrides: Partial<NonWeeklyBookingInput> = {}): NonWeeklyBookingInput {
  return {
    ...emptyNonWeeklyBookingInput,
    warehouseId: option.warehouseId,
    flow: option.flows[0],
    referenceNumber: 'REF-WORKSPACE-001',
    purchaseOrderNumber: 'PO-WORKSPACE-001',
    palletCount: '8',
    vehicleType: 'Curtainsider',
    selectedSlotId: '2026-08-17T06:00',
    contactName: 'Supplier Contact',
    tractorRegistration: 'TR-WORKSPACE-100',
    documentName: 'delivery-note.pdf',
    consentConfirmed: true,
    ...overrides,
  };
}

const confirmedRecord = confirmNonWeeklyBooking(
  supplierActor,
  initialDemoConfiguration,
  initialState.records,
  validInput(),
).record!;

function WorkspaceHarness() {
  const {
    addRecord,
    getVisibleRecord,
    visibleRecords,
  } = useAppointmentWorkspace();
  const [error, setError] = useState<string | null>(null);
  const published = getVisibleRecord(confirmedRecord.id);

  return (
    <div>
      <button type="button" onClick={() => setError(addRecord(confirmedRecord))}>
        Publish own booking
      </button>
      <button
        type="button"
        onClick={() => setError(addRecord({
          ...confirmedRecord,
          id: 'appointment-nonweekly-foreign-001',
          systemReference: 'APT-NW-FOREIGN-001',
          externalReference: 'REF-WORKSPACE-FOREIGN',
          supplierOrganizationId: 'baltic-freight',
          supplierName: 'Baltic Freight',
          carrierName: 'Baltic Freight',
        }))}
      >
        Publish foreign booking
      </button>
      <output aria-label="Workspace publication error">{error ?? ''}</output>
      <output aria-label="Visible workspace record count">{visibleRecords.length}</output>
      <output aria-label="Published booking reference">{published?.externalReference ?? ''}</output>
    </div>
  );
}

function renderHarness(actorId: DemoActorId) {
  return render(
    <DemoDomainProvider initialActorId={actorId}>
      <AppointmentWorkspaceProvider initialState={initialState}>
        <WorkspaceHarness />
      </AppointmentWorkspaceProvider>
    </DemoDomainProvider>,
  );
}

afterEach(cleanup);

describe('non-weekly booking workspace publication', () => {
  it('publishes one own-scope record to visible workspace consumers and blocks duplicates', () => {
    renderHarness('supplier-administrator');
    const initialVisibleCount = Number(screen.getByLabelText('Visible workspace record count').textContent);

    fireEvent.click(screen.getByRole('button', { name: 'Publish own booking' }));
    expect(screen.getByLabelText('Workspace publication error').textContent).toBe('');
    expect(screen.getByLabelText('Visible workspace record count').textContent)
      .toBe(String(initialVisibleCount + 1));
    expect(screen.getByLabelText('Published booking reference').textContent)
      .toBe('REF-WORKSPACE-001');

    fireEvent.click(screen.getByRole('button', { name: 'Publish own booking' }));
    expect(screen.getByLabelText('Workspace publication error').textContent)
      .toBe('This local standard booking is already present in the workspace.');
    expect(screen.getByLabelText('Visible workspace record count').textContent)
      .toBe(String(initialVisibleCount + 1));
  });

  it('rejects another Supplier organization and internal actors fail closed', () => {
    const supplierRender = renderHarness('supplier-administrator');
    fireEvent.click(screen.getByRole('button', { name: 'Publish foreign booking' }));
    expect(screen.getByLabelText('Workspace publication error').textContent)
      .toBe('The active actor cannot add this appointment to the workspace.');
    supplierRender.unmount();

    renderHarness('system-administrator');
    fireEvent.click(screen.getByRole('button', { name: 'Publish own booking' }));
    expect(screen.getByLabelText('Workspace publication error').textContent)
      .toBe('The active actor cannot add this appointment to the workspace.');
    expect(screen.getByLabelText('Published booking reference').textContent).toBe('');
  });
});
