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
  lifecycleCapacityAppointmentIds,
  rejectAppointment,
  requestAppointmentData,
  rescheduleAppointment,
  restoreCancelledAppointment,
  submitDraftAppointment,
  type LifecycleState,
} from './lifecycle';

const warehouseId = 'nowy-kisielin-distribution-center' as const;

function decision(kind: 'approve' | 'reject' | 'request-data', actors = demoUsers) {
  if (kind === 'approve') {
    return resolveWorkflowRouting({
      step: 'MANUAL_APPROVAL',
      capability: 'APPROVE_APPOINTMENT',
      scope: { warehouseId },
      actors,
    });
  }
  if (kind === 'reject') {
    return resolveWorkflowRouting({
      step: 'MANUAL_REJECTION',
      capability: 'REJECT_APPOINTMENT',
      scope: { warehouseId },
      actors,
    });
  }
  return resolveWorkflowRouting({
    step: 'REQUEST_APPOINTMENT_DATA',
    capability: 'REQUEST_APPOINTMENT_DATA',
    scope: { warehouseId },
    actors,
  });
}

function appointment(state: LifecycleState, id = 'planning-northstar-1001') {
  return state.appointments.find((candidate) => candidate.id === id)!;
}

describe('lifecycle domain', () => {
  it('creates independent closed planning, change and operational evidence', () => {
    const state = createLifecycleState(planningAppointments);
    const target = appointment(state);

    expect(target.appointmentStatus).toBe('SUBMITTED');
    expect(target.changeStatus).toBe('NO_CHANGE_REQUEST');
    expect(target.operationalStatus).toBe('EXPECTED');
    expect(target.planningState).toBe('AWAITING_DETAILS');
    expect(target.lateCancellation).toBe(false);
  });

  it('permits only an authorized scoped actor to submit DRAFT to SUBMITTED', () => {
    const draftAppointments = planningAppointments.map((candidate) =>
      candidate.id === 'planning-northstar-1001'
        ? { ...candidate, appointmentStatus: 'DRAFT' }
        : candidate);
    const initial = createLifecycleState(draftAppointments);

    const wrongSupplier = submitDraftAppointment(
      initial,
      'planning-northstar-1001',
      getDemoActor('supplier-user'),
      'Wrong organization',
      initialDemoConfiguration,
    );
    expect(wrongSupplier.error).toContain('cannot submit');
    expect(wrongSupplier.state).toBe(initial);

    const submitted = submitDraftAppointment(
      initial,
      'planning-northstar-1001',
      getDemoActor('supplier-administrator'),
      'Submit validated draft',
      initialDemoConfiguration,
    );
    expect(submitted.error).toBeNull();
    expect(appointment(submitted.state).appointmentStatus).toBe('SUBMITTED');
    expect(submitted.state.history[0].action).toBe('SUBMIT');
  });

  it('evaluates manual and auto approval without allowing unauthorized or blocked auto-approval', () => {
    const initial = createLifecycleState(planningAppointments);
    const systemAdministrator = getDemoActor('system-administrator');
    const manual = evaluateSubmittedAppointment(
      initial,
      'planning-northstar-1001',
      systemAdministrator,
      'Evaluate ADR approval',
      initialDemoConfiguration,
      decision('approve'),
    );
    expect(manual.error).toBeNull();
    expect(appointment(manual.state).appointmentStatus).toBe('PENDING_APPROVAL');

    const auto = evaluateSubmittedAppointment(
      initial,
      'planning-vistula-3001',
      systemAdministrator,
      'Evaluate standard delivery',
      initialDemoConfiguration,
      resolveWorkflowRouting({
        step: 'MANUAL_APPROVAL',
        capability: 'APPROVE_APPOINTMENT',
        scope: { warehouseId },
        actors: demoUsers,
      }),
    );
    expect(auto.error).toBeNull();
    expect(appointment(auto.state, 'planning-vistula-3001').appointmentStatus).toBe('CONFIRMED');

    const unauthorized = evaluateSubmittedAppointment(
      initial,
      'planning-northstar-1001',
      getDemoActor('supplier-administrator'),
      'Supplier cannot evaluate',
      initialDemoConfiguration,
      decision('approve'),
    );
    expect(unauthorized.error).toContain('cannot evaluate');
    expect(unauthorized.state).toBe(initial);

    const blocked = evaluateSubmittedAppointment(
      initial,
      'planning-northstar-1001',
      systemAdministrator,
      'No approver available',
      initialDemoConfiguration,
      decision('approve', []),
    );
    expect(blocked.error).toContain('blocked');
    expect(blocked.state).toBe(initial);
    expect(blocked.state.history).toHaveLength(0);
  });

  it('supports explicit DELEGATE approval without inventing a fallback identity', () => {
    const actorsWithoutPrimary = demoUsers.filter((user) => user.id !== 'u-2');
    const delegatedDecision = decision('approve', actorsWithoutPrimary);
    expect(delegatedDecision.outcome).toBe('DELEGATE');
    expect(delegatedDecision.selectedActor?.id).toBe('u-1');

    const initial = createLifecycleState(planningAppointments);
    const pending = evaluateSubmittedAppointment(
      initial,
      'planning-northstar-1001',
      getDemoActor('system-administrator'),
      'Use authorized fallback',
      initialDemoConfiguration,
      delegatedDecision,
    );
    expect(pending.error).toBeNull();

    const approved = approveAppointment(
      pending.state,
      'planning-northstar-1001',
      'u-1',
      'Delegated approval',
      delegatedDecision,
    );
    expect(approved.error).toBeNull();
    expect(appointment(approved.state).appointmentStatus).toBe('CONFIRMED');
  });

  it('routes approval, rejection and request-data to the selected actor only', () => {
    const initial = createLifecycleState(planningAppointments);
    const pending = evaluateSubmittedAppointment(
      initial,
      'planning-northstar-1001',
      getDemoActor('system-administrator'),
      'Prepare manual decision',
      initialDemoConfiguration,
      decision('approve'),
    ).state;

    const notSelected = approveAppointment(
      pending,
      'planning-northstar-1001',
      'u-1',
      'System admin is not primary here',
      decision('approve'),
    );
    expect(notSelected.error).toContain('not the routed approver');
    expect(notSelected.state).toBe(pending);

    const requested = requestAppointmentData(
      pending,
      'planning-northstar-1001',
      'u-2',
      'Provide missing evidence',
      decision('request-data'),
    );
    expect(requested.error).toBeNull();
    expect(appointment(requested.state).appointmentStatus).toBe('PENDING_APPROVAL');
    expect(appointment(requested.state).changeStatus).toBe('SUPPLIER_ACTION_REQUIRED');

    const repeatedRequest = requestAppointmentData(
      requested.state,
      'planning-northstar-1001',
      'u-2',
      'Repeat request',
      decision('request-data'),
    );
    expect(repeatedRequest.error).toContain('already required');
    expect(repeatedRequest.state).toBe(requested.state);

    const approved = approveAppointment(
      requested.state,
      'planning-northstar-1001',
      'u-2',
      'Evidence accepted',
      decision('approve'),
    );
    expect(approved.error).toBeNull();
    expect(appointment(approved.state).appointmentStatus).toBe('CONFIRMED');
    expect(appointment(approved.state).planningState).toBe('AWAITING_DETAILS');
    expect(appointment(approved.state).operationalStatus).toBe('EXPECTED');

    const rejected = rejectAppointment(
      pending,
      'planning-northstar-1001',
      'u-2',
      'ADR documentation rejected',
      decision('reject'),
    );
    expect(rejected.error).toBeNull();
    expect(appointment(rejected.state).appointmentStatus).toBe('REJECTED');
    expect(rejected.state.history.at(-1)?.before).toContain('PENDING_APPROVAL');
    expect(rejected.state.history.at(-1)?.after).toContain('REJECTED');
  });

  it('fails closed for invalid transitions and missing, duplicated or incompatible configuration', () => {
    const initial = createLifecycleState(planningAppointments);
    const systemAdministrator = getDemoActor('system-administrator');
    const invalidApprove = approveAppointment(
      initial,
      'planning-northstar-1001',
      'u-2',
      'Invalid source',
      decision('approve'),
    );
    expect(invalidApprove.error).toContain('PENDING_APPROVAL');
    expect(invalidApprove.state).toBe(initial);

    const missingSupplier = evaluateSubmittedAppointment(
      initial,
      'planning-northstar-1001',
      systemAdministrator,
      'Missing supplier configuration',
      { ...initialDemoConfiguration, suppliers: [] },
      decision('approve'),
    );
    expect(missingSupplier.error).toContain('Supplier configuration is missing');
    expect(missingSupplier.state).toBe(initial);

    const duplicatedWarehouse = evaluateSubmittedAppointment(
      initial,
      'planning-northstar-1001',
      systemAdministrator,
      'Duplicate warehouse configuration',
      {
        ...initialDemoConfiguration,
        warehouses: [
          ...initialDemoConfiguration.warehouses,
          initialDemoConfiguration.warehouses[0],
        ],
      },
      decision('approve'),
    );
    expect(duplicatedWarehouse.error).toContain('ambiguous');
    expect(duplicatedWarehouse.state).toBe(initial);

    const incompatibleFlow = evaluateSubmittedAppointment(
      initial,
      'planning-northstar-1001',
      systemAdministrator,
      'Unsupported flow',
      {
        ...initialDemoConfiguration,
        suppliers: initialDemoConfiguration.suppliers.map((supplier) =>
          supplier.organizationId === 'northstar-packaging'
            ? { ...supplier, allowedFlows: [] }
            : supplier),
      },
      decision('approve'),
    );
    expect(incompatibleFlow.error).toContain('flow is incompatible');
    expect(incompatibleFlow.state).toBe(initial);
  });

  it('reschedules before cut-off atomically and keeps the original slot on conflict', () => {
    const initial = createLifecycleState(planningAppointments);
    const supplier = getDemoActor('supplier-administrator');
    const original = appointment(initial);

    const conflict = rescheduleAppointment(
      initial,
      original.id,
      supplier,
      'Try blocked day',
      '2026-08-15',
      '09:00',
      '2026-08-09T00:00:00Z',
      initialDemoConfiguration,
    );
    expect(conflict.error).toContain('working hours');
    expect(appointment(conflict.state).plannedDate).toBe(original.plannedDate);
    expect(appointment(conflict.state).plannedTime).toBe(original.plannedTime);
    expect(conflict.state.history).toHaveLength(0);

    const moved = rescheduleAppointment(
      initial,
      original.id,
      supplier,
      'Choose compatible slot',
      '2026-08-13',
      '09:00',
      '2026-08-09T00:00:00Z',
      initialDemoConfiguration,
    );
    expect(moved.error).toBeNull();
    expect(appointment(moved.state).plannedDate).toBe('2026-08-13');
    expect(appointment(moved.state).plannedTime).toBe('09:00');
    expect(moved.state.history[0].before).toContain('2026-08-10');
    expect(moved.state.history[0].after).toContain('2026-08-13');
  });

  it('creates one request after cut-off without moving the Supplier slot', () => {
    const initial = createLifecycleState(planningAppointments);
    const supplier = getDemoActor('supplier-administrator');
    const original = appointment(initial);

    const requested = rescheduleAppointment(
      initial,
      original.id,
      supplier,
      'Request after cut-off',
      '2026-08-13',
      '09:00',
      '2026-08-10T02:00',
      initialDemoConfiguration,
    );
    expect(requested.error).toBeNull();
    expect(appointment(requested.state).plannedDate).toBe(original.plannedDate);
    expect(appointment(requested.state).plannedTime).toBe(original.plannedTime);
    expect(appointment(requested.state).changeStatus).toBe('RESCHEDULE_REQUESTED');
    expect(requested.state.history[0].action).toBe('REQUEST_RESCHEDULE');

    const repeated = rescheduleAppointment(
      requested.state,
      original.id,
      supplier,
      'Repeat request',
      '2026-08-14',
      '10:00',
      '2026-08-10T02:00',
      initialDemoConfiguration,
    );
    expect(repeated.error).toContain('already requested');
    expect(repeated.state).toBe(requested.state);
  });

  it('enforces organization scope, cancellation release, late flag and idempotency', () => {
    const initial = createLifecycleState(planningAppointments);
    const wrongSupplier = getDemoActor('supplier-user');
    const blocked = cancelAppointment(
      initial,
      'planning-northstar-1001',
      wrongSupplier,
      'Wrong organization',
      '2026-08-09T00:00:00Z',
      initialDemoConfiguration,
    );
    expect(blocked.error).toContain('cannot cancel');
    expect(blocked.state).toBe(initial);

    const supplier = getDemoActor('supplier-administrator');
    const cancelled = cancelAppointment(
      initial,
      'planning-northstar-1001',
      supplier,
      'Delivery withdrawn after cut-off',
      '2026-08-10T02:00',
      initialDemoConfiguration,
    );
    expect(cancelled.error).toBeNull();
    expect(appointment(cancelled.state).appointmentStatus).toBe('CANCELLED');
    expect(appointment(cancelled.state).lateCancellation).toBe(true);
    expect(lifecycleCapacityAppointmentIds(cancelled.state)).not.toContain('planning-northstar-1001');

    const repeated = cancelAppointment(
      cancelled.state,
      'planning-northstar-1001',
      supplier,
      'Repeat cancellation',
      '2026-08-10T02:00',
      initialDemoConfiguration,
    );
    expect(repeated.error).toContain('does not allow');
    expect(repeated.state).toBe(cancelled.state);
    expect(repeated.state.history).toHaveLength(1);
  });

  it('allows only System Administrator restore and revalidates the original slot fail-closed', () => {
    const initial = createLifecycleState(planningAppointments);
    const supplier = getDemoActor('supplier-administrator');
    const cancelled = cancelAppointment(
      initial,
      'planning-northstar-1001',
      supplier,
      'Delivery withdrawn',
      '2026-08-09T00:00:00Z',
      initialDemoConfiguration,
    ).state;

    const nonAdminRestore = restoreCancelledAppointment(
      cancelled,
      'planning-northstar-1001',
      supplier,
      'Not authorized',
      initialDemoConfiguration,
    );
    expect(nonAdminRestore.error).toContain('System Administrator');

    const noActiveDockConfiguration = {
      ...initialDemoConfiguration,
      warehouses: initialDemoConfiguration.warehouses.map((warehouse) =>
        warehouse.id === warehouseId
          ? {
            ...warehouse,
            docks: warehouse.docks.map((dock) => ({ ...dock, active: false })),
          }
          : warehouse),
    };
    const conflicted = restoreCancelledAppointment(
      cancelled,
      'planning-northstar-1001',
      getDemoActor('system-administrator'),
      'Try unavailable slot',
      noActiveDockConfiguration,
    );
    expect(conflicted.error).toContain('active dock');
    expect(conflicted.state).toBe(cancelled);

    const restored = restoreCancelledAppointment(
      cancelled,
      'planning-northstar-1001',
      getDemoActor('system-administrator'),
      'Dedicated correction',
      initialDemoConfiguration,
    );
    expect(restored.error).toBeNull();
    expect(appointment(restored.state).appointmentStatus).toBe('CONFIRMED');
    expect(appointment(restored.state).lateCancellation).toBe(false);
    expect(lifecycleCapacityAppointmentIds(restored.state)).toContain('planning-northstar-1001');
    expect(restored.state.history.at(-1)?.action).toBe('RESTORE_CANCELLED');
  });
});
