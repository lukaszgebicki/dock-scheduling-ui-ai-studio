// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppointmentsPage } from './AppointmentsPage';

afterEach(() => cleanup());

describe('AppointmentsPage', () => {
  it('renders the complete appointment overview', () => {
    render(<AppointmentsPage />);

    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('8');
    expect(screen.getAllByText('APT-2026-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Northstar Packaging').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThan(0);
  });

  it('filters by status, warehouse and supplier with AND semantics', () => {
    render(<AppointmentsPage />);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Confirmed' } });
    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'zielona-gora-plant' } });
    fireEvent.change(screen.getByLabelText('Supplier'), { target: { value: 'vistula-materials' } });

    expect(screen.getAllByText('APT-2026-005').length).toBeGreaterThan(0);
    expect(screen.getAllByText('APT-2026-008').length).toBeGreaterThan(0);
    expect(screen.queryByText('APT-2026-001')).toBeNull();
  });

  it('searches by reference and supports clearing an empty result', () => {
    render(<AppointmentsPage />);

    const search = screen.getByLabelText('Search');
    fireEvent.change(search, { target: { value: 'APT-2026-006' } });
    expect(screen.getAllByText('APT-2026-006').length).toBeGreaterThan(0);
    expect(screen.queryByText('APT-2026-001')).toBeNull();

    fireEvent.change(search, { target: { value: 'not-found' } });
    expect(screen.getByRole('heading', { name: 'No appointments found' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByText('APT-2026-001').length).toBeGreaterThan(0);
  });

  it('uses accessible table headings and labeled controls', () => {
    render(<AppointmentsPage />);

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Appointment' })).toBeDefined();
    expect(within(table).getByRole('columnheader', { name: 'Planned arrival' })).toBeDefined();
    expect(screen.getByLabelText('Status').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Warehouse').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Supplier').tagName).toBe('SELECT');
  });
});
