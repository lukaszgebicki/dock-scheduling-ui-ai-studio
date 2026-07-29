// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DemoActionGuard } from './DemoActionGuard';
import { DemoDomainProvider, useDemoDomain } from './DemoDomainProvider';
import { DemoRouteGuard } from './DemoRouteGuard';
import { asWarehouseId, demoUsers, type DemoActorId } from './demoDomain';

afterEach(cleanup);

function ActorControl() {
  const { activeActor, actors, setActiveActorId } = useDemoDomain();
  return (
    <>
      <label htmlFor="actor">Actor</label>
      <select
        id="actor"
        value={activeActor.id}
        onChange={(event) => setActiveActorId(event.target.value as DemoActorId)}
      >
        {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.role}</option>)}
      </select>
      <output>{activeActor.role}</output>
    </>
  );
}

function ConfigurationControl() {
  const {
    activeActor,
    configuration,
    createWarehouseDraft,
    publishWarehouse,
    setActiveActorId,
  } = useDemoDomain();
  const id = asWarehouseId('poznan-cross-dock');
  const draft = configuration.warehouses.find((warehouse) => warehouse.id === id);
  return (
    <>
      <output aria-label="warehouse count">{configuration.warehouses.length}</output>
      <output aria-label="active warehouse IDs">{activeActor.warehouseIds.join(',')}</output>
      <button
        type="button"
        onClick={() => createWarehouseDraft(id, 'Poznan Cross Dock')}
      >
        Create draft
      </button>
      <button
        type="button"
        disabled={!draft}
        onClick={() => {
          if (draft) publishWarehouse({ ...draft, administratorUserIds: ['u-2'] });
        }}
      >
        Publish draft
      </button>
      <button
        type="button"
        onClick={() => setActiveActorId('warehouse-administrator')}
      >
        Switch actor
      </button>
    </>
  );
}

function UserScopeControl() {
  const {
    canViewUser,
    configuration,
    publishSupplier,
    setActiveActorId,
  } = useDemoDomain();
  const supplier = configuration.suppliers.find((candidate) =>
    candidate.organizationId === 'northstar-packaging');
  const supplierAdministrator = demoUsers.find((user) => user.id === 'u-5');
  if (!supplier || !supplierAdministrator) throw new Error('Expected demo supplier user.');
  return (
    <>
      <output aria-label="supplier user visible">
        {canViewUser(supplierAdministrator) ? 'visible' : 'hidden'}
      </output>
      <button
        type="button"
        onClick={() => publishSupplier({
          ...supplier,
          warehouseIds: ['zielona-gora-plant'],
        })}
      >
        Move supplier
      </button>
      <button type="button" onClick={() => setActiveActorId('supplier-administrator')}>
        Supplier actor
      </button>
      <button type="button" onClick={() => setActiveActorId('warehouse-administrator')}>
        Warehouse actor
      </button>
    </>
  );
}

describe('DemoDomainProvider', () => {
  it('uses local UI state, defaults to System Administrator and exposes all six actors', () => {
    localStorage.clear();
    sessionStorage.clear();
    render(
      <DemoDomainProvider>
        <ActorControl />
      </DemoDomainProvider>,
    );

    const selector = screen.getByLabelText('Actor');
    expect(selector.querySelectorAll('option')).toHaveLength(6);
    expect(screen.getByText('System Administrator', { selector: 'output' }).textContent)
      .toBe('System Administrator');

    fireEvent.change(selector, { target: { value: 'supplier-user' } });
    expect(screen.getByText('Supplier User', { selector: 'output' }).textContent)
      .toBe('Supplier User');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('redirects unauthorized routes and actions to the actor default route', () => {
    render(
      <DemoDomainProvider initialActorId="warehouse-operator">
        <MemoryRouter initialEntries={['/restricted']}>
          <Routes>
            <Route
              path="/restricted"
              element={<DemoRouteGuard route="/users"><span>restricted</span></DemoRouteGuard>}
            />
            <Route path="/appointments" element={<span>appointments</span>} />
          </Routes>
        </MemoryRouter>
      </DemoDomainProvider>,
    );
    expect(screen.getByText('appointments').textContent).toBe('appointments');
    expect(screen.queryByText('restricted')).toBeNull();

    cleanup();
    render(
      <DemoDomainProvider initialActorId="warehouse-administrator">
        <MemoryRouter initialEntries={['/restricted-action']}>
          <Routes>
            <Route
              path="/restricted-action"
              element={<DemoActionGuard action="invite-user"><span>invite</span></DemoActionGuard>}
            />
            <Route path="/users" element={<span>users</span>} />
          </Routes>
        </MemoryRouter>
      </DemoDomainProvider>,
    );
    expect(screen.getByText('users').textContent).toBe('users');
    expect(screen.queryByText('invite')).toBeNull();
  });

  it('keeps published configuration while switching actors and derives assignments from it', () => {
    render(
      <DemoDomainProvider>
        <ConfigurationControl />
      </DemoDomainProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(screen.getByLabelText('warehouse count').textContent).toBe('3');

    fireEvent.click(screen.getByRole('button', { name: 'Publish draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch actor' }));

    expect(screen.getByLabelText('warehouse count').textContent).toBe('3');
    expect(screen.getByLabelText('active warehouse IDs').textContent)
      .toContain('poznan-cross-dock');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('derives supplier-user visibility from current configuration assignments', () => {
    render(
      <DemoDomainProvider>
        <UserScopeControl />
      </DemoDomainProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move supplier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Supplier actor' }));
    expect(screen.getByLabelText('supplier user visible').textContent).toBe('visible');

    fireEvent.click(screen.getByRole('button', { name: 'Warehouse actor' }));
    expect(screen.getByLabelText('supplier user visible').textContent).toBe('hidden');
  });
});
