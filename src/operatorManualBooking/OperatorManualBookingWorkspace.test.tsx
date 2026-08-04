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
  confirmOperatorManualBooking,
  emptyOperatorManualBookingInput,
  operatorManualBookingOptions,
  type OperatorManualBookingInput,
} from './operatorManualBookingDomain';

const operator = getDemoActor('warehouse-operator');
const initialState = createInitialAppointmentWorkspaceState();
const option = operatorManualBookingOptions(operator, initialDemoConfiguration)[0];
const supplier = option.suppliers[0];

function validInput(): OperatorManualBookingInput {
  return {
    ...emptyOperatorManualBookingInput,
    warehouseId: option.warehouseId,
    supplierOrganizationId: supplier.supplierOrganizationId,
    flow: supplier.flows[0],
    referenceNumber: 'REF-OP-WORKSPACE-001',
    purchaseOrderNumber: 'PO-OP-WORKSPACE-001',
    palletCount: '8',
    vehicleType: 'Curtainsider',
    selectedSlotId: '2026-08-17T06:00',
    contactName: 'Operator Contact',
    tractorRegistration: 'TR-OP-WORKSPACE-100',
    documentName: 'delivery-note.pdf',
    sharedComment: 'Internal preparation note',
    commentVisibility: 'INTERNAL_NOTE',
    consentConfirmed: true,
  };
}

const confirmedRecord = confirmOperatorManualBooking(
  operator,
  initialDemoConfiguration,
  initialState.records,
  validInput(),
).record!;
const importedLines = initialState.records.find((record) =>
  record.skuLines.length > 0)!.skuLines;

function WorkspaceHarness() {
  const { addRecord, getVisibleRecord, visibleRecords } = useAppointmentWorkspace();
  const [error, setError] = useState<string | null>(null);
  const published = getVisibleRecord(confirmedRecord.id);

  return (
    <div>
      <button type="button" onClick={() => setError(addRecord(confirmedRecord))}>
        Publish Operator booking
      </button>
      <button
        type="button"
        onClick={() => setError(addRecord({
          ...confirmedRecord,
          id: 'appointment-operator-foreign-001',
          systemReference: 'APT-OP-FOREIGN-001',
          externalReference: 'REF-OP-FOREIGN',
          warehouseId: 'nowy-kisielin-distribution-center',
          warehouseName: 'Nowy Kisielin Distribution Center',
        }))}
      >
        Publish foreign warehouse
      </button>
      <button
        type="button"
        onClick={() => setError(addRecord({
          ...confirmedRecord,
          id: 'appointment-operator-unsafe-001',
          systemReference: 'APT-OP-UNSAFE-001',
          externalReference: 'REF-OP-UNSAFE',
          skuLines: importedLines,
        }))}
      >
        Publish unsafe imported data
      </button>
      <output aria-label="Operator publication error">{error ?? ''}</output>
      <output aria-label="Operator visible record count">{visibleRecords.length}</output>
      <output aria-label="Published Operator reference">{published?.externalReference ?? ''}</output>
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

describe('Operator manual booking workspace publication', () => {
  it('publishes one assigned safe record and blocks duplicates', () => {
    renderHarness('warehouse-operator');
    const initialVisibleCount = Number(
      screen.getByLabelText('Operator visible record count').textContent,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish Operator booking' }));
    expect(screen.getByLabelText('Operator publication error').textContent).toBe('');
    expect(screen.getByLabelText('Operator visible record count').textContent)
      .toBe(String(initialVisibleCount + 1));
    expect(screen.getByLabelText('Published Operator reference').textContent)
      .toBe('REF-OP-WORKSPACE-001');

    fireEvent.click(screen.getByRole('button', { name: 'Publish Operator booking' }));
    expect(screen.getByLabelText('Operator publication error').textContent)
      .toBe('This local standard booking is already present in the workspace.');
    expect(screen.getByLabelText('Operator visible record count').textContent)
      .toBe(String(initialVisibleCount + 1));
  });

  it('rejects foreign warehouse, imported payload and non-Operator actors', () => {
    const operatorRender = renderHarness('warehouse-operator');
    fireEvent.click(screen.getByRole('button', { name: 'Publish foreign warehouse' }));
    expect(screen.getByLabelText('Operator publication error').textContent)
      .toBe('The active actor cannot add this appointment to the workspace.');

    fireEvent.click(screen.getByRole('button', { name: 'Publish unsafe imported data' }));
    expect(screen.getByLabelText('Operator publication error').textContent)
      .toBe('The appointment is not a safe local Operator booking.');
    operatorRender.unmount();

    renderHarness('system-administrator');
    fireEvent.click(screen.getByRole('button', { name: 'Publish Operator booking' }));
    expect(screen.getByLabelText('Operator publication error').textContent)
      .toBe('The active actor cannot add this appointment to the workspace.');
    expect(screen.getByLabelText('Published Operator reference').textContent).toBe('');
  });
});
