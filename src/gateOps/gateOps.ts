import type { PlanningAppointment } from '../calendar/planningCalendar';
import type {
  DemoConfigurationState,
  DockConfiguration,
  DockId,
  WarehouseBlock,
  WarehouseConfiguration,
} from '../demoDomain/configuration';
import type {
  DemoActor,
  SupplierOrganizationId,
  WarehouseId,
} from '../demoDomain/demoDomain';
import {
  workflowDecisionAllowsActor,
  type WorkflowCapability,
  type WorkflowOutcome,
  type WorkflowRoutingDecision,
  type WorkflowStep,
} from '../demoDomain/workflowRouting';
import type {
  LifecycleChangeStatus,
  LifecycleOperationalStatus,
  LifecyclePlanningStatus,
} from '../lifecycle/lifecycle';

export const arrivalClassifications = ['EARLY', 'ON_TIME', 'LATE'] as const;
export type ArrivalClassification = (typeof arrivalClassifications)[number];

export type GateAction =
  | 'CHECK_IN'
  | 'WAIT_FOR_DOCK'
  | 'ASSIGN_DOCK'
  | 'CHANGE_DOCK'
  | 'MOVE_AT_DOCK'
  | 'START_UNLOADING'
  | 'COMPLETE_OPERATION'
  | 'CHECK_OUT'
  | 'CONFIRM_NO_SHOW'
  | 'CORRECT_REGISTRATION'
  | 'ADD_GATE_NOTE';

export interface GateAppointmentSeed extends PlanningAppointment {
  appointmentStatus: LifecyclePlanningStatus;
  changeStatus?: LifecycleChangeStatus;
  operationalStatus?: LifecycleOperationalStatus;
  flow?: 'Material Delivery' | 'Finished Goods Pickup';
  isAdr?: boolean;
}

export interface GateAppointment {
  id: string;
  supplierOrganizationId: SupplierOrganizationId;
  supplierName: string;
  warehouseId: WarehouseId;
  purchaseOrderNumber: string;
  deliveryPartKey: '1';
  plannedDate: string;
  plannedTime: string;
  bookingOrigin: PlanningAppointment['bookingOrigin'];
  planningState: PlanningAppointment['planningState'];
  lifecycleStatus: LifecyclePlanningStatus;
  changeStatus: LifecycleChangeStatus;
  operationalStatus: LifecycleOperationalStatus;
  supplierTractorRegistration: string;
  supplierTrailerOrContainerRegistration: string;
  gateTractorRegistration: string;
  gateTrailerOrContainerRegistration: string;
  registrationCorrectionAcknowledged: boolean;
  driverIdentification: string;
  arrivalAt: string | null;
  arrivalClassification: ArrivalClassification | null;
  assignedDockId: DockId | null;
  gateNotes: readonly string[];
  flow: 'Material Delivery' | 'Finished Goods Pickup';
  isAdr: boolean;
  skuLines: PlanningAppointment['skuLines'];
  importDiagnostic?: string;
  batchLineage?: string;
}

export interface GateHistoryEntry {
  id: string;
  sequence: number;
  appointmentId: string;
  action: GateAction;
  actorId: string;
  routedOutcome: WorkflowOutcome | 'ROLE_SCOPED';
  reason: string;
  sourceOperationalStatus: LifecycleOperationalStatus;
  targetOperationalStatus: LifecycleOperationalStatus;
  before: string;
  after: string;
}

export interface UnannouncedVisit {
  id: string;
  warehouseId: WarehouseId;
  supplierOrganizationId: SupplierOrganizationId;
  purchaseOrderNumber: string;
  tractorRegistration: string;
  trailerOrContainerRegistration: string;
  driverIdentification: string;
  origin: 'UNANNOUNCED_GATE';
  state: 'PENDING_DECISION';
  lifecycleStatus: null;
  plannedDate: null;
  plannedTime: null;
  dockId: null;
  capacityReserved: false;
  createdByActorId: string;
  reason: string;
}

export interface GateOpsState {
  appointments: readonly GateAppointment[];
  history: readonly GateHistoryEntry[];
  unannouncedVisits: readonly UnannouncedVisit[];
}

export interface GateActionResult {
  state: GateOpsState;
  error: string | null;
}

