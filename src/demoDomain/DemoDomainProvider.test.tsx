// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DemoActionGuard } from './DemoActionGuard';
import { DemoDomainProvider, useDemoDomain } from './DemoDomainProvider';
import { DemoRouteGuard } from './DemoRouteGuard';
import type { DemoActorId } from './demoDomain';

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
});
