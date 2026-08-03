import { describe, expect, it } from 'vitest';
import { planningAppointments } from '../calendar/planningCalendar';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import { demoUsers, getDemoActor } from '../demoDomain/demoDomain';
import { resolveWorkflowRouting } from '../demoDomain/workflowRouting';
import {
  approveAppointment,
  cancelAppointment,
  createLifecycleState,
  evaluateSubmittedAppointment,
  restoreCancelledAppointment,
  submitDraftAppointment,
  type LifecyclePlanningStatus,
  type LifecycleState,
} from './lifecycle';

const appointmentId = 'planning-northstar-1001';
const warehouseId = 'nowy-kisielin-distribution-center' as const;

function stateWithStatus(status: LifecyclePlanningStatus): LifecycleState {
  const state = createLifecycleState(planningAppointments);
  return {
    ...state,
    appointments: state.appointments.map((appointment) =>
      appointment.id === appointmentId
        ? { ...appointment, appointmentStatus: status }
        : appointment),
  };
}

function approvalDecision() {
  return resolveWorkflowRouting({
    step: 'MANUAL_APPROVAL',
    capability: 'APPROVE_APPOINTMENT',
    scope: { warehouseId },
    actors: demoUsers,
  });
}

describe('canonical lifecycle status matrix', () => {
  it.each<LifecyclePlanningStatus>([
    'SUBMITTED',
    'PENDING_APPROVAL',
    'CONFIRMED',
  ])('permits %s to CANCELLED for an authorized actor', (sourceStatus) => {
    const initial = stateWithStatus(sourceStatus);
    const result = cancelAppointment(
      initial,
      appointmentId,
      getDemoActor('supplier-administrator'),
      `Cancel from ${sourceStatus}`,
      '2026-08-09T00:00',
      initialDemoConfiguration,
    );

    expect(result.error).toBeNull();
    expect(result.state.appointments.find((appointment) =>
      appointment.id === appointmentId)?.appointmentStatus).toBe('CANCELLED');
  });

  it.each<LifecyclePlanningStatus>([
    'DRAFT',
    'REJECTED',
    'CANCELLED',
  ])('blocks %s to CANCELLED and creates no history', (sourceStatus) => {
    const initial = stateWithStatus(sourceStatus);
    const result = cancelAppointment(
      initial,
      appointmentId,
      getDemoActor('supplier-administrator'),
      `Invalid cancel from ${sourceStatus}`,
      '2026-08-09T00:00',
      initialDemoConfiguration,
    );

    expect(result.error).toContain('does not allow cancellation');
    expect(result.state).toBe(initial);
    expect(result.state.history).toHaveLength(0);
  });

  it('blocks representative status jumps outside the canonical matrix', () => {
    const submitted = stateWithStatus('SUBMITTED');
    expect(submitDraftAppointment(
      submitted,
      appointmentId,
      getDemoActor('supplier-administrator'),
      'Cannot submit twice',
      initialDemoConfiguration,
    ).error).toContain('DRAFT');

    const confirmed = stateWithStatus('CONFIRMED');
    expect(evaluateSubmittedAppointment(
      confirmed,
      appointmentId,
      getDemoActor('system-administrator'),
      'Cannot evaluate confirmed',
      initialDemoConfiguration,
      approvalDecision(),
    ).error).toContain('SUBMITTED');

    expect(approveAppointment(
      confirmed,
      appointmentId,
      'u-2',
      'Cannot approve confirmed',
      approvalDecision(),
    ).error).toContain('PENDING_APPROVAL');

    expect(restoreCancelledAppointment(
      confirmed,
      appointmentId,
      getDemoActor('system-administrator'),
      'Cannot restore confirmed',
      initialDemoConfiguration,
    ).error).toContain('CANCELLED');
  });
});
