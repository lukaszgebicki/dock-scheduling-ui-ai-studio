// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import {
  AppointmentWorkspaceProvider,
  useAppointmentWorkspace,
} from '../appointments/AppointmentWorkspaceProvider';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { OperatorManualBookingPage } from './OperatorManualBookingPage';

function WorkspaceProbe() {
  const { records } = useAppointmentWorkspace();
  return <output aria-label="Operator workspace records">{JSON.stringify(records)}</output>;
}

function SwitchActor() {
  const { setActiveActorId } = useDemoDomain();
  return (
    <button type="button" onClick={() => setActiveActorId('system-administrator')}>
      Switch internal actor
    </button>
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId="warehouse-operator">
        <AppointmentWorkspaceProvider>
          <SwitchActor />
          <OperatorManualBookingPage />
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
  fireEvent.change(screen.getByLabelText('Reference number *'), {
    target: { value: 'REF-OP-UI-001' },
  });
  fireEvent.change(screen.getByLabelText('Purchase order number *'), {
    target: { value: 'PO-OP-UI-001' },
  });
  fireEvent.change(screen.getByLabelText('Pallet count'), {
    target: { value: '8' },
  });
  fireEvent.change(screen.getByLabelText('Vehicle type *'), {
    target: { value: 'Curtainsider' },
  });
  next();
  fireEvent.click(screen.getAllByRole('radio', { name: /Available/ })[0]);
  next();
  fireEvent.change(screen.getByLabelText('Contact person *'), {
    target: { value: 'Operator Contact' },
  });
  fireEvent.change(screen.getByLabelText('Vehicle registration *'), {
    target: { value: 'TR-OP-UI-100' },
  });
  fireEvent.change(screen.getByLabelText('Document name metadata'), {
    target: { value: 'delivery-note.pdf' },
  });
  fireEvent.change(screen.getByLabelText('Comment'), {
    target: { value: 'Prepare dock before arrival' },
  });
  fireEvent.click(screen.getByLabelText(/creating this local appointment on behalf/));
  next();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('OperatorManualBookingPage', () => {
  it('completes five scoped steps and publishes one ADMIN_ADDED local record', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();

    expect(screen.getByRole('heading', { name: 'Create manual Supplier appointment' })).toBeDefined();
    expect(screen.getByLabelText('Warehouse *')).toHaveProperty(
      'value',
      'zielona-gora-plant',
    );
    expect(screen.getByLabelText('Supplier *')).toHaveProperty(
      'value',
      'baltic-freight',
    );

    next();
    expect(screen.getByText(/Published configured fields affect this form: purchase-order, vehicle-registration/)).toBeDefined();
    fireEvent.change(screen.getByLabelText('Reference number *'), {
      target: { value: 'REF-OP-UI-001' },
    });
    fireEvent.change(screen.getByLabelText('Purchase order number *'), {
      target: { value: 'PO-OP-UI-001' },
    });
    fireEvent.change(screen.getByLabelText('Pallet count'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('Vehicle type *'), {
      target: { value: 'Curtainsider' },
    });
    expect(screen.getByText('Derived visit duration: 30 minutes')).toBeDefined();
    next();

    expect(screen.getByText(/Nearest available: 2026-08-17 06:00/)).toBeDefined();
    expect(screen.getAllByText('Recommended')).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('radio', { name: /Available/ })[0]);
    next();

    fireEvent.change(screen.getByLabelText('Contact person *'), {
      target: { value: 'Operator Contact' },
    });
    fireEvent.change(screen.getByLabelText('Vehicle registration *'), {
      target: { value: 'TR-OP-UI-100' },
    });
    fireEvent.change(screen.getByLabelText('Document name metadata'), {
      target: { value: 'delivery-note.pdf' },
    });
    fireEvent.change(screen.getByLabelText('Comment'), {
      target: { value: 'Prepare dock before arrival' },
    });
    fireEvent.click(screen.getByLabelText(/creating this local appointment on behalf/));
    next();

    expect(screen.getByRole('heading', { name: 'Summary and confirmation' })).toBeDefined();
    expect(screen.getByText(/CONFIRMED — Published approval rules allow automatic confirmation/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', {
      name: 'Confirm local Operator appointment',
    }));

    expect(screen.getByRole('heading', { name: 'Manual appointment created' })).toBeDefined();
    const probe = screen.getByLabelText('Operator workspace records').textContent ?? '';
    expect(probe).toContain('REF-OP-UI-001');
    expect(probe).toContain('ADMIN_ADDED');
    expect(probe).toContain('Prepare dock before arrival');
    expect(probe.match(/REF-OP-UI-001/g)).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('validates delivery evidence before availability', () => {
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

  it('resets wizard and scoped data when actor changes', () => {
    renderPage();
    completeToSummary();
    expect(screen.getByRole('heading', { name: 'Summary and confirmation' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Switch internal actor' }));
    expect(screen.getByRole('group', {
      name: 'Warehouse, Supplier and delivery flow',
    })).toBeDefined();
    expect(screen.queryByText('REF-OP-UI-001')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Manual appointment created' })).toBeNull();
  });
});
