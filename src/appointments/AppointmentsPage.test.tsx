// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppointmentsPage } from './AppointmentsPage';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';

function renderPage(initialActorId: DemoActorId = 'system-administrator') {
  return render(
    <DemoDomainProvider initialActorId={initialActorId}>
      <AppointmentsPage />
    </DemoDomainProvider>,
  );
}

function SwitchToSecurityOfficer() {
  const { setActiveActorId } = useDemoDomain();
  return (
    <button type="button" onClick={() => setActiveActorId('security-officer')}>
      Switch to Security Officer
    </button>
  );
}

afterEach(() => cleanup());

function expectResultCount(text: string) {
  const resultText = screen.getByRole('status').textContent?.replace(/\s+/g, ' ').trim();
  expect(resultText).toBe(text);
}

describe('AppointmentsPage', () => {
  it('renders the complete appointment overview', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined();
    expectResultCount('Showing 8 of 8 appointments');
    expect(screen.getAllByText('APT-2026-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Northstar Packaging').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThan(0);
  });

  it('filters by status, warehouse and supplier with AND semantics', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Confirmed' } });
    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'zielona-gora-plant' } });
    fireEvent.change(screen.getByLabelText('Supplier'), { target: { value: 'vistula-materials' } });

    expectResultCount('Showing 2 of 8 appointments');
    expect(screen.getAllByText('APT-2026-005').length).toBeGreaterThan(0);
    expect(screen.getAllByText('APT-2026-008').length).toBeGreaterThan(0);
    expect(screen.queryByText('APT-2026-001')).toBeNull();
  });

  it('searches by reference, supplier and warehouse', () => {
    renderPage();

    const search = screen.getByLabelText('Search');
    fireEvent.change(search, { target: { value: 'APT-2026-006' } });
    expectResultCount('Showing 1 of 8 appointments');
    expect(screen.getAllByText('APT-2026-006').length).toBeGreaterThan(0);

    fireEvent.change(search, { target: { value: 'Northstar Packaging' } });
    expectResultCount('Showing 3 of 8 appointments');

    fireEvent.change(search, { target: { value: 'Nowy Kisielin' } });
    expectResultCount('Showing 4 of 8 appointments');
  });

  it('shows an empty state and clears all filters', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'not-found' } });
    expect(screen.getByRole('heading', { name: 'No appointments found' })).toBeDefined();

    const clearFiltersButtons = screen.getAllByRole('button', { name: 'Clear filters' });
    expect(clearFiltersButtons).toHaveLength(2);
    fireEvent.click(clearFiltersButtons[1]);

    expectResultCount('Showing 8 of 8 appointments');
  });

  it('uses accessible table headings and labeled controls', () => {
    renderPage();

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Appointment' })).toBeDefined();
    expect(within(table).getByRole('columnheader', { name: 'Planned arrival' })).toBeDefined();
    expect(screen.getByLabelText('Status').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Warehouse').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Supplier').tagName).toBe('SELECT');
  });

  it('scopes a supplier user to its organization and assigned warehouses', () => {
    renderPage('supplier-user');

    expectResultCount('Showing 3 of 3 appointments');
    expect(screen.getAllByText('APT-2026-003')).toHaveLength(2);
    expect(screen.getAllByText('APT-2026-005')).toHaveLength(2);
    expect(screen.getAllByText('APT-2026-008')).toHaveLength(2);
    expect(screen.queryByText('Northstar Packaging')).toBeNull();
    expect(screen.queryByText('Baltic Freight')).toBeNull();
    expect(screen.getAllByRole('option', { name: 'Vistula Materials' })).toHaveLength(1);
  });

  it('clears out-of-scope filters when the demo actor changes', () => {
    render(
      <DemoDomainProvider>
        <SwitchToSecurityOfficer />
        <AppointmentsPage />
      </DemoDomainProvider>,
    );

    fireEvent.change(screen.getByLabelText('Warehouse'), {
      target: { value: 'zielona-gora-plant' },
    });
    fireEvent.change(screen.getByLabelText('Supplier'), {
      target: { value: 'baltic-freight' },
    });
    expectResultCount('Showing 2 of 8 appointments');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Security Officer' }));

    expect(screen.getByLabelText('Warehouse')).toHaveProperty('value', 'all');
    expect(screen.getByLabelText('Supplier')).toHaveProperty('value', 'all');
    expect(screen.queryByRole('option', { name: 'Zielona Góra Plant' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Baltic Freight' })).toBeNull();
    expectResultCount('Showing 4 of 4 appointments');
  });
});
