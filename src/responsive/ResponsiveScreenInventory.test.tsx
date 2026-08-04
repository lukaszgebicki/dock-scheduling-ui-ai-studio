// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppointmentWorkspaceProvider } from '../appointments/AppointmentWorkspaceProvider';
import { AppointmentsPage } from '../appointments/AppointmentsPage';
import { SupplierWeeklyBookingPage } from '../appointments/SupplierWeeklyBookingPage';
import { planningAppointments } from '../calendar/planningCalendar';
import { PlanningCalendarPage } from '../calendar/PlanningCalendarPage';
import { DemoDomainProvider } from '../demoDomain/DemoDomainProvider';
import { demoUsers, type DemoActorId, type DemoUser } from '../demoDomain/demoDomain';
import { GateOpsPage } from '../gateOps/GateOpsPage';
import type { GateAppointmentSeed } from '../gateOps/gateOps';
import { NonWeeklyBookingPage } from '../nonWeeklyBooking/NonWeeklyBookingPage';
import { OperatorManualBookingPage } from '../operatorManualBooking/OperatorManualBookingPage';
import {
  DesktopRecommendedNotice,
  ResponsiveActionGroup,
  defaultResponsiveCalendarView,
} from './ResponsivePrimitives';

function renderWorkspaceScreen(
  actorId: DemoActorId,
  screenContent: React.ReactNode,
  workflowUsers: readonly DemoUser[] = demoUsers,
) {
  return render(
    <MemoryRouter>
      <DemoDomainProvider
        initialActorId={actorId}
        initialWorkflowUsers={workflowUsers}
      >
        <AppointmentWorkspaceProvider>
          {screenContent}
        </AppointmentWorkspaceProvider>
      </DemoDomainProvider>
    </MemoryRouter>,
  );
}

const activeSecurityUsers = demoUsers.map((user) =>
  user.id === 'u-4' ? { ...user, status: 'Active' as const } : user);

const securitySeeds: readonly GateAppointmentSeed[] = [
  {
    ...planningAppointments[0],
    appointmentStatus: 'CONFIRMED',
    operationalStatus: 'EXPECTED',
    changeStatus: 'NO_CHANGE_REQUEST',
    flow: 'Material Delivery',
  },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('approved responsive screen inventory', () => {
  it('provides presentation-only action and desktop-recommendation primitives', () => {
    render(
      <>
        <ResponsiveActionGroup label="Responsive test actions" stickyOnMobile>
          <button type="button">Primary action</button>
          <button type="button">Secondary action</button>
        </ResponsiveActionGroup>
        <DesktopRecommendedNotice>
          Dense configuration remains available with a desktop recommendation.
        </DesktopRecommendedNotice>
      </>,
    );

    const actions = screen.getByRole('group', { name: 'Responsive test actions' });
    expect(actions.getAttribute('data-responsive-action-group')).toBe('true');
    expect(actions.className).toContain('sticky');
    expect(within(actions).getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('complementary', { name: 'Desktop recommendation' }))
      .toBeDefined();
    expect(defaultResponsiveCalendarView('Supplier User')).toBe('day');
    expect(defaultResponsiveCalendarView('Warehouse Operator')).toBe('day');
    expect(defaultResponsiveCalendarView('Warehouse Administrator')).toBe('week');
  });

  it('keeps Supplier appointment search, mobile cards and desktop table locally contained', () => {
    renderWorkspaceScreen('supplier-administrator', <AppointmentsPage />);

    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeDefined();
    expect(screen.getByLabelText('Global search')).toBeDefined();
    const desktopTable = screen.getByRole('table');
    expect(desktopTable.closest('.overflow-x-auto')).not.toBeNull();
    const detailsLinks = screen.getAllByRole('link', {
      name: /Open appointment details/,
    });
    expect(detailsLinks.length).toBeGreaterThanOrEqual(2);
    expect(detailsLinks.some((link) => link.closest('article') !== null)).toBe(true);
    expect(detailsLinks[0].getAttribute('href')).toMatch(/^\/appointments\//);
  });

  it('keeps weekly Supplier booking as stacked day/time choices with touch-safe actions', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    renderWorkspaceScreen('supplier-administrator', <SupplierWeeklyBookingPage />);

    const root = screen.getByRole('heading', {
      name: 'Reserve a next-week delivery slot',
    }).closest('[data-responsive-screen="supplier-weekly-booking"]');
    expect(root).not.toBeNull();
    const choices = screen.getByRole('group', { name: 'Available next-week slot' });
    expect(choices.querySelector('[data-responsive-screen="supplier-day-time-choices"]'))
      .not.toBeNull();
    const submit = screen.getByRole('button', { name: 'Create local demonstration' });
    expect(submit.closest('[data-responsive-action-group="true"]')).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('keeps standard Supplier and Operator five-step creation readable without changing rules', () => {
    const supplierView = renderWorkspaceScreen(
      'supplier-administrator',
      <NonWeeklyBookingPage />,
    );
    expect(screen.getByRole('heading', {
      name: 'Create standard Supplier appointment',
    })).toBeDefined();
    expect(screen.getAllByText(/Step [1-5]/)).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDefined();
    supplierView.unmount();

    renderWorkspaceScreen('warehouse-operator', <OperatorManualBookingPage />);
    expect(screen.getByRole('heading', {
      name: 'Create manual Supplier appointment',
    })).toBeDefined();
    expect(screen.getAllByText(/Step [1-5]/)).toHaveLength(5);
    expect(screen.getByLabelText('Warehouse *')).toHaveProperty(
      'value',
      'zielona-gora-plant',
    );
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDefined();
  });

  it('uses day-oriented Supplier and Operator calendar agendas while preserving six views', () => {
    for (const actorId of ['supplier-administrator', 'warehouse-operator'] as const) {
      const view = renderWorkspaceScreen(actorId, <PlanningCalendarPage />);
      const root = screen.getByRole('heading', { name: 'PO planning calendar' })
        .closest('[data-responsive-screen="role-calendar"]');
      expect(root?.getAttribute('data-responsive-default-view')).toBe('day');
      expect(screen.getByRole('button', { name: 'Day view' })
        .getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByRole('group', { name: 'Calendar view' })
        .querySelectorAll('button')).toHaveLength(6);
      view.unmount();
    }
  });

  it('regression-covers Security search, check-in and unannounced visit without authority expansion', () => {
    renderWorkspaceScreen(
      'security-officer',
      <GateOpsPage initialSeeds={securitySeeds} />,
      activeSecurityUsers,
    );

    expect(screen.getByRole('heading', { name: 'Gate operations' })).toBeDefined();
    expect(screen.getByLabelText('Exact gate search')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Check in appointment' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Correct gate registration' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create pending-decision visit' })).toBeDefined();
    expect(screen.queryByRole('button', { name: /approve|reject|cancel|restore/i }))
      .toBeNull();
  });

  it('presentation-only inventory interactions make no network or browser-storage calls', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    renderWorkspaceScreen('supplier-administrator', <PlanningCalendarPage />);

    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Day view' }));
    fireEvent.change(screen.getByLabelText('Delivery type'), {
      target: { value: 'Material Delivery' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear calendar filters' }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).not.toHaveBeenCalled();
  });
});
