import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { SupplierConfigurationPage } from './SupplierConfigurationPage';

afterEach(cleanup);

function DisableWarehouseFlows() {
  const { configuration, publishWarehouse } = useDemoDomain();
  const warehouse = configuration.warehouses[0];
  return (
    <button
      type="button"
      onClick={() => publishWarehouse({ ...warehouse, availableFlows: [] })}
    >
      Disable warehouse flows
    </button>
  );
}

function renderPage(organizationId = 'northstar-packaging') {
  render(
    <DemoDomainProvider>
      <MemoryRouter initialEntries={[`/supplier-organizations/${organizationId}/configuration`]}>
        <Routes>
          <Route
            path="/supplier-organizations/:supplierOrganizationId/configuration"
            element={<SupplierConfigurationPage />}
          />
          <Route
            path="/supplier-organizations"
            element={<h1>Supplier organizations overview</h1>}
          />
        </Routes>
      </MemoryRouter>
    </DemoDomainProvider>,
  );
}

describe('SupplierConfigurationPage', () => {
  it('renders assignments, allowed flows and truthful consumer output', () => {
    renderPage();

    expect(screen.getByRole('heading', {
      name: 'Configure Northstar Packaging',
      level: 1,
    })).not.toBeNull();
    expect(screen.getByLabelText('Nowy Kisielin Distribution Center')).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.getByLabelText('Material Delivery')).toHaveProperty('checked', true);
    expect(screen.getByText('Available')).not.toBeNull();
  });

  it('requires and records an explicit reason before auto approval weakens ADR', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Supplier approval mode'), {
      target: { value: 'auto' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish supplier configuration' }));
    expect(screen.getByRole('alert').textContent)
      .toContain('Auto approval requires an explicit override reason');

    fireEvent.click(screen.getByLabelText('Authorize critical-rule override'));
    fireEvent.change(screen.getByLabelText('Override reason'), {
      target: { value: 'Approved ADR carrier controls' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish supplier configuration' }));

    expect((await screen.findByRole('status')).textContent)
      .toContain('Supplier configuration published in local demo state.');
    await waitFor(() => {
      const recordedChanges = screen.getByText('Recorded changes').nextElementSibling;
      if (!recordedChanges) throw new Error('Expected the recorded changes value.');
      expect(recordedChanges.textContent).toBe('2');
    });
  });

  it('publishes blocked status as an explicit later-booking restriction', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Supplier status'), {
      target: { value: 'blocked' },
    });
    expect(screen.getByText(
      'Later booking consumers must reject new booking and reschedule attempts.',
    )).not.toBeNull();
    const bookingOutput = screen.getByText('Booking output').nextElementSibling;
    if (!bookingOutput) throw new Error('Expected the booking output value.');
    expect(bookingOutput.textContent).toBe('Blocked');

    fireEvent.click(screen.getByRole('button', { name: 'Publish supplier configuration' }));
    expect(await screen.findByRole('status')).not.toBeNull();
  });

  it('uses the canonical booking contract when no warehouse accepts an allowed flow', () => {
    render(
      <DemoDomainProvider>
        <DisableWarehouseFlows />
        <MemoryRouter initialEntries={[
          '/supplier-organizations/northstar-packaging/configuration',
        ]}>
          <Routes>
            <Route
              path="/supplier-organizations/:supplierOrganizationId/configuration"
              element={<SupplierConfigurationPage />}
            />
          </Routes>
        </MemoryRouter>
      </DemoDomainProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Disable warehouse flows' }));
    const bookingOutput = screen.getByText('Booking output').nextElementSibling;
    if (!bookingOutput) throw new Error('Expected the booking output value.');
    expect(bookingOutput.textContent).toBe('Blocked');
    expect(screen.getByText('No assigned warehouse accepts an allowed supplier flow.'))
      .not.toBeNull();
  });

  it('redirects an unknown organization to the scoped overview', () => {
    renderPage('unknown-supplier');

    expect(screen.getByRole('heading', { name: 'Supplier organizations overview' })).not.toBeNull();
  });
});
