import { describe, expect, it } from 'vitest';
import { planningAppointments } from '../calendar/planningCalendar';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import type { DemoUser } from '../demoDomain/demoDomain';
import { resolveWorkflowRouting } from '../demoDomain/workflowRouting';
import type { LifecycleOperationalStatus } from '../lifecycle/lifecycle';
import {
  assignDock,
  checkInAppointment,
  checkOutAppointment,
  confirmNoShow,
  createGateOpsState,
  progressOperation,
  type GateAppointmentSeed,
} from './gateOps';

const warehouseId = 'nowy-kisielin-distribution-center' as const;
const appointmentId = 'planning-northstar-1001';

function user(id: string, role: DemoUser['role']): DemoUser {
  return {
    id,
    fullName: id,
    email: `${id}@example.test`,
    organizationId: 'pernod-ricard-poland',
    role,
    warehouseIds: [warehouseId],
    status: 'Active',
    lastActive: 'Fixture',
    accountType: 'Internal',
  };
}

const security = user('security', 'Security Officer');
const operator = user('operator', 'Warehouse Operator');

function decision(
  step: 'GATE_CHECK_IN' | 'GATE_CHECK_OUT' | 'ASSIGN_DOCK' | 'PROGRESS_OPERATION' | 'CONFIRM_NO_SHOW',
  capability: 'CHECK_IN' | 'CHECK_OUT' | 'ASSIGN_DOCK' | 'PROGRESS_OPERATION' | 'CONFIRM_NO_SHOW',
  actors: readonly DemoUser[],
) {
  return resolveWorkflowRouting({ step, capability, scope: { warehouseId }, actors });
}

function stateAt(status: LifecycleOperationalStatus) {
  const seeds: readonly GateAppointmentSeed[] = [{
    ...planningAppointments[0],
    appointmentStatus: 'CONFIRMED',
    operationalStatus: status,
    changeStatus: 'NO_CHANGE_REQUEST',
    flow: 'Material Delivery',
  }];
  return createGateOpsState(seeds);
}

describe('canonical gate operational status matrix', () => {
  it('permits EXPECTED to CHECKED_IN and EXPECTED to NO_SHOW only', () => {
    const expected = stateAt('EXPECTED');
    expect(checkInAppointment(
      expected,
      appointmentId,
      security.id,
      decision('GATE_CHECK_IN', 'CHECK_IN', [security]),
      'Driver',
      'TR-100',
      'TRL-200',
      '2026-08-10T08:00',
      'Gate verified',
    ).error).toBeNull();
    expect(confirmNoShow(
      expected,
      appointmentId,
      operator.id,
      decision('CONFIRM_NO_SHOW', 'CONFIRM_NO_SHOW', [operator]),
      'Threshold reached',
      '2026-08-10T09:00',
      initialDemoConfiguration,
    ).error).toBeNull();
    expect(checkOutAppointment(
      expected,
      appointmentId,
      security.id,
      decision('GATE_CHECK_OUT', 'CHECK_OUT', [security]),
      'Invalid checkout',
    ).error).toContain('COMPLETED');
  });

  it('permits CHECKED_IN to WAITING_FOR_DOCK or AT_DOCK only', () => {
    const checkedIn = stateAt('CHECKED_IN');
    expect(progressOperation(
      checkedIn,
      appointmentId,
      operator.id,
      decision('PROGRESS_OPERATION', 'PROGRESS_OPERATION', [operator]),
      'WAITING_FOR_DOCK',
      'Wait',
    ).error).toBeNull();
    expect(progressOperation(
      checkedIn,
      appointmentId,
      operator.id,
      decision('PROGRESS_OPERATION', 'PROGRESS_OPERATION', [operator]),
      'UNLOADING',
      'Invalid jump',
    ).error).toContain('not allowed');

    const dockId = initialDemoConfiguration.warehouses[0].docks[0].id;
    const assigned = assignDock(
      checkedIn,
      appointmentId,
      operator.id,
      decision('ASSIGN_DOCK', 'ASSIGN_DOCK', [operator]),
      dockId,
      'Assign explicit dock',
      initialDemoConfiguration,
    ).state;
    expect(progressOperation(
      assigned,
      appointmentId,
      operator.id,
      decision('PROGRESS_OPERATION', 'PROGRESS_OPERATION', [operator]),
      'AT_DOCK',
      'Move to dock',
    ).error).toBeNull();
  });

  it.each<[
    LifecycleOperationalStatus,
    'WAITING_FOR_DOCK' | 'AT_DOCK' | 'UNLOADING' | 'COMPLETED',
    boolean,
  ]>([
    ['WAITING_FOR_DOCK', 'AT_DOCK', true],
    ['AT_DOCK', 'UNLOADING', true],
    ['UNLOADING', 'COMPLETED', true],
    ['WAITING_FOR_DOCK', 'UNLOADING', false],
    ['AT_DOCK', 'COMPLETED', false],
    ['COMPLETED', 'UNLOADING', false],
    ['NO_SHOW', 'WAITING_FOR_DOCK', false],
    ['CHECKED_OUT', 'AT_DOCK', false],
  ])('%s to %s allowed=%s', (source, target, allowed) => {
    let state = stateAt(source);
    if (target === 'AT_DOCK') {
      state = assignDock(
        state,
        appointmentId,
        operator.id,
        decision('ASSIGN_DOCK', 'ASSIGN_DOCK', [operator]),
        initialDemoConfiguration.warehouses[0].docks[0].id,
        'Assign dock',
        initialDemoConfiguration,
      ).state;
    }
    const result = progressOperation(
      state,
      appointmentId,
      operator.id,
      decision('PROGRESS_OPERATION', 'PROGRESS_OPERATION', [operator]),
      target,
      'Matrix action',
    );
    if (allowed) expect(result.error).toBeNull();
    else {
      expect(result.error).toContain('not allowed');
      expect(result.state).toBe(state);
      expect(result.state.history).toHaveLength(state.history.length);
    }
  });

  it('permits COMPLETED to CHECKED_OUT and blocks checkout from every other state', () => {
    const completed = stateAt('COMPLETED');
    expect(checkOutAppointment(
      completed,
      appointmentId,
      security.id,
      decision('GATE_CHECK_OUT', 'CHECK_OUT', [security]),
      'Exit verified',
    ).error).toBeNull();

    for (const status of [
      'EXPECTED',
      'CHECKED_IN',
      'WAITING_FOR_DOCK',
      'AT_DOCK',
      'UNLOADING',
      'CHECKED_OUT',
      'NO_SHOW',
    ] as const) {
      const state = stateAt(status);
      const result = checkOutAppointment(
        state,
        appointmentId,
        security.id,
        decision('GATE_CHECK_OUT', 'CHECK_OUT', [security]),
        'Invalid checkout',
      );
      expect(result.error).toContain('COMPLETED');
      expect(result.state).toBe(state);
    }
  });
});
