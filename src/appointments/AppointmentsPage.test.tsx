// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppointmentsPage } from './AppointmentsPage';

afterEach(() => cleanup());

describe('AppointmentsPage', () => {
  it('renders the operational overview with accessible controls and table headings', () => {
    render(<AppointmentsPage />);

    expect(screen.getByRole('heading', { name: 'Appointments', level: 1 })).toBeDefined();
    expect(screen.getByLabelText('Search').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Status').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Warehouse').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Supplier').tagName).toBe('SELECT');

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Appointment' })).toBeDefined();
    expect(within(table).getByRole('columnheader', { name: 'Planned arrival' })).toBeDefined();
  });

  it('applies filters, shows an empty state and clears them', () => {
    render(<AppointmentsPage />);

    const status = screen.getByLabelText('Status') as HTMLSelectElement;
    const warehouse = screen.getByLabelText('Warehouse') as HTMLSelectElement;
    const supplier = screen.getByLabelText('Supplier') as HTMLSelectElement;

    fireEvent.change(status, { target: { value: 'Confirmed' } });
    fireEvent.change(warehouse, { target: { value: 'zielona-gora-plant' } });
    fireEvent.change(supplier, { target: { value: 'vistula-materials' } });

    expect(status.value).toBe('Confirmed');
    expect(warehouse.value).toBe('zielona-gora-plant');
    expect(supplier.value).toBe('vistula-materials');

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'not-found' } });
    expect(screen.getByRole('heading', { name: 'No appointments found' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(status.value).toBe('all');
    expect(warehouse.value).toBe('all');
    expect(supplier.value).toBe('all');
    expect(screen.queryByRole('heading', { name: 'No appointments found' })).toBeNull();
  });
});
