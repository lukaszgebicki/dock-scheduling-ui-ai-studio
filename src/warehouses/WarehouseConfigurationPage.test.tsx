import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { WarehouseConfigurationPage } from './WarehouseConfigurationPage';

afterEach(cleanup);

function renderPage(
  actorId: DemoActorId = 'system-administrator',
  warehouseId = 'nowy-kisielin-distribution-center',
) {
  render(
    <DemoDomainProvider initialActorId={actorId}>
      <MemoryRouter initialEntries={[`/warehouses/${warehouseId}/configuration`]}>
        <Routes>
          <Route
            path="/warehouses/:warehouseId/configuration"
            element={<WarehouseConfigurationPage />}
          />
          <Route path="/warehouses" element={<h1>Warehouses overview</h1>} />
        </Routes>
      </MemoryRouter>
    </DemoDomainProvider>,
  );
}

describe('WarehouseConfigurationPage', () => {
  it('renders the canonical settings and the System Administrator global catalog', () => {
    renderPage();

    expect(screen.getByRole('heading', {
      name: 'Configure Nowy Kisielin Distribution Center',
      level: 1,
    })).not.toBeNull();
    expect(screen.getByLabelText('Timezone')).toHaveProperty('value', 'Europe/Warsaw');
    expect(screen.getByLabelText('Concurrent vehicle capacity')).toHaveProperty('value', '4');
    expect(screen.getByRole('group', { name: 'Global critical-rule catalog' })).not.toBeNull();
    expect(screen.getByText('Published changes stay in demo memory only and reset on reload.'))
      .not.toBeNull();
  });

  it('adds a dock and reasoned block, then publishes auditable local configuration', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('New dock name'), { target: { value: 'NK-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add dock' }));
    expect(screen.getByText('NK-02')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Dock leveller inspection' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(screen.getByText(/Dock leveller inspection/)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Publish configuration' }));

    expect((await screen.findByRole('status')).textContent)
      .toContain('Configuration published in local demo state.');
    await waitFor(() => {
      expect(screen.getByText('2 recorded changes.')).not.toBeNull();
    });
  });

  it('requires a reason before adding an administrative exception', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));

    expect(screen.getByRole('alert').textContent).toContain('Enter a reason for the block.');
    expect(screen.queryByText('Maintenance:')).toBeNull();
  });

  it('lets the administrator select a block target, all-day mode and recurring weekdays', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('New dock name'), { target: { value: 'NK-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add dock' }));
    fireEvent.change(screen.getByLabelText('Block scope'), { target: { value: 'dock' } });
    const target = screen.getByLabelText('Block target') as HTMLSelectElement;
    expect(Array.from(target.options).map((option) => option.textContent)).toContain('NK-02');
    fireEvent.change(target, {
      target: { value: 'nowy-kisielin-distribution-center-nk-02' },
    });
    fireEvent.click(screen.getByLabelText('All day'));
    expect(screen.queryByLabelText('Starts')).toBeNull();

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Recurring schedule'));
    const weekdays = screen.getByRole('group', { name: 'Recurring weekdays' });
    const monday = within(weekdays).getByLabelText('Monday');
    fireEvent.click(monday);
    expect(monday).toHaveProperty('checked', false);
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Recurring scoped maintenance' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(screen.getByText(/Recurring scoped maintenance/)).not.toBeNull();
  });

  it('reports invalid block intervals and incompatible global catalog changes in the form', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Invalid interval' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add block' }));
    expect(screen.getByRole('alert').textContent)
      .toContain('Block start time must be earlier than end time.');

    const globalCatalog = screen.getByRole('group', { name: 'Global critical-rule catalog' });
    fireEvent.click(within(globalCatalog).getByLabelText('adr'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish configuration' }));
    expect(screen.getByRole('alert').textContent)
      .toContain('Remove inactive warehouse rules before publishing the global catalog.');
  });

  it('lets the assigned Warehouse Administrator configure only the assigned warehouse', () => {
    const { unmount } = render(
      <DemoDomainProvider initialActorId="warehouse-administrator">
        <MemoryRouter initialEntries={['/warehouses/nowy-kisielin-distribution-center/configuration']}>
          <Routes>
            <Route
              path="/warehouses/:warehouseId/configuration"
              element={<WarehouseConfigurationPage />}
            />
          </Routes>
        </MemoryRouter>
      </DemoDomainProvider>,
    );

    expect(screen.getByRole('heading', {
      name: 'Configure Nowy Kisielin Distribution Center',
    })).not.toBeNull();
    expect(screen.queryByRole('group', { name: 'Global critical-rule catalog' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Warehouse Administrators' })).toBeNull();
    unmount();

    renderPage('warehouse-administrator', 'zielona-gora-plant');
    expect(screen.getByRole('heading', { name: 'Warehouses overview' })).not.toBeNull();
  });
});
