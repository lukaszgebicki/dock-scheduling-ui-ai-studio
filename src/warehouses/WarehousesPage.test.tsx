import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WarehousesPage } from './WarehousesPage';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage(initialActorId: DemoActorId = 'system-administrator') {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId={initialActorId}>
        <WarehousesPage />
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function getWarehouseRow(name: string) {
  const warehouseCell = screen.getByRole('cell', { name });
  const row = warehouseCell.closest('tr');

  if (!row) {
    throw new Error(`Expected the ${name} cell to be inside a table row.`);
  }

  return within(row);
}

function getMobileCard(name: string) {
  const title = screen.getByRole('heading', { name, level: 2 });
  const card = title.parentElement;

  if (!(card instanceof HTMLElement)) {
    throw new Error(`Expected the ${name} heading to be inside a mobile card.`);
  }

  return within(card);
}

function expectSummaryValue(label: string, value: string) {
  const term = screen.getByText(label, { selector: 'dt' });
  const list = term.closest('dl');

  if (!list) {
    throw new Error(`Expected ${label} to be inside a description list.`);
  }

  expect(within(list).getByText(value).textContent).toBe(value);
}

describe('WarehousesPage', () => {
  it('1. exposes the page heading, creation and configuration actions;', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Warehouses', level: 1 }).textContent).toBe('Warehouses');
    expect(screen.getByText('Manage warehouse locations available for access configuration.').textContent)
      .toBe('Manage warehouse locations available for access configuration.');
    expect(screen.getByRole('link', { name: 'Add warehouse' }).getAttribute('href')).toBe('/warehouses/new');
    expect(screen.getAllByRole('link', { name: 'Configure' }).map((link) => link.getAttribute('href')))
      .toEqual([
        '/warehouses/nowy-kisielin-distribution-center/configuration',
        '/warehouses/zielona-gora-plant/configuration',
      ]);
    expect(screen.queryByText(/^(Edit|Delete|Actions)$/i)).toBeNull();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('2. reports all four statistics with exact values;', () => {
    renderPage();

    expectSummaryValue('Total warehouses', '2');
    expectSummaryValue('Supplier organizations', '3');
    expectSummaryValue('Organization assignments', '4');
    expectSummaryValue('Unassigned warehouses', '0');
  });

  it('3. exposes both desktop records with stable IDs and organization counts;', () => {
    renderPage();

    const nowyRow = getWarehouseRow('Nowy Kisielin Distribution Center');
    expect(nowyRow.getByRole('cell', { name: 'nowy-kisielin-distribution-center' }).textContent)
      .toBe('nowy-kisielin-distribution-center');
    expect(nowyRow.getByRole('cell', { name: '2' }).textContent).toBe('2');

    const zielonaRow = getWarehouseRow('Zielona Góra Plant');
    expect(zielonaRow.getByRole('cell', { name: 'zielona-gora-plant' }).textContent).toBe('zielona-gora-plant');
    expect(zielonaRow.getByRole('cell', { name: '2' }).textContent).toBe('2');
  });

  it('4. maps the exact supplier organizations for Nowy Kisielin;', () => {
    renderPage();
    const row = getWarehouseRow('Nowy Kisielin Distribution Center');

    expect(row.getByText('Northstar Packaging').textContent).toBe('Northstar Packaging');
    expect(row.getByText('Vistula Materials').textContent).toBe('Vistula Materials');
    expect(row.queryByText('Baltic Freight')).toBeNull();
  });

  it('5. maps the exact supplier organizations for Zielona Góra;', () => {
    renderPage();
    const row = getWarehouseRow('Zielona Góra Plant');

    expect(row.getByText('Baltic Freight').textContent).toBe('Baltic Freight');
    expect(row.getByText('Vistula Materials').textContent).toBe('Vistula Materials');
    expect(row.queryByText('Northstar Packaging')).toBeNull();
  });

  it('6. renders a semantic table with the exact configuration column;', () => {
    renderPage();
    const table = screen.getByRole('table');
    const headings = within(table).getAllByRole('columnheader').map((heading) => {
      if (heading.textContent === null) {
        throw new Error('Expected every column heading to expose text content.');
      }

      return heading.textContent.trim();
    });

    expect(headings).toEqual([
      'Warehouse',
      'Stable ID',
      'Supplier organizations',
      'Organization count',
      'Configuration',
    ]);
  });

  it('7. exposes equivalent Nowy Kisielin information in its mobile card;', () => {
    renderPage();
    const card = getMobileCard('Nowy Kisielin Distribution Center');

    expect(card.getByText('nowy-kisielin-distribution-center').textContent)
      .toBe('nowy-kisielin-distribution-center');
    expect(card.getByText('Supplier organizations (2)').textContent).toBe('Supplier organizations (2)');
    expect(card.getByText('Northstar Packaging').textContent).toBe('Northstar Packaging');
    expect(card.getByText('Vistula Materials').textContent).toBe('Vistula Materials');
    expect(card.queryByText('Baltic Freight')).toBeNull();
  });

  it('8. searches by display name and removes the nonmatching record;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search warehouse name or ID'), { target: { value: 'Nowy' } });

    expect(screen.getAllByText('Nowy Kisielin Distribution Center')).toHaveLength(2);
    expect(screen.queryByText('Zielona Góra Plant')).toBeNull();
  });

  it('9. searches display names case-insensitively;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search warehouse name or ID'), { target: { value: 'zIeLoNa' } });

    expect(screen.getAllByText('Zielona Góra Plant')).toHaveLength(2);
    expect(screen.queryByText('Nowy Kisielin Distribution Center')).toBeNull();
  });

  it('10. searches by stable ID;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search warehouse name or ID'), {
      target: { value: 'nowy-kisielin-distribution-center' },
    });

    expect(screen.getAllByText('Nowy Kisielin Distribution Center')).toHaveLength(2);
    expect(screen.queryByText('Zielona Góra Plant')).toBeNull();
  });

  it('11. trims search input before filtering;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search warehouse name or ID'), {
      target: { value: '  zielona-gora-plant  ' },
    });

    expect(screen.getAllByText('Zielona Góra Plant')).toHaveLength(2);
    expect(screen.queryByText('Nowy Kisielin Distribution Center')).toBeNull();
  });

  it('12. removes all records for a nonmatching search;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search warehouse name or ID'), { target: { value: 'nonexistent' } });

    expect(screen.queryByText('Nowy Kisielin Distribution Center')).toBeNull();
    expect(screen.queryByText('Zielona Góra Plant')).toBeNull();
  });

  it('13. renders the empty state at heading level two without skipped levels;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search warehouse name or ID'), { target: { value: 'nonexistent' } });

    expect(screen.getByRole('heading', { name: 'No warehouses found', level: 2 }).textContent)
      .toBe('No warehouses found');
    expect(screen.getByText('No warehouse matches the search.').textContent).toBe('No warehouse matches the search.');
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0);
  });

  it('14. clears the search and restores both records;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search warehouse name or ID'), { target: { value: 'nonexistent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getAllByText('Nowy Kisielin Distribution Center')).toHaveLength(2);
    expect(screen.getAllByText('Zielona Góra Plant')).toHaveLength(2);
    expect(screen.queryByText('No warehouses found')).toBeNull();
  });

  it('15. exposes equivalent Zielona Góra information in its mobile card;', () => {
    renderPage();
    const card = getMobileCard('Zielona Góra Plant');

    expect(card.getByText('zielona-gora-plant').textContent).toBe('zielona-gora-plant');
    expect(card.getByText('Supplier organizations (2)').textContent).toBe('Supplier organizations (2)');
    expect(card.getByText('Baltic Freight').textContent).toBe('Baltic Freight');
    expect(card.getByText('Vistula Materials').textContent).toBe('Vistula Materials');
    expect(card.queryByText('Northstar Packaging')).toBeNull();
  });

  it('16. exposes each stable ID in both desktop and mobile presentations;', () => {
    renderPage();

    expect(screen.getAllByText('nowy-kisielin-distribution-center')).toHaveLength(2);
    expect(screen.getAllByText('zielona-gora-plant')).toHaveLength(2);
  });

  it('17. limits a warehouse administrator to the assigned warehouse and scoped Configure action;', () => {
    renderPage('warehouse-administrator');

    expect(screen.getAllByText('Nowy Kisielin Distribution Center')).toHaveLength(2);
    expect(screen.queryByText('Zielona Góra Plant')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Add warehouse' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Configure' }).getAttribute('href'))
      .toBe('/warehouses/nowy-kisielin-distribution-center/configuration');
  });
});