interface RoutedActionContract {
  step: WorkflowStep;
  capability: WorkflowCapability;
}

const routedActions: Readonly<Record<
  'checkIn' | 'checkOut' | 'assignDock' | 'changeDock' | 'progress' | 'noShow',
  RoutedActionContract
>> = {
  checkIn: { step: 'GATE_CHECK_IN', capability: 'CHECK_IN' },
  checkOut: { step: 'GATE_CHECK_OUT', capability: 'CHECK_OUT' },
  assignDock: { step: 'ASSIGN_DOCK', capability: 'ASSIGN_DOCK' },
  changeDock: { step: 'CHANGE_DOCK', capability: 'CHANGE_DOCK' },
  progress: { step: 'PROGRESS_OPERATION', capability: 'PROGRESS_OPERATION' },
  noShow: { step: 'CONFIRM_NO_SHOW', capability: 'CONFIRM_NO_SHOW' },
};

const operationalTransitions: Readonly<Record<
  LifecycleOperationalStatus,
  readonly LifecycleOperationalStatus[]
>> = {
  EXPECTED: ['CHECKED_IN', 'NO_SHOW'],
  CHECKED_IN: ['WAITING_FOR_DOCK', 'AT_DOCK'],
  WAITING_FOR_DOCK: ['AT_DOCK'],
  AT_DOCK: ['UNLOADING'],
  UNLOADING: ['COMPLETED'],
  COMPLETED: ['CHECKED_OUT'],
  CHECKED_OUT: [],
  NO_SHOW: [],
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function parseCivilMinute(value: string): number {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return Date.parse(`${value}:00Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    return Date.parse(value);
  }
  return Number.NaN;
}

function plannedMinute(appointment: GateAppointment): number {
  return Date.parse(`${appointment.plannedDate}T${appointment.plannedTime}:00Z`);
}

function snapshot(appointment: GateAppointment): string {
  return JSON.stringify({
    id: appointment.id,
    lifecycleStatus: appointment.lifecycleStatus,
    planningState: appointment.planningState,
    changeStatus: appointment.changeStatus,
    operationalStatus: appointment.operationalStatus,
    plannedDate: appointment.plannedDate,
    plannedTime: appointment.plannedTime,
    bookingOrigin: appointment.bookingOrigin,
    supplierTractorRegistration: appointment.supplierTractorRegistration,
    supplierTrailerOrContainerRegistration: appointment.supplierTrailerOrContainerRegistration,
    gateTractorRegistration: appointment.gateTractorRegistration,
    gateTrailerOrContainerRegistration: appointment.gateTrailerOrContainerRegistration,
    registrationCorrectionAcknowledged: appointment.registrationCorrectionAcknowledged,
    driverIdentification: appointment.driverIdentification,
    arrivalAt: appointment.arrivalAt,
    arrivalClassification: appointment.arrivalClassification,
    assignedDockId: appointment.assignedDockId,
    gateNotes: appointment.gateNotes,
  });
}

function failure(state: GateOpsState, error: string): GateActionResult {
  return { state, error };
}

function success(
  state: GateOpsState,
  before: GateAppointment,
  after: GateAppointment,
  action: GateAction,
  actorId: string,
  routedOutcome: WorkflowOutcome | 'ROLE_SCOPED',
  reason: string,
): GateActionResult {
  const sequence = state.history.length + 1;
  return {
    state: {
      ...state,
      appointments: state.appointments.map((appointment) =>
        appointment.id === after.id ? after : appointment),
      history: [
        ...state.history,
        {
          id: `gate-history-${sequence.toString().padStart(3, '0')}`,
          sequence,
          appointmentId: before.id,
          action,
          actorId,
          routedOutcome,
          reason,
          sourceOperationalStatus: before.operationalStatus,
          targetOperationalStatus: after.operationalStatus,
          before: snapshot(before),
          after: snapshot(after),
        },
      ],
    },
    error: null,
  };
}

function getAppointment(state: GateOpsState, id: string): GateAppointment | null {
  return state.appointments.find((appointment) => appointment.id === id) ?? null;
}

function required(value: string, label: string): string | null {
  return value.trim().length > 0 ? null : `${label} is required.`;
}

function exactWarehouse(
  configuration: DemoConfigurationState,
  warehouseId: WarehouseId,
): WarehouseConfiguration | string {
  const matches = configuration.warehouses.filter((warehouse) => warehouse.id === warehouseId);
  if (matches.length === 0) return 'Warehouse configuration is missing.';
  if (matches.length > 1) return 'Warehouse configuration is ambiguous.';
  if (matches[0].status !== 'published') return 'Warehouse configuration is not published.';
  return matches[0];
}

function routingAllows(
  decision: WorkflowRoutingDecision,
  appointment: GateAppointment,
  actorId: string,
  contract: RoutedActionContract,
): boolean {
  return decision.step === contract.step
    && decision.capability === contract.capability
    && decision.evidence.scope.warehouseId === appointment.warehouseId
    && workflowDecisionAllowsActor(decision, actorId);
}

function transitionAllowed(
  source: LifecycleOperationalStatus,
  target: LifecycleOperationalStatus,
): boolean {
  return operationalTransitions[source].includes(target);
}

function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function minutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

function blockApplies(
  block: WarehouseBlock,
  appointment: GateAppointment,
  dock: DockConfiguration,
  warehouse: WarehouseConfiguration,
): boolean {
  const scopeMatches = block.scope.type === 'warehouse'
    || (block.scope.type === 'dock' && block.scope.dockId === dock.id)
    || (block.scope.type === 'zone' && block.scope.zone === dock.zone)
    || (block.scope.type === 'capacity-pool'
      && warehouse.capacityPools.some((pool) =>
        pool.id === block.scope.capacityPoolId && pool.dockIds.includes(dock.id)));
  if (!scopeMatches) return false;

  if (block.schedule.kind === 'one-time') {
    if (block.schedule.date !== appointment.plannedDate) return false;
    if (block.schedule.allDay) return true;
    const planned = minutes(appointment.plannedTime);
    return planned >= minutes(block.schedule.startsAt)
      && planned < minutes(block.schedule.endsAt);
  }
  if (!block.schedule.weekdays.includes(weekday(appointment.plannedDate) as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
    return false;
  }
  const planned = minutes(appointment.plannedTime);
  return planned >= minutes(block.schedule.startsAt)
    && planned < minutes(block.schedule.endsAt);
}

function validDock(
  configuration: DemoConfigurationState,
  appointment: GateAppointment,
  dockId: DockId,
): DockConfiguration | string {
  const warehouse = exactWarehouse(configuration, appointment.warehouseId);
  if (typeof warehouse === 'string') return warehouse;
  const matches = warehouse.docks.filter((dock) => dock.id === dockId);
  if (matches.length === 0) return 'The selected dock does not exist in this warehouse.';
  if (matches.length > 1) return 'The selected dock is ambiguous.';
  const dock = matches[0];
  if (!dock.active) return 'The selected dock is inactive.';
  if (!dock.allowedFlows.includes(appointment.flow)) return 'The selected dock does not support this delivery flow.';
  if (appointment.isAdr && !dock.supportsAdr) return 'The selected dock does not support ADR.';
  if (warehouse.blocks.some((block) => blockApplies(block, appointment, dock, warehouse))) {
    return 'The selected dock is blocked for the appointment period.';
  }
  return dock;
}

function actorIsSecurityInScope(actor: DemoActor, appointment: GateAppointment): boolean {
  return actor.role === 'Security Officer' && actor.warehouseIds.includes(appointment.warehouseId);
}

function mondayOfWorkweek(referenceDate: string): number | null {
  const reference = Date.parse(`${referenceDate}T12:00:00Z`);
  if (!Number.isFinite(reference)) return null;
  const day = new Date(reference).getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return reference + offset * 24 * 60 * 60 * 1000;
}

function dateInSecurityWorkweek(date: string, referenceDate: string): boolean {
  const monday = mondayOfWorkweek(referenceDate);
  const value = Date.parse(`${date}T12:00:00Z`);
  return monday !== null && Number.isFinite(value)
    && value >= monday
    && value < monday + 5 * 24 * 60 * 60 * 1000;
}

export function createGateOpsState(seeds: readonly GateAppointmentSeed[]): GateOpsState {
  return {
    appointments: seeds.map((seed) => ({
      id: seed.id,
      supplierOrganizationId: seed.supplierOrganizationId,
      supplierName: seed.supplierName,
      warehouseId: seed.warehouseId,
      purchaseOrderNumber: seed.purchaseOrderNumber,
      deliveryPartKey: seed.deliveryPartKey,
      plannedDate: seed.plannedDate,
      plannedTime: seed.plannedTime,
      bookingOrigin: seed.bookingOrigin,
      planningState: seed.planningState,
      lifecycleStatus: seed.appointmentStatus,
      changeStatus: seed.changeStatus ?? 'NO_CHANGE_REQUEST',
      operationalStatus: seed.operationalStatus ?? 'EXPECTED',
      supplierTractorRegistration: seed.tractorRegistration,
      supplierTrailerOrContainerRegistration: seed.trailerOrContainerRegistration,
      gateTractorRegistration: seed.tractorRegistration,
      gateTrailerOrContainerRegistration: seed.trailerOrContainerRegistration,
      registrationCorrectionAcknowledged: false,
      driverIdentification: '',
      arrivalAt: null,
      arrivalClassification: null,
      assignedDockId: null,
      gateNotes: [],
      flow: seed.flow ?? 'Material Delivery',
      isAdr: seed.isAdr ?? false,
      skuLines: seed.skuLines.map((line) => ({ ...line })),
      importDiagnostic: seed.importDiagnostic,
      batchLineage: seed.batchLineage,
    })),
    history: [],
    unannouncedVisits: [],
  };
}

export function gateSafeAppointments(
  state: GateOpsState,
  actor: DemoActor,
  referenceDate: string,
): readonly GateAppointment[] {
  if (!['Security Officer', 'Warehouse Operator', 'Warehouse Administrator'].includes(actor.role)) {
    return [];
  }
  return state.appointments.filter((appointment) =>
    actor.warehouseIds.includes(appointment.warehouseId)
    && (actor.role !== 'Security Officer'
      || dateInSecurityWorkweek(appointment.plannedDate, referenceDate)));
}

export function searchGateAppointments(
  state: GateOpsState,
  actor: DemoActor,
  referenceDate: string,
  query: string,
): readonly GateAppointment[] {
  const exact = normalize(query);
  if (!exact) return [];
  return gateSafeAppointments(state, actor, referenceDate)
    .filter((appointment) => [
      appointment.id,
      appointment.purchaseOrderNumber,
      appointment.supplierTractorRegistration,
      appointment.supplierTrailerOrContainerRegistration,
      appointment.gateTractorRegistration,
      appointment.gateTrailerOrContainerRegistration,
      appointment.supplierName,
    ].some((value) => normalize(value) === exact))
    .sort((left, right) =>
      left.plannedDate.localeCompare(right.plannedDate)
      || left.plannedTime.localeCompare(right.plannedTime)
      || left.id.localeCompare(right.id));
}

export function classifyArrival(
  appointment: GateAppointment,
  arrivalAt: string,
): ArrivalClassification | null {
  const arrival = parseCivilMinute(arrivalAt);
  const planned = plannedMinute(appointment);
  if (!Number.isFinite(arrival) || !Number.isFinite(planned)) return null;
  if (arrival < planned) return 'EARLY';
  if (arrival > planned) return 'LATE';
  return 'ON_TIME';
}

export function checkInAppointment(
  state: GateOpsState,
  appointmentId: string,
  actorId: string,
  decision: WorkflowRoutingDecision,
  driverIdentification: string,
  tractorRegistration: string,
  trailerOrContainerRegistration: string,
  arrivalAt: string,
  reason: string,
): GateActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (appointment.lifecycleStatus !== 'CONFIRMED') {
    return failure(state, 'Only a lifecycle CONFIRMED appointment can be checked in.');
  }
  if (!transitionAllowed(appointment.operationalStatus, 'CHECKED_IN')) {
    return failure(state, 'Only an EXPECTED appointment can be checked in.');
  }
  if (!routingAllows(decision, appointment, actorId, routedActions.checkIn)) {
    return failure(state, 'The active actor is not the routed check-in actor.');
  }
  const missing = required(driverIdentification, 'Driver identification')
    ?? required(tractorRegistration, 'Gate tractor registration')
    ?? required(trailerOrContainerRegistration, 'Gate trailer or container registration')
    ?? required(reason, 'Reason');
  if (missing) return failure(state, missing);
  if (normalize(tractorRegistration) !== normalize(appointment.gateTractorRegistration)
    || normalize(trailerOrContainerRegistration)
      !== normalize(appointment.gateTrailerOrContainerRegistration)) {
    return failure(state, 'Gate registrations conflict with recorded gate evidence. Record an explicit correction first.');
  }
  const classification = classifyArrival(appointment, arrivalAt);
  if (!classification) return failure(state, 'A valid explicit arrival timestamp is required.');

  return success(
    state,
    appointment,
    {
      ...appointment,
      operationalStatus: 'CHECKED_IN',
      driverIdentification: driverIdentification.trim(),
      arrivalAt,
      arrivalClassification: classification,
    },
    'CHECK_IN',
    actorId,
    decision.outcome,
    reason.trim(),
  );
}

export function assignDock(
  state: GateOpsState,
  appointmentId: string,
  actorId: string,
  decision: WorkflowRoutingDecision,
  dockId: DockId,
  reason: string,
  configuration: DemoConfigurationState,
): GateActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (appointment.assignedDockId !== null) return failure(state, 'A dock is already assigned. Use Change dock.');
  if (!routingAllows(decision, appointment, actorId, routedActions.assignDock)) {
    return failure(state, 'The active actor is not the routed dock-assignment actor.');
  }
  const missingReason = required(reason, 'Reason');
  if (missingReason) return failure(state, missingReason);
  const dock = validDock(configuration, appointment, dockId);
  if (typeof dock === 'string') return failure(state, dock);
  return success(
    state,
    appointment,
    { ...appointment, assignedDockId: dock.id },
    'ASSIGN_DOCK',
    actorId,
    decision.outcome,
    reason.trim(),
  );
}

export function changeDock(
  state: GateOpsState,
  appointmentId: string,
  actorId: string,
  decision: WorkflowRoutingDecision,
  dockId: DockId,
  reason: string,
  configuration: DemoConfigurationState,
): GateActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (appointment.assignedDockId === null) return failure(state, 'No dock is assigned. Use Assign dock.');
  if (appointment.operationalStatus === 'COMPLETED'
    || appointment.operationalStatus === 'CHECKED_OUT'
    || appointment.operationalStatus === 'NO_SHOW') {
    return failure(state, 'The dock cannot be changed after the operation is completed.');
  }
  if (appointment.assignedDockId === dockId) return failure(state, 'The selected dock is already assigned.');
  if (!routingAllows(decision, appointment, actorId, routedActions.changeDock)) {
    return failure(state, 'The active actor is not the routed dock-change actor.');
  }
  const missingReason = required(reason, 'Reason');
  if (missingReason) return failure(state, missingReason);
  const dock = validDock(configuration, appointment, dockId);
  if (typeof dock === 'string') return failure(state, dock);
  return success(
    state,
    appointment,
    { ...appointment, assignedDockId: dock.id },
    'CHANGE_DOCK',
    actorId,
    decision.outcome,
    reason.trim(),
  );
}

export function progressOperation(
  state: GateOpsState,
  appointmentId: string,
  actorId: string,
  decision: WorkflowRoutingDecision,
  targetStatus: Extract<LifecycleOperationalStatus,
    'WAITING_FOR_DOCK' | 'AT_DOCK' | 'UNLOADING' | 'COMPLETED'>,
  reason: string,
): GateActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (!routingAllows(decision, appointment, actorId, routedActions.progress)) {
    return failure(state, 'The active actor is not the routed operation actor.');
  }
  if (!transitionAllowed(appointment.operationalStatus, targetStatus)) {
    return failure(state, `Operational transition ${appointment.operationalStatus} to ${targetStatus} is not allowed.`);
  }
  if (targetStatus === 'AT_DOCK' && appointment.assignedDockId === null) {
    return failure(state, 'AT_DOCK requires an explicitly assigned dock.');
  }
  const missingReason = required(reason, 'Reason');
  if (missingReason) return failure(state, missingReason);
  const action: GateAction = targetStatus === 'WAITING_FOR_DOCK'
    ? 'WAIT_FOR_DOCK'
    : targetStatus === 'AT_DOCK'
      ? 'MOVE_AT_DOCK'
      : targetStatus === 'UNLOADING'
        ? 'START_UNLOADING'
        : 'COMPLETE_OPERATION';
  return success(
    state,
    appointment,
    { ...appointment, operationalStatus: targetStatus },
    action,
    actorId,
    decision.outcome,
    reason.trim(),
  );
}

export function checkOutAppointment(
  state: GateOpsState,
  appointmentId: string,
  actorId: string,
  decision: WorkflowRoutingDecision,
  reason: string,
): GateActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (!transitionAllowed(appointment.operationalStatus, 'CHECKED_OUT')) {
    return failure(state, 'Check-out requires operational COMPLETED status.');
  }
  if (!routingAllows(decision, appointment, actorId, routedActions.checkOut)) {
    return failure(state, 'The active actor is not the routed check-out actor.');
  }
  const missingReason = required(reason, 'Reason');
  if (missingReason) return failure(state, missingReason);
  return success(
    state,
    appointment,
    { ...appointment, operationalStatus: 'CHECKED_OUT' },
    'CHECK_OUT',
    actorId,
    decision.outcome,
    reason.trim(),
  );
}

export function isPotentialNoShow(
  appointment: GateAppointment,
  referenceAt: string,
  configuration: DemoConfigurationState,
): boolean {
  if (appointment.operationalStatus !== 'EXPECTED') return false;
  const warehouse = exactWarehouse(configuration, appointment.warehouseId);
  if (typeof warehouse === 'string') return false;
  const reference = parseCivilMinute(referenceAt);
  const planned = plannedMinute(appointment);
  return Number.isFinite(reference)
    && Number.isFinite(planned)
    && reference >= planned + warehouse.noShowThresholdMinutes * 60 * 1000;
}

export function confirmNoShow(
  state: GateOpsState,
  appointmentId: string,
  actorId: string,
  decision: WorkflowRoutingDecision,
  reason: string,
  referenceAt: string,
  configuration: DemoConfigurationState,
): GateActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (!transitionAllowed(appointment.operationalStatus, 'NO_SHOW')) {
    return failure(state, 'Only an EXPECTED appointment can be confirmed as No Show.');
  }
  if (!routingAllows(decision, appointment, actorId, routedActions.noShow)) {
    return failure(state, 'The active actor is not the routed No Show actor.');
  }
  if (!isPotentialNoShow(appointment, referenceAt, configuration)) {
    return failure(state, 'The appointment has not reached the configured potential No Show threshold.');
  }
  const missingReason = required(reason, 'Reason');
  if (missingReason) return failure(state, missingReason);
  return success(
    state,
    appointment,
    { ...appointment, operationalStatus: 'NO_SHOW' },
    'CONFIRM_NO_SHOW',
    actorId,
    decision.outcome,
    reason.trim(),
  );
}

export function correctGateRegistration(
  state: GateOpsState,
  appointmentId: string,
  actor: DemoActor,
  tractorRegistration: string,
  trailerOrContainerRegistration: string,
  reason: string,
): GateActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (!actorIsSecurityInScope(actor, appointment)) {
    return failure(state, 'Only an assigned Security Officer may correct gate registration evidence.');
  }
  const missing = required(tractorRegistration, 'Gate tractor registration')
    ?? required(trailerOrContainerRegistration, 'Gate trailer or container registration')
    ?? required(reason, 'Reason');
  if (missing) return failure(state, missing);
  if (normalize(tractorRegistration) === normalize(appointment.gateTractorRegistration)
    && normalize(trailerOrContainerRegistration)
      === normalize(appointment.gateTrailerOrContainerRegistration)) {
    return failure(state, 'The gate registration evidence is unchanged.');
  }
  return success(
    state,
    appointment,
    {
      ...appointment,
      gateTractorRegistration: tractorRegistration.trim(),
      gateTrailerOrContainerRegistration: trailerOrContainerRegistration.trim(),
      registrationCorrectionAcknowledged: true,
    },
    'CORRECT_REGISTRATION',
    actor.userId,
    'ROLE_SCOPED',
    reason.trim(),
  );
}

export function addGateNote(
  state: GateOpsState,
  appointmentId: string,
  actor: DemoActor,
  note: string,
): GateActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (!actorIsSecurityInScope(actor, appointment)) {
    return failure(state, 'Only an assigned Security Officer may add a gate note.');
  }
  const missingNote = required(note, 'Gate note');
  if (missingNote) return failure(state, missingNote);
  return success(
    state,
    appointment,
    { ...appointment, gateNotes: [...appointment.gateNotes, note.trim()] },
    'ADD_GATE_NOTE',
    actor.userId,
    'ROLE_SCOPED',
    note.trim(),
  );
}

export function createUnannouncedVisit(
  state: GateOpsState,
  actor: DemoActor,
  input: {
    warehouseId: WarehouseId;
    supplierOrganizationId: SupplierOrganizationId;
    purchaseOrderNumber: string;
    tractorRegistration: string;
    trailerOrContainerRegistration: string;
    driverIdentification: string;
    reason: string;
  },
  configuration: DemoConfigurationState,
): GateActionResult {
  if (actor.role !== 'Security Officer' || !actor.warehouseIds.includes(input.warehouseId)) {
    return failure(state, 'Only an assigned Security Officer may create an unannounced visit.');
  }
  const missing = required(input.purchaseOrderNumber, 'Purchase order number')
    ?? required(input.tractorRegistration, 'Tractor registration')
    ?? required(input.trailerOrContainerRegistration, 'Trailer or container registration')
    ?? required(input.driverIdentification, 'Driver identification')
    ?? required(input.reason, 'Reason');
  if (missing) return failure(state, missing);
  const warehouse = exactWarehouse(configuration, input.warehouseId);
  if (typeof warehouse === 'string') return failure(state, warehouse);
  const suppliers = configuration.suppliers.filter((supplier) =>
    supplier.organizationId === input.supplierOrganizationId);
  if (suppliers.length !== 1 || suppliers[0].status !== 'active'
    || !suppliers[0].warehouseIds.includes(input.warehouseId)
    || !warehouse.supplierOrganizationIds.includes(input.supplierOrganizationId)) {
    return failure(state, 'An active Supplier assigned to the warehouse is required.');
  }
  const duplicate = state.unannouncedVisits.some((visit) =>
    visit.warehouseId === input.warehouseId
    && normalize(visit.purchaseOrderNumber) === normalize(input.purchaseOrderNumber)
    && normalize(visit.tractorRegistration) === normalize(input.tractorRegistration)
    && visit.state === 'PENDING_DECISION');
  if (duplicate) return failure(state, 'An equivalent unannounced visit is already pending decision.');

  const sequence = state.unannouncedVisits.length + 1;
  const visit: UnannouncedVisit = {
    id: `unannounced-gate-${sequence.toString().padStart(3, '0')}`,
    warehouseId: input.warehouseId,
    supplierOrganizationId: input.supplierOrganizationId,
    purchaseOrderNumber: input.purchaseOrderNumber.trim(),
    tractorRegistration: input.tractorRegistration.trim(),
    trailerOrContainerRegistration: input.trailerOrContainerRegistration.trim(),
    driverIdentification: input.driverIdentification.trim(),
    origin: 'UNANNOUNCED_GATE',
    state: 'PENDING_DECISION',
    lifecycleStatus: null,
    plannedDate: null,
    plannedTime: null,
    dockId: null,
    capacityReserved: false,
    createdByActorId: actor.userId,
    reason: input.reason.trim(),
  };
  return {
    state: { ...state, unannouncedVisits: [...state.unannouncedVisits, visit] },
    error: null,
  };
}

export function gateCapacityAppointmentIds(state: GateOpsState): readonly string[] {
  return state.appointments
    .filter((appointment) =>
      appointment.lifecycleStatus === 'CONFIRMED'
      && appointment.operationalStatus !== 'NO_SHOW'
      && appointment.operationalStatus !== 'CHECKED_OUT')
    .map((appointment) => appointment.id)
    .sort();
}

export function operatorAppointmentCreationBoundary(): string {
  return 'Blocked: operator-created appointment requires a reusable lifecycle approval handoff and cannot be invented inside gate operations.';
}

export { routedActions, operationalTransitions };
