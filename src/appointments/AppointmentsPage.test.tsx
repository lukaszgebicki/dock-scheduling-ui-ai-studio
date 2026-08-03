// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppointmentsPage } from './AppointmentsPage';
import { AppointmentWorkspaceProvider } from './AppointmentWorkspaceProvider';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';

function renderPage(initialActorId: DemoActorId = 'system-administrator') {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId={initialActorId}>
        <AppointmentWorkspaceProvider>
          <AppointmentsPage />
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function SwitchActor({ actorId }: { actorId: DemoActorId }) {
  const { setActiveActorId } = useDemoDomain();
  return <button type="button" onClick={() => setActiveActorId(actorId)}>Switch actor</button>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function expectResultCount(text: string) {
  expect(screen.getByText((_content, element) =>
    element?.tagName === 'P' && element.textContent === text)).toBeDefined();
}

describe('AppointmentsPage', () => {
  it('renders one row per planning-aware appointment or explicit non-weekly fixture', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined();
    expectResultCount('Showing 4 of 4 appointments');
    expect(screen.getAllByText('APT-WPL-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('APT-WPL-002').length).toBeGreaterThan(0);
    expect(screen.getAllByText('APT-NW-2026-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Awaiting SKU details').length).toBeGreaterThan(0);
  });

  it('applies visible filters with AND semantics', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: 'Lifecycle status' }), { target: { value: 'CONFIRMED' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Warehouse' }), { target: { value: 'zielona-gora-plant' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Supplier' }), { target: { value: 'baltic-freight' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Planning state' }), { target: { value: 'READY' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Booking origin' }), { target: { value: 'ADMIN_ADDED' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Required action' }), { target: { value: 'none' } });
    expectResultCount('Showing 1 of 4 appointments');
    expect(screen.getAllByText('APT-WPL-002').length).toBeGreaterThan(0);
    expect(screen.queryByText('APT-WPL-001')).toBeNull();
  });

  it('supports inclusive date and missing-details filters', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Planned date from'), { target: { value: '2026-08-12' } });
    fireEvent.change(screen.getByLabelText('Planned date to'), { target: { value: '2026-08-14' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Missing details only' }));
    expectResultCount('Showing 1 of 4 appointments');
    expect(screen.getAllByText('APT-NW-2026-001').length).toBeGreaterThan(0);
  });

  it('searches approved visible fields and never matches hidden diagnostics', () => {
    renderPage();
    const search = screen.getByRole('searchbox', { name: 'Global search' });
    fireEvent.change(search, { target: { value: 'ASN-DEMO-2001' } });
    expectResultCount('Showing 1 of 4 appointments');
    expect(screen.getAllByText('APT-WPL-002').length).toBeGreaterThan(0);

    fireEvent.change(search, { target: { value: 'EXACT_MATCH' } });
    expectResultCount('Showing 0 of 4 appointments');
    expect(screen.getByRole('heading', { name: 'No appointments found' })).toBeDefined();
  });

  it('renders Supplier-safe columns and only its own organization records', () => {
    renderPage('supplier-user');
    expectResultCount('Showing 2 of 2 appointments');
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Appointment' })).toBeDefined();
    expect(within(table).queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
    expect(within(table).queryByRole('columnheader', { name: 'Planning state' })).toBeNull();
    expect(screen.getAllByText('APT-WPL-003').length).toBeGreaterThan(0);
    expect(screen.getAllByText('APT-NW-2026-001').length).toBeGreaterThan(0);
    expect(screen.queryByText('Baltic Freight')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Supplier' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Planning state' })).toBeNull();
  });

  it('provides accessible desktop and mobile detail actions', () => {
    renderPage();
    const actions = screen.getAllByRole('link', { name: /Open appointment details APT-WPL-001/ });
    expect(actions).toHaveLength(2);
    expect(actions[0].getAttribute('href')).toBe('/appointments/planning-northstar-1001');
  });

  it('supports local column selection for full internal actors only', () => {
    renderPage();
    const selector = screen.getByText('Column selector');
    fireEvent.click(selector);
    const supplierColumn = screen.getByRole('checkbox', { name: 'Column Supplier' });
    expect(supplierColumn).toHaveProperty('checked', true);
    fireEvent.click(supplierColumn);
    expect(within(screen.getByRole('table')).queryByRole('columnheader', { name: 'Supplier' })).toBeNull();

    cleanup();
    renderPage('supplier-user');
    expect(screen.queryByText('Column selector')).toBeNull();
  });

  it('saves, applies and selects a local default view while blocking duplicate names', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: 'Required action' }), { target: { value: 'required' } });
    fireEvent.change(screen.getByLabelText('Saved view name'), { target: { value: 'Needs action' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save local view' }));
    expect(screen.getByRole('status').textContent).toContain('local memory only');
    expect(screen.getByRole('option', { name: /Needs action/ })).toBeDefined();

    fireEvent.change(screen.getByLabelText('Saved view name'), { target: { value: ' needs ACTION ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save local view' }));
    expect(screen.getByRole('status').textContent).toContain('already exists');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expectResultCount('Showing 4 of 4 appointments');
    fireEvent.click(screen.getByRole('button', { name: 'Apply view' }));
    expectResultCount('Showing 3 of 4 appointments');
    fireEvent.click(screen.getByRole('button', { name: 'Set local default' }));
    expect(screen.getByRole('status').textContent).toContain('Default saved view selected');
  });

  it('shows an empty state and clears all filters', () => {
    renderPage();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Global search' }), { target: { value: 'not-found' } });
    expect(screen.getByRole('heading', { name: 'No appointments found' })).toBeDefined();
    const clearButtons = screen.getAllByRole('button', { name: 'Clear filters' });
    fireEvent.click(clearButtons[clearButtons.length - 1]);
    expectResultCount('Showing 4 of 4 appointments');
  });

  it('clears stale filters, saved views, columns and hidden data when the actor changes', () => {
    render(
      <MemoryRouter>
        <DemoDomainProvider>
          <AppointmentWorkspaceProvider>
            <SwitchActor actorId="supplier-user" />
            <AppointmentsPage />
          </AppointmentWorkspaceProvider>
        </DemoDomainProvider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Supplier' }), { target: { value: 'baltic-freight' } });
    fireEvent.change(screen.getByLabelText('Saved view name'), { target: { value: 'Internal Baltic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save local view' }));
    expectResultCount('Showing 1 of 4 appointments');

    fireEvent.click(screen.getByRole('button', { name: 'Switch actor' }));
    expectResultCount('Showing 2 of 2 appointments');
    const supplierTable = screen.getByRole('table');
    expect(within(supplierTable).queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
    expect(within(supplierTable).queryByRole('columnheader', { name: 'Planning state' })).toBeNull();
    expect(within(supplierTable).queryByRole('columnheader', { name: 'Booking origin' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Supplier' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Available saved views' }).querySelectorAll('option')).toHaveLength(1);
    expect(screen.queryByText('Baltic Freight')).toBeNull();
  });

  it('performs no network or browser-storage action', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();
    fireEvent.change(screen.getByLabelText('Saved view name'), { target: { value: 'Local only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save local view' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /approve|reject|reschedule|cancel|check in|check out|assign dock/i })).toBeNull();
  });
});
