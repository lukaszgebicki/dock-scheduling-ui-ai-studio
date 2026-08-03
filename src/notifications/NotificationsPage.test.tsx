// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppointmentWorkspaceProvider } from '../appointments/AppointmentWorkspaceProvider';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { DemoActorId } from '../demoDomain/demoDomain';
import { NotificationsPage } from './NotificationsPage';

function renderPage(actorId: DemoActorId = 'system-administrator') {
  return render(
    <MemoryRouter>
      <DemoDomainProvider initialActorId={actorId}>
        <AppointmentWorkspaceProvider>
          <NotificationsPage />
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

function SwitchActor({ actorId }: { actorId: DemoActorId }) {
  const { setActiveActorId } = useDemoDomain();
  return <button type="button" onClick={() => setActiveActorId(actorId)}>Switch notification actor</button>;
}

function inbox(): HTMLElement {
  return screen.getByRole('heading', { name: 'Actor-scoped inbox' }).closest('section')!;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NotificationsPage', () => {
  it('renders actor-scoped local items with explicit in-app and simulated e-mail statuses', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Notifications and exceptional states' })).toBeDefined();
    expect(within(inbox()).getByText(/System Administrator/)).toBeDefined();
    expect(within(inbox()).getAllByText('IN_APP_VISIBLE').length).toBeGreaterThan(0);
    expect(within(inbox()).getAllByText('EMAIL_SIMULATED_NOT_SENT').length).toBeGreaterThan(0);
    expect(within(inbox()).getAllByRole('button', { name: 'Mark as read' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('EXACT_MATCH')).toBeNull();
    expect(screen.queryByText('batch-demo-1')).toBeNull();
    expect(screen.queryByText('Internal-only note')).toBeNull();
  });

  it('filters unread and critical notifications and searches safe visible fields', () => {
    renderPage();
    const firstReadButton = within(inbox()).getAllByRole('button', { name: 'Mark as read' })[0];
    fireEvent.click(firstReadButton);
    expect(screen.getByRole('status').textContent).toContain('Read state changed locally');

    fireEvent.change(screen.getByLabelText('Notification inbox filter'), { target: { value: 'UNREAD' } });
    expect(within(inbox()).queryByText('READ')).toBeNull();

    fireEvent.change(screen.getByLabelText('Notification inbox filter'), { target: { value: 'CRITICAL' } });
    const severityLabels = within(inbox()).getAllByText('CRITICAL');
    expect(severityLabels.length).toBeGreaterThan(0);
    expect(within(inbox()).queryByText('INFORMATION')).toBeNull();

    fireEvent.change(screen.getByLabelText('Notification inbox filter'), { target: { value: 'ALL' } });
    fireEvent.change(screen.getByLabelText('Notification search'), { target: { value: 'baltic freight' } });
    expect(within(inbox()).getAllByText(/Baltic Freight/).length).toBeGreaterThan(0);
    expect(within(inbox()).queryByText(/Vistula Materials/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Notification search'), { target: { value: 'EXACT_MATCH' } });
    expect(within(inbox()).getByRole('heading', { name: 'No matching notifications' })).toBeDefined();
  });

  it('locks critical preferences on and keeps immediate frequency disabled', () => {
    renderPage();
    for (const label of ['Cancelled', 'Rescheduled', 'Rejected', 'Required action', 'Safety communication']) {
      const enabled = screen.getByRole('checkbox', { name: `Enable ${label}` });
      const frequency = screen.getByRole('combobox', { name: `Frequency ${label}` });
      expect(enabled).toHaveProperty('checked', true);
      expect(enabled).toHaveProperty('disabled', true);
      expect(frequency).toHaveProperty('value', 'IMMEDIATE');
      expect(frequency).toHaveProperty('disabled', true);
    }
  });

  it('changes noncritical preferences in local memory only', () => {
    renderPage();
    const enabled = screen.getByRole('checkbox', { name: 'Enable Reminder' });
    const frequency = screen.getByRole('combobox', { name: 'Frequency Reminder' });
    fireEvent.change(frequency, { target: { value: 'DAILY_DIGEST' } });
    expect(frequency).toHaveProperty('value', 'DAILY_DIGEST');
    expect(screen.getByRole('status').textContent).toContain('No schedule or delivery was created');

    fireEvent.click(enabled);
    expect(enabled).toHaveProperty('checked', false);
    expect(frequency).toHaveProperty('disabled', true);
    expect(screen.getByRole('status').textContent).toContain('No delivery setting was persisted');
  });

  it('renders all exceptional states and safe actions never claim recovery success', () => {
    renderPage();
    const section = screen.getByRole('heading', { name: 'Exceptional-state catalog' }).closest('section')!;
    expect(within(section).getAllByText('Exceptional state')).toHaveLength(16);
    expect(within(section).getByRole('heading', { name: 'Reservation conflict' })).toBeDefined();
    expect(within(section).getByRole('heading', { name: 'Blocked Supplier' })).toBeDefined();
    fireEvent.click(within(section).getByRole('button', { name: 'Review nearest-slot guidance' }));
    expect(screen.getByRole('status').textContent).toContain('No replacement slot was booked');
    fireEvent.click(within(section).getByRole('button', { name: 'Review retry guidance' }));
    expect(screen.getByRole('status').textContent).toContain('No save success was fabricated');
  });

  it('resets local filters, read state and preferences while re-scoping on actor change', () => {
    render(
      <MemoryRouter>
        <DemoDomainProvider>
          <AppointmentWorkspaceProvider>
            <SwitchActor actorId="supplier-user" />
            <NotificationsPage />
          </AppointmentWorkspaceProvider>
        </DemoDomainProvider>
      </MemoryRouter>,
    );
    fireEvent.click(within(inbox()).getAllByRole('button', { name: 'Mark as read' })[0]);
    fireEvent.change(screen.getByLabelText('Notification inbox filter'), { target: { value: 'UNREAD' } });
    fireEvent.change(screen.getByLabelText('Notification search'), { target: { value: 'baltic' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Frequency Reminder' }), { target: { value: 'DAILY_DIGEST' } });

    fireEvent.click(screen.getByRole('button', { name: 'Switch notification actor' }));
    expect(screen.getByLabelText('Notification inbox filter')).toHaveProperty('value', 'ALL');
    expect(screen.getByLabelText('Notification search')).toHaveProperty('value', '');
    expect(screen.getByRole('combobox', { name: 'Frequency Reminder' })).toHaveProperty('value', 'IMMEDIATE');
    expect(within(inbox()).getByText(/Supplier User/)).toBeDefined();
    expect(within(inbox()).getAllByText(/Vistula Materials/).length).toBeGreaterThan(0);
    expect(within(inbox()).queryByText(/Baltic Freight/)).toBeNull();
    expect(within(inbox()).getAllByText('UNREAD').length).toBeGreaterThan(0);
  });

  it('performs no network, browser storage or hidden business action', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Review offline guidance' }));
    fireEvent.click(within(inbox()).getAllByRole('button', { name: 'Mark as read' })[0]);
    fireEvent.change(screen.getByRole('combobox', { name: 'Frequency Reminder' }), { target: { value: 'HOURLY_DIGEST' } });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /send e-mail|send sms|approve|reject|cancel|reschedule|check in|check out|assign dock|save appointment/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /send|download|upload/i })).toBeNull();
  });
});
