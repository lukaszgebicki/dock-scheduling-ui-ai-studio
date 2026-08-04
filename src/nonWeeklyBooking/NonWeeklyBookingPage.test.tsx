// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppointmentWorkspaceProvider, useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { NonWeeklyBookingPage } from './NonWeeklyBookingPage';

function WorkspaceProbe() {
  const { records } = useAppointmentWorkspace();
  return <output aria-label="Workspace booking records">{JSON.stringify(records)}</output>;
}

function SwitchSupplierActor() {
  const { setActiveActorId } = useDemoDomain();
  return <button type="button" onClick={() => setActiveActorId('supplier-user')}>Switch Supplier actor</button>;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId="supplier-administrator">
        <AppointmentWorkspaceProvider>
          <SwitchSupplierActor />
          <NonWeeklyBookingPage />
          <WorkspaceProbe />
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function next() {
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
}

function completeToSummary() {
  next();
  fireEvent.change(screen.getByLabelText('Reference number *'), { target: { value: 'REF-UI-001' } });
  fireEvent.change(screen.getByLabelText('Purchase order number *'), { target: { value: 'PO-UI-001' } });
  fireEvent.change(screen.getByLabelText('Pallet count'), { target: { value: '8' } });
  fireEvent.change(screen.getByLabelText('Vehicle type *'), { target: { value: 'Curtainsider' } });
  next();
  fireEvent.click(screen.getAllByRole('radio', { name: /Available/ })[0]);
  next();
  fireEvent.change(screen.getByLabelText('Contact person *'), { target: { value: 'Eve Northstar' } });
  fireEvent.change(screen.getByLabelText('Vehicle registration *'), { target: { value: 'TR-UI-100' } });
  fireEvent.change(screen.getByLabelText('Document name metadata'), { target: { value: 'delivery-note.pdf' } });
  fireEvent.change(screen.getByLabelText('Shared Comment'), { target: { value: 'Call before arrival' } });
  fireEvent.click(screen.getByLabelText(/I confirm the required booking consent/));
  next();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NonWeeklyBookingPage', () => {
  it('completes five configured steps and adds one visible local workspace record', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();

    expect(screen.getByRole('heading', { name: 'Create standard Supplier appointment' })).toBeDefined();
    expect(screen.getAllByRole('listitem', { current: false })).toBeDefined();

    next();
    expect(screen.getByText(/configured fields affect the form: purchase-order, vehicle-registration/)).toBeDefined();
    const beforeDraft = screen.getByLabelText('Workspace booking records').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Save local Draft preview' }));
    expect(screen.getByText(/Draft preview retained only on this page/).textContent)
      .toContain('No workspace record or capacity reservation was created');
    expect(screen.getByLabelText('Workspace booking records').textContent).toBe(beforeDraft);

    fireEvent.change(screen.getByLabelText('Reference number *'), { target: { value: 'REF-UI-001' } });
    fireEvent.change(screen.getByLabelText('Purchase order number *'), { target: { value: 'PO-UI-001' } });
    fireEvent.change(screen.getByLabelText('Pallet count'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Vehicle type *'), { target: { value: 'Curtainsider' } });
    expect(screen.getByText('Derived visit duration: 30 minutes')).toBeDefined();
    next();

    expect(screen.getByText(/Nearest available: 2026-08-17 06:00/)).toBeDefined();
    expect(screen.getAllByText('Recommended')).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('radio', { name: /Available/ })[0]);
    next();

    fireEvent.change(screen.getByLabelText('Contact person *'), { target: { value: 'Eve Northstar' } });
    fireEvent.change(screen.getByLabelText('Vehicle registration *'), { target: { value: 'TR-UI-100' } });
    fireEvent.change(screen.getByLabelText('Document name metadata'), { target: { value: 'delivery-note.pdf' } });
    fireEvent.change(screen.getByLabelText('Shared Comment'), { target: { value: 'Call before arrival' } });
    fireEvent.click(screen.getByLabelText(/I confirm the required booking consent/));
    next();

    expect(screen.getByText(/CONFIRMED — Published approval rules allow automatic confirmation/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm local standard appointment' }));

    expect(screen.getByRole('heading', { name: 'Standard appointment created' })).toBeDefined();
    expect(screen.getByText(/was added to the local workspace/).textContent)
      .toContain('was added to the local workspace');
    const probe = screen.getByLabelText('Workspace booking records').textContent ?? '';
    expect(probe).toContain('REF-UI-001');
    expect(probe).toContain('PO-UI-001');
    expect(probe).toContain('delivery-note.pdf');
    expect(probe).toContain('Call before arrival');
    expect(probe.match(/REF-UI-001/g)).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('validates each step before progressing', () => {
    renderPage();
    next();
    next();
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Reference number is required.')).toBeDefined();
    expect(within(alert).getByText('Vehicle type is required before slot selection.')).toBeDefined();
    expect(within(alert).getByText('At least one positive volume measure is required.')).toBeDefined();
    expect(within(alert).getByText('Purchase order number is required by warehouse configuration.')).toBeDefined();
    expect(screen.getByRole('group', { name: 'Delivery data' })).toBeDefined();
  });

  it('resets wizard and success state when Supplier actor changes', () => {
    renderPage();
    completeToSummary();
    expect(screen.getByRole('heading', { name: 'Summary and confirmation' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Switch Supplier actor' }));
    expect(screen.getByRole('group', { name: 'Warehouse and delivery flow' })).toBeDefined();
    expect(screen.queryByText('REF-UI-001')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Standard appointment created' })).toBeNull();
  });
});