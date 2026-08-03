// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import {
  AppointmentWorkspaceProvider,
} from '../appointments/AppointmentWorkspaceProvider';
import type { AppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { DashboardPage } from './DashboardPage';

function renderPage(
  actorId: DemoActorId = 'system-administrator',
  entry = '/dashboard',
  initialState?: AppointmentWorkspaceState,
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <DemoDomainProvider initialActorId={actorId}>
        <AppointmentWorkspaceProvider initialState={initialState}>
          <DashboardPage />
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function SwitchActor({ actorId }: { actorId: DemoActorId }) {
  const { setActiveActorId } = useDemoDomain();
  return <button type="button" onClick={() => setActiveActorId(actorId)}>Switch dashboard actor</button>;
}

function resultSection(): HTMLElement {
  return screen.getByRole('heading', { name: /Actor-scoped agenda|filtered appointments/ }).closest('section')!;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DashboardPage', () => {
  it('renders System Administrator KPIs and evidence gaps without fabricated values', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Role dashboard' })).toBeDefined();
    expect(screen.getByText(/Active actor: System Administrator/)).toBeDefined();
    expect(screen.getByText(/Deterministic anchor date: 2026-08-10/)).toBeDefined();
    expect(screen.getByText('Administration overview')).toBeDefined();
    expect(screen.getByText('Complex calendar, dock and capacity configuration is recommended on desktop.')).toBeDefined();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/no paired unloading\/completion timestamps/i)).toBeDefined();
    expect(screen.getByText(/no paired check-in\/dock timestamps/i)).toBeDefined();
  });

  it('keeps KPI count and filtered result list in exact parity', () => {
    renderPage();
    const link = screen.getByRole('link', { name: "Filter dashboard by Today's appointments: 1" });
    expect(link.getAttribute('href')).toBe('/dashboard?filter=TODAY&actor=system-administrator');
    fireEvent.click(link);
    const section = resultSection();
    expect(within(section).getByRole('heading', { name: "Today's appointments — filtered appointments" })).toBeDefined();
    expect(within(section).getByText('1 scoped records')).toBeDefined();
    expect(within(section).getByText('APT-WPL-001')).toBeDefined();
    expect(within(section).queryByText('APT-WPL-002')).toBeNull();
    expect(screen.getByRole('link', { name: 'Clear KPI filter' }).getAttribute('href')).toBe('/dashboard');
  });

  it('renders Warehouse Operator responsive agenda without Administrator-only metrics', () => {
    renderPage('warehouse-operator');
    expect(screen.getByText(/Active actor: Warehouse Operator/)).toBeDefined();
    expect(screen.getByText('Responsive day agenda')).toBeDefined();
    expect(screen.getByText('Full dock grids remain a desktop/tablet presentation.')).toBeDefined();
    expect(screen.queryByText('Average service time')).toBeNull();
    expect(screen.queryByText('Slot utilization')).toBeNull();
    expect(within(resultSection()).getByText('Baltic Freight')).toBeDefined();
    expect(within(resultSection()).queryByText('Vistula Materials')).toBeNull();
  });

  it('renders Supplier-safe day-and-time cards and organization-isolated records', () => {
    renderPage('supplier-user');
    expect(screen.getByText(/Active actor: Supplier User/)).toBeDefined();
    expect(screen.getByText('Supplier mobile day and time list')).toBeDefined();
    expect(screen.getByText(/readable day-and-time cards/)).toBeDefined();
    expect(screen.getByText('Next Supplier appointment')).toBeDefined();
    const section = resultSection();
    expect(within(section).queryAllByText(/Vistula Materials/)).toHaveLength(0);
    expect(within(section).getByText('APT-WPL-003')).toBeDefined();
    expect(within(section).getByText('APT-NW-2026-001')).toBeDefined();
    expect(within(section).queryByText('APT-WPL-002')).toBeNull();
    expect(screen.queryByText('Baltic Freight')).toBeNull();
    expect(screen.queryByText('EXACT_MATCH')).toBeNull();
    expect(screen.queryByText('batch-demo-1')).toBeNull();
    expect(screen.queryByText('Internal-only note')).toBeNull();
  });

  it('renders Security gate-responsive cards and only an authorized gate action', () => {
    renderPage('security-officer');
    expect(screen.getByText(/Active actor: Security Officer/)).toBeDefined();
    expect(screen.getByText('Gate-responsive cards')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Open authorized gate operations' }).getAttribute('href')).toBe('/gate-operations');
    expect(screen.queryByText('Planning state')).toBeNull();
    expect(screen.queryByText('Slot utilization')).toBeNull();
  });

  it('renders no KPI claims for an empty actor-visible workspace', () => {
    renderPage('system-administrator', '/dashboard', { records: [], savedViews: [] });
    expect(screen.getByRole('heading', { name: 'No appointments in the active scope' })).toBeDefined();
    expect(screen.getByText(/No KPI value is claimed/)).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Role KPIs' })).toBeNull();
  });

  it('invalidates a stale KPI filter and removes prior actor data after actor change', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard?filter=ACTIVE_WEEK&actor=system-administrator']}>
        <DemoDomainProvider>
          <AppointmentWorkspaceProvider>
            <SwitchActor actorId="supplier-user" />
            <DashboardPage />
          </AppointmentWorkspaceProvider>
        </DemoDomainProvider>
      </MemoryRouter>,
    );
    expect(within(resultSection()).getByText('4 scoped records')).toBeDefined();
    expect(within(resultSection()).getByText('Baltic Freight')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Switch dashboard actor' }));
    expect(screen.getByRole('status').textContent).toContain('KPI filter was cleared');
    expect(screen.getByText(/Active actor: Supplier User/)).toBeDefined();
    expect(within(resultSection()).getByText('2 scoped records')).toBeDefined();
    expect(within(resultSection()).queryByText('Baltic Freight')).toBeNull();
    expect(within(resultSection()).getByText('APT-WPL-003')).toBeDefined();
  });

  it('performs no network, browser storage or hidden business action', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();
    fireEvent.click(screen.getByRole('link', { name: 'Filter dashboard by Required action: 3' }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /approve|reject|cancel|reschedule|check in|check out|assign dock|save|upload/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /upload|download|send e-mail|send sms/i })).toBeNull();
    expect(screen.getByText(/No native app, camera upload, QR\/OCR/)).toBeDefined();
  });
});
