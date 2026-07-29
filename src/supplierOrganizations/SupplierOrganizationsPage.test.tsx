import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SupplierOrganizationsPage } from './SupplierOrganizationsPage';
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
        <SupplierOrganizationsPage />
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function getOrgRow(name: string) {
  const cell = screen.getByRole('cell', { name });
  const row = cell.closest('tr');

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

describe('SupplierOrganizationsPage', () => {
  it('1. exposes the page heading and exact supporting copy;', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Supplier organizations', level: 1 }).textContent)
      .toBe('Supplier organizations');
    expect(screen.getByText('Manage supplier organizations and their inherited warehouse access.').textContent)
      .toBe('Manage supplier organizations and their inherited warehouse access.');
  });

  it('2. exposes the Add supplier organization action with the exact href;', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'Add supplier organization' }).getAttribute('href'))
      .toBe('/supplier-organizations/new');
    expect(screen.getAllByRole('link', { name: 'Configure' }).map((link) => link.getAttribute('href')))
      .toEqual([
        '/supplier-organizations/northstar-packaging/configuration',
        '/supplier-organizations/baltic-freight/configuration',
        '/supplier-organizations/vistula-materials/configuration',
      ]);
  });

  it('3. exposes no Edit, Delete, Actions or status controls;', () => {
    renderPage();

    expect(screen.queryByText(/^(Edit|Delete|Actions|Status)$/i)).toBeNull();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('4. reports all four statistics with exact values;', () => {
    renderPage();

    expectSummaryValue('Total organizations', '3');
    expectSummaryValue('Warehouse assignments', '4');
    expectSummaryValue('Multi-warehouse organizations', '1');
    expectSummaryValue('Organizations without access', '0');
  });

  it('5. exposes all three organization names and stable IDs;', () => {
    renderPage();

    expect(screen.getAllByText('Northstar Packaging').length).toBeGreaterThan(0);
    expect(screen.getAllByText('northstar-packaging').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Baltic Freight').length).toBeGreaterThan(0);
    expect(screen.getAllByText('baltic-freight').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vistula Materials').length).toBeGreaterThan(0);
    expect(screen.getAllByText('vistula-materials').length).toBeGreaterThan(0);
  });

  it('6. maps the exact Northstar Packaging warehouse access and count;', () => {
    renderPage();
    const row = getOrgRow('Northstar Packaging');

    expect(row.getByText('Nowy Kisielin Distribution Center').textContent).toBe('Nowy Kisielin Distribution Center');
    expect(row.queryByText('Zielona Góra Plant')).toBeNull();
    expect(row.getByRole('cell', { name: '1' }).textContent).toBe('1');
  });

  it('7. maps the exact Baltic Freight warehouse access and count;', () => {
    renderPage();
    const row = getOrgRow('Baltic Freight');

    expect(row.getByText('Zielona Góra Plant').textContent).toBe('Zielona Góra Plant');
    expect(row.queryByText('Nowy Kisielin Distribution Center')).toBeNull();
    expect(row.getByRole('cell', { name: '1' }).textContent).toBe('1');
  });

  it('8. maps the exact Vistula Materials two-warehouse access and count;', () => {
    renderPage();
    const row = getOrgRow('Vistula Materials');

    expect(row.getByText('Nowy Kisielin Distribution Center').textContent).toBe('Nowy Kisielin Distribution Center');
    expect(row.getByText('Zielona Góra Plant').textContent).toBe('Zielona Góra Plant');
    expect(row.getByRole('cell', { name: '2' }).textContent).toBe('2');
  });

  it('9. renders a semantic table with the exact configuration column;', () => {
    renderPage();
    const table = screen.getByRole('table');
    const headings = within(table).getAllByRole('columnheader').map((heading) => {
      if (heading.textContent === null) {
        throw new Error('Expected every column heading to expose text content.');
      }

      return heading.textContent.trim();
    });

    expect(headings).toEqual([
      'Supplier organization',
      'Stable ID',
      'Warehouse access',
      'Warehouse count',
      'Configuration',
    ]);
  });

  it('10. exposes equivalent Vistula Materials information in its mobile card;', () => {
    renderPage();
    const card = getMobileCard('Vistula Materials');

    expect(card.getByText('vistula-materials').textContent).toBe('vistula-materials');
    expect(card.getByText('Warehouse access (2)').textContent).toBe('Warehouse access (2)');
    expect(card.getByText('Nowy Kisielin Distribution Center').textContent).toBe('Nowy Kisielin Distribution Center');
    expect(card.getByText('Zielona Góra Plant').textContent).toBe('Zielona Góra Plant');
  });

  it('11. searches by display name and removes the nonmatching records;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search organization name or ID'), { target: { value: 'Northstar' } });

    expect(screen.getAllByText('Northstar Packaging').length).toBeGreaterThan(0);
    expect(screen.queryByText('Baltic Freight')).toBeNull();
    expect(screen.queryByText('Vistula Materials')).toBeNull();
  });

  it('12. searches display names case-insensitively;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search organization name or ID'), { target: { value: 'bALtIc' } });

    expect(screen.getAllByText('Baltic Freight').length).toBeGreaterThan(0);
    expect(screen.queryByText('Northstar Packaging')).toBeNull();
    expect(screen.queryByText('Vistula Materials')).toBeNull();
  });

  it('13. searches by stable ID;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search organization name or ID'), {
      target: { value: 'vistula-materials' },
    });

    expect(screen.getAllByText('Vistula Materials').length).toBeGreaterThan(0);
    expect(screen.queryByText('Northstar Packaging')).toBeNull();
    expect(screen.queryByText('Baltic Freight')).toBeNull();
  });

  it('14. trims search input before filtering and removes nonmatching records;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search organization name or ID'), {
      target: { value: '  baltic-freight  ' },
    });

    expect(screen.getAllByText('Baltic Freight').length).toBeGreaterThan(0);
    expect(screen.queryByText('Northstar Packaging')).toBeNull();
    expect(screen.queryByText('Vistula Materials')).toBeNull();
  });

  it('15. renders the empty state at heading level two without skipped levels;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search organization name or ID'), { target: { value: 'nonexistent' } });

    expect(screen.getByRole('heading', { name: 'No supplier organizations found', level: 2 }).textContent)
      .toBe('No supplier organizations found');
    expect(screen.getByText('No supplier organization matches the search.').textContent)
      .toBe('No supplier organization matches the search.');
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.queryAllByRole('heading', { level: 4 })).toHaveLength(0);
  });

  it('16. Clear search restores all three organizations;', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search organization name or ID'), { target: { value: 'nonexistent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getAllByText('Northstar Packaging').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Baltic Freight').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vistula Materials').length).toBeGreaterThan(0);
    expect(screen.queryByText('No supplier organizations found')).toBeNull();
  });

  it('17. limits a warehouse administrator to suppliers at the assigned warehouse and hides Add;', () => {
    renderPage('warehouse-administrator');

    expect(screen.getAllByText('Northstar Packaging')).toHaveLength(2);
    expect(screen.getAllByText('Vistula Materials')).toHaveLength(2);
    expect(screen.queryByText('Baltic Freight')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Add supplier organization' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Configure' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Configure organization' })).toBeNull();
  });
});
