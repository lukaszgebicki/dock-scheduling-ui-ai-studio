import { describe, expect, it } from 'vitest';
import { planningAppointments } from '../calendar/planningCalendar';
import {
  createBlockId,
  initialDemoConfiguration,
} from '../demoDomain/configuration';
import {
  demoUsers,
  getDemoActor,
  type DemoUser,
} from '../demoDomain/demoDomain';
import { resolveWorkflowRouting } from '../demoDomain/workflowRouting';
import {
  addGateNote,
  assignDock,
  changeDock,
  checkInAppointment,
  checkOutAppointment,
  classifyArrival,
  confirmNoShow,
  correctGateRegistration,
  createGateOpsState,
  createUnannouncedVisit,
  gateCapacityAppointmentIds,
  gateSafeAppointments,
  isPotentialNoShow,
  progressOperation,
  searchGateAppointments,
  type GateAppointmentSeed,
  type GateOpsState,
} from './gateOps';

const warehouseA = 'nowy-kisielin-distribution-center' as const;
const warehouseB = 'zielona-gora-plant' as const;

const seeds: readonly GateAppointmentSeed[] = planningAppointments.map((appointment) => ({
  ...appointment,
  appointmentStatus: 'CONFIRMED',
  operationalStatus: 'EXPECTED',
  changeStatus: 'NO_CHANGE_REQUEST',
  flow: 'Material Delivery',
  isAdr: false,
}));

function user(overrides: Partial<DemoUser> & Pick<DemoUser, 'id' | 'role'>): DemoUser {
  return {
    fullName: overrides.id,
    email: `${overrides.id}@example.test`,
    organizationId: 'pernod-ricard-poland',
    warehouseIds: [warehouseA],
    status: 'Active',
    lastActive: 'Deterministic fixture',
    accountType: 'Internal',
    ...overrides,
  };
}

function decision(
  action: 'checkIn' | 'checkOut' | 'assignDock' | 'changeDock' | 'progress' | 'noShow',
  actors: readonly DemoUser[] = demoUsers,
  warehouseId = warehouseA,
) {
  const contracts = {
    checkIn: ['GATE_CHECK_IN', 'CHECK_IN'],
    checkOut: ['GATE_CHECK_OUT', 'CHECK_OUT'],
    assignDock: ['ASSIGN_DOCK', 'ASSIGN_DOCK'],
    changeDock: ['CHANGE_DOCK', 'CHANGE_DOCK'],
    progress: ['PROGRESS_OPERATION', 'PROGRESS_OPERATION'],
    noShow: ['CONFIRM_NO_SHOW', 'CONFIRM_NO_SHOW'],
  } as const;
  const [step, capability] = contracts[action];
  return resolveWorkflowRouting({
    step,
    capability,
    scope: { warehouseId },
    actors,
  });
}

function appointment(state: GateOpsState, id = 'planning-northstar-1001') {
  return state.appointments.find((candidate) => candidate.id === id)!;
}

function checkedInState(actors: readonly DemoUser[] = [
  user({ id: 'security-a', role: 'Security Officer' }),
]): GateOpsState {
  const initial = createGateOpsState(seeds);
  return checkInAppointment(
    initial,
    'planning-northstar-1001',
    actors[0].id,
    decision('checkIn', actors),
    'Driver 1',
    'TR-100',
    'TRL-200',
    '2026-08-10T08:00',
    'Verified at gate',
  ).state;
}

