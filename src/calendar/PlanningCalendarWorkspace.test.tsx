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
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  confirmNonWeeklyBooking,
  emptyNonWeeklyBookingInput,
  nonWeeklyBookingOptions,
  type NonWeeklyBookingInput,
} from '../nonWeeklyBooking/nonWeeklyBookingDomain';
import { PlanningCalendarPage } from './PlanningCalendarPage';

const actor = getDemoActor('supplier-administrator');
const initialState = createInitialAppointmentWorkspaceState();
const option = nonWeeklyBookingOptions(actor, initialDemoConfiguration)[0];

const liveInput: NonWeeklyBookingInput = {
  ...emptyNonWeeklyBookingInput,
  warehouseId: option.warehouseId,
  flow: option.flows[0],
  referenceNumber: 'REF-CALENDAR-LIVE',
  purchaseOrderNumber: 'PO-CALENDAR-LIVE',
  palletCount: '8',
  vehicleType: 'Curtainsider',
  selectedSlotId: '2026-08-17T06:00',
  contactName: 'Calendar Supplier Contact',
  tractorRegistration: 'TR-CALENDAR-LIVE',
  documentName: 'delivery-note.pdf',
  consentConfirmed: true,
};

const liveRecord = confirmNonWeeklyBooking(
  actor,
  initialDemoConfiguration,
  initialState.records,
  liveInput,
).record!;

function PublishCalendarRecord() {
  const { addRecord } = useAppointmentWorkspace();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button type="button" onClick={() => setError(addRecord(liveRecord))}>
        Publish live calendar appointment
      </button>
      <output aria-label="Calendar publication error">{error ?? ''}</output>
    </div>
  );
}

afterEach(cleanup);

describe('PlanningCalendarPage live workspace source', () => {
  it('renders a newly confirmed visible appointment immediately in the same session', () => {
    render(
      <DemoDomainProvider initialActorId="supplier-administrator">
        <AppointmentWorkspaceProvider initialState={initialState}>
          <PublishCalendarRecord />
          <PlanningCalendarPage />
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>,
    );

    expect(screen.queryByRole('heading', { name: 'PO-CALENDAR-LIVE' })).toBeNull();
    fireEvent.click(screen.getByRole('button', {
      name: 'Publish live calendar appointment',
    }));

    expect(screen.getByLabelText('Calendar publication error').textContent).toBe('');
    expect(screen.getByRole('heading', { name: 'PO-CALENDAR-LIVE' })).toBeDefined();
    expect(screen.getByRole('heading', { name: '2026-08-17' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Week view' }));
    expect(screen.getByRole('heading', {
      name: '2026-08-17 – 2026-08-23',
    })).toBeDefined();
  });
});