describe('gate operations domain', () => {
  it('keeps lifecycle, planning, change and Supplier transport evidence independent', () => {
    const state = createGateOpsState(seeds);
    const target = appointment(state);

    expect(target.lifecycleStatus).toBe('CONFIRMED');
    expect(target.planningState).toBe('AWAITING_DETAILS');
    expect(target.changeStatus).toBe('NO_CHANGE_REQUEST');
    expect(target.operationalStatus).toBe('EXPECTED');
    expect(target.gateTractorRegistration).toBe(target.supplierTractorRegistration);
  });

  it('searches exact normalized identifiers inside actor scope and Security workweek only', () => {
    const state = createGateOpsState([
      ...seeds,
      { ...seeds[0], id: 'outside-week', plannedDate: '2026-08-17' },
    ]);
    const security = {
      ...getDemoActor('security-officer'),
      warehouseIds: [warehouseA],
    };

    expect(searchGateAppointments(state, security, '2026-08-10', ' po-demo-1001 ')
      .map((item) => item.id)).toEqual(['planning-northstar-1001']);
    expect(searchGateAppointments(state, security, '2026-08-10', 'northstar pack')
      .map((item) => item.id)).toEqual([]);
    expect(searchGateAppointments(state, security, '2026-08-10', 'PO-DEMO-2001'))
      .toEqual([]);
    expect(gateSafeAppointments(state, security, '2026-08-10')
      .some((item) => item.id === 'outside-week')).toBe(false);
  });

  it('classifies exact planned minute without invented tolerance', () => {
    const target = appointment(createGateOpsState(seeds));
    expect(classifyArrival(target, '2026-08-10T07:59')).toBe('EARLY');
    expect(classifyArrival(target, '2026-08-10T08:00')).toBe('ON_TIME');
    expect(classifyArrival(target, '2026-08-10T08:01')).toBe('LATE');
    expect(classifyArrival(target, 'invalid')).toBeNull();
  });

  it('supports primary Security RUN, warehouse-scoped DELEGATE and mandatory BLOCK', () => {
    const security = user({ id: 'security-a', role: 'Security Officer' });
    expect(decision('checkIn', [security]).outcome).toBe('RUN');

    const delegated = decision('checkIn', [
      user({ id: 'security-a', role: 'Security Officer', status: 'Inactive' }),
      user({ id: 'operator-b', role: 'Warehouse Operator', warehouseIds: [warehouseB] }),
      user({ id: 'operator-a', role: 'Warehouse Operator', warehouseIds: [warehouseA] }),
    ]);
    expect(delegated.outcome).toBe('DELEGATE');
    expect(delegated.selectedActor?.id).toBe('operator-a');

    expect(decision('checkIn', []).outcome).toBe('BLOCK');
  });

  it('checks in only confirmed EXPECTED visits with selected actor and complete evidence', () => {
    const actors = [user({ id: 'security-a', role: 'Security Officer' })];
    const initial = createGateOpsState(seeds);
    const missingDriver = checkInAppointment(
      initial,
      'planning-northstar-1001',
      'security-a',
      decision('checkIn', actors),
      '',
      'TR-100',
      'TRL-200',
      '2026-08-10T08:00',
      'Reason',
    );
    expect(missingDriver.error).toContain('Driver identification');
    expect(missingDriver.state).toBe(initial);

    const wrongActor = checkInAppointment(
      initial,
      'planning-northstar-1001',
      'other',
      decision('checkIn', actors),
      'Driver',
      'TR-100',
      'TRL-200',
      '2026-08-10T08:00',
      'Reason',
    );
    expect(wrongActor.error).toContain('not the routed');

    const checkedIn = checkInAppointment(
      initial,
      'planning-northstar-1001',
      'security-a',
      decision('checkIn', actors),
      'Driver',
      'TR-100',
      'TRL-200',
      '2026-08-10T07:59',
      'Verified',
    );
    expect(checkedIn.error).toBeNull();
    expect(appointment(checkedIn.state).operationalStatus).toBe('CHECKED_IN');
    expect(appointment(checkedIn.state).arrivalClassification).toBe('EARLY');
    expect(appointment(checkedIn.state).plannedTime).toBe('08:00');
    expect(appointment(checkedIn.state).lifecycleStatus).toBe('CONFIRMED');
    expect(checkedIn.state.history[0]).toMatchObject({
      action: 'CHECK_IN',
      routedOutcome: 'RUN',
      sourceOperationalStatus: 'EXPECTED',
      targetOperationalStatus: 'CHECKED_IN',
    });
  });

  it('preserves Supplier registrations and requires explicit Security correction for gate evidence', () => {
    const security = { ...getDemoActor('security-officer'), warehouseIds: [warehouseA] };
    const initial = createGateOpsState(seeds);
    const conflict = checkInAppointment(
      initial,
      'planning-northstar-1001',
      security.userId,
      decision('checkIn', [user({ id: security.userId, role: 'Security Officer' })]),
      'Driver',
      'OTHER',
      'TRL-200',
      '2026-08-10T08:00',
      'Conflict',
    );
    expect(conflict.error).toContain('explicit correction');

    const corrected = correctGateRegistration(
      initial,
      'planning-northstar-1001',
      security,
      'OTHER',
      'OTHER-TRL',
      'Observed at gate',
    );
    expect(corrected.error).toBeNull();
    expect(appointment(corrected.state).supplierTractorRegistration).toBe('TR-100');
    expect(appointment(corrected.state).gateTractorRegistration).toBe('OTHER');
    expect(appointment(corrected.state).registrationCorrectionAcknowledged).toBe(true);
    expect(corrected.state.history[0].before).toContain('TR-100');
    expect(corrected.state.history[0].after).toContain('OTHER');
  });

  it('assigns and changes only explicit active compatible unblocked docks without status side effects', () => {
    const operator = user({ id: 'operator-a', role: 'Warehouse Operator' });
    const initial = checkedInState();
    const dock = initialDemoConfiguration.warehouses[0].docks[0];

    const assigned = assignDock(
      initial,
      'planning-northstar-1001',
      'operator-a',
      decision('assignDock', [operator]),
      dock.id,
      'Explicit dock selection',
      initialDemoConfiguration,
    );
    expect(assigned.error).toBeNull();
    expect(appointment(assigned.state).assignedDockId).toBe(dock.id);
    expect(appointment(assigned.state).operationalStatus).toBe('CHECKED_IN');

    const blockedConfiguration = {
      ...initialDemoConfiguration,
      warehouses: initialDemoConfiguration.warehouses.map((warehouse) =>
        warehouse.id === warehouseA
          ? {
            ...warehouse,
            blocks: [{
              id: createBlockId('gate-dock-block'),
              reasonType: 'Maintenance' as const,
              reason: 'Gate test block',
              scope: { type: 'dock' as const, dockId: dock.id },
              schedule: {
                kind: 'one-time' as const,
                date: '2026-08-10',
                allDay: true,
                startsAt: '00:00',
                endsAt: '23:59',
              },
            }],
          }
          : warehouse),
    };
    const blocked = assignDock(
      initial,
      'planning-northstar-1001',
      'operator-a',
      decision('assignDock', [operator]),
      dock.id,
      'Blocked dock',
      blockedConfiguration,
    );
    expect(blocked.error).toContain('blocked');
    expect(blocked.state).toBe(initial);

    const sameDock = changeDock(
      assigned.state,
      'planning-northstar-1001',
      'operator-a',
      decision('changeDock', [operator]),
      dock.id,
      'No actual change',
      initialDemoConfiguration,
    );
    expect(sameDock.error).toContain('already assigned');
    expect(sameDock.state).toBe(assigned.state);
  });

  it('progresses waiting, dock, unloading, completed and checkout in order', () => {
    const operator = user({ id: 'operator-a', role: 'Warehouse Operator' });
    const security = user({ id: 'security-a', role: 'Security Officer' });
    const dock = initialDemoConfiguration.warehouses[0].docks[0];
    let state = checkedInState([security]);

    state = progressOperation(
      state,
      'planning-northstar-1001',
      'operator-a',
      decision('progress', [operator]),
      'WAITING_FOR_DOCK',
      'Wait for dock',
    ).state;
    state = assignDock(
      state,
      'planning-northstar-1001',
      'operator-a',
      decision('assignDock', [operator]),
      dock.id,
      'Assign dock',
      initialDemoConfiguration,
    ).state;
    state = progressOperation(state, 'planning-northstar-1001', 'operator-a', decision('progress', [operator]), 'AT_DOCK', 'At dock').state;
    state = progressOperation(state, 'planning-northstar-1001', 'operator-a', decision('progress', [operator]), 'UNLOADING', 'Unload').state;
    state = progressOperation(state, 'planning-northstar-1001', 'operator-a', decision('progress', [operator]), 'COMPLETED', 'Complete').state;

    const checkedOut = checkOutAppointment(
      state,
      'planning-northstar-1001',
      'security-a',
      decision('checkOut', [security]),
      'Exit verified',
    );
    expect(checkedOut.error).toBeNull();
    expect(appointment(checkedOut.state).operationalStatus).toBe('CHECKED_OUT');
    expect(appointment(checkedOut.state).lifecycleStatus).toBe('CONFIRMED');
  });

  it('keeps potential No Show non-mutating until routed human confirmation releases capacity', () => {
    const operator = user({ id: 'operator-a', role: 'Warehouse Operator' });
    const initial = createGateOpsState(seeds);
    const target = appointment(initial);
    expect(isPotentialNoShow(target, '2026-08-10T08:59', initialDemoConfiguration)).toBe(false);
    expect(isPotentialNoShow(target, '2026-08-10T09:00', initialDemoConfiguration)).toBe(true);
    expect(target.operationalStatus).toBe('EXPECTED');

    const confirmed = confirmNoShow(
      initial,
      target.id,
      'operator-a',
      decision('noShow', [operator]),
      'Driver did not arrive',
      '2026-08-10T09:00',
      initialDemoConfiguration,
    );
    expect(confirmed.error).toBeNull();
    expect(appointment(confirmed.state).operationalStatus).toBe('NO_SHOW');
    expect(gateCapacityAppointmentIds(confirmed.state)).not.toContain(target.id);

    const repeated = confirmNoShow(
      confirmed.state,
      target.id,
      'operator-a',
      decision('noShow', [operator]),
      'Repeat',
      '2026-08-10T10:00',
      initialDemoConfiguration,
    );
    expect(repeated.error).toContain('EXPECTED');
    expect(repeated.state).toBe(confirmed.state);
  });

  it('adds scoped gate notes and creates unannounced PENDING_DECISION without appointment effects', () => {
    const security = { ...getDemoActor('security-officer'), warehouseIds: [warehouseA] };
    const initial = createGateOpsState(seeds);
    const noted = addGateNote(initial, 'planning-northstar-1001', security, 'Driver documents checked');
    expect(noted.error).toBeNull();
    expect(appointment(noted.state).gateNotes).toEqual(['Driver documents checked']);

    const created = createUnannouncedVisit(
      noted.state,
      security,
      {
        warehouseId: warehouseA,
        supplierOrganizationId: 'northstar-packaging',
        purchaseOrderNumber: 'PO-UNANNOUNCED-1',
        tractorRegistration: 'TR-X',
        trailerOrContainerRegistration: 'TRL-X',
        driverIdentification: 'DRIVER-X',
        reason: 'No appointment found',
      },
      initialDemoConfiguration,
    );
    expect(created.error).toBeNull();
    expect(created.state.unannouncedVisits[0]).toMatchObject({
      origin: 'UNANNOUNCED_GATE',
      state: 'PENDING_DECISION',
      lifecycleStatus: null,
      plannedDate: null,
      dockId: null,
      capacityReserved: false,
    });
    expect(created.state.appointments).toEqual(noted.state.appointments);
    expect(created.state.history).toEqual(noted.state.history);
  });
});
