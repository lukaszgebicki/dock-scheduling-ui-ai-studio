import type { DemoActor, UiMvpRole } from '../demoDomain/demoDomain';
import {
  evaluateApproval,
  type ApprovalRequest,
  type DemoConfigurationState,
  type DeliveryFlow,
} from '../demoDomain/configuration';
import {
  workflowDecisionAllowsActor,
  type WorkflowRoutingDecision,
} from '../demoDomain/workflowRouting';
import {
  buildPlanningCalendar,
  type PlanningAppointment,
} from '../calendar/planningCalendar';

export const lifecyclePlanningStatuses = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
] as const;
export type LifecyclePlanningStatus = (typeof lifecyclePlanningStatuses)[number];

export const lifecycleChangeStatuses = [
  'NO_CHANGE_REQUEST',
  'RESCHEDULE_REQUESTED',
  'SLOT_PROPOSED',
  'SUPPLIER_ACTION_REQUIRED',
] as const;
export type LifecycleChangeStatus = (typeof lifecycleChangeStatuses)[number];

export const lifecycleOperationalStatuses = [
  'EXPECTED',
  'CHECKED_IN',
  'WAITING_FOR_DOCK',
  'AT_DOCK',
  'UNLOADING',
  'COMPLETED',
  'CHECKED_OUT',
  'NO_SHOW',
] as const;
export type LifecycleOperationalStatus = (typeof lifecycleOperationalStatuses)[number];

export type LifecycleHistoryAction =
  | 'SUBMIT'
  | 'EVALUATE_APPROVAL'
  | 'APPROVE'
  | 'REJECT'
  | 'REQUEST_DATA'
  | 'RESCHEDULE'
  | 'REQUEST_RESCHEDULE'
  | 'CANCEL'
  | 'RESTORE_CANCELLED';

export interface LifecycleAppointment extends Omit<PlanningAppointment, 'appointmentStatus'> {
  appointmentStatus: LifecyclePlanningStatus;
  changeStatus: LifecycleChangeStatus;
  operationalStatus: LifecycleOperationalStatus;
  flow: DeliveryFlow;
  isAdr: boolean;
  hasRequiredDocument: boolean;
  lateCancellation: boolean;
}

export interface LifecycleHistoryEntry {
  id: string;
  sequence: number;
  appointmentId: string;
  action: LifecycleHistoryAction;
  actorId: string;
  reason: string;
  sourceStatus: LifecyclePlanningStatus;
  targetStatus: LifecyclePlanningStatus;
  before: string;
  after: string;
}

export interface LifecycleState {
  appointments: readonly LifecycleAppointment[];
  history: readonly LifecycleHistoryEntry[];
}

export interface LifecycleActionResult {
  state: LifecycleState;
  error: string | null;
}

function isLifecyclePlanningStatus(value: string): value is LifecyclePlanningStatus {
  return lifecyclePlanningStatuses.some((status) => status === value);
}

function snapshot(appointment: LifecycleAppointment): string {
  return JSON.stringify({
    id: appointment.id,
    appointmentStatus: appointment.appointmentStatus,
    changeStatus: appointment.changeStatus,
    operationalStatus: appointment.operationalStatus,
    lateCancellation: appointment.lateCancellation,
    plannedDate: appointment.plannedDate,
    plannedTime: appointment.plannedTime,
    bookingOrigin: appointment.bookingOrigin,
    planningState: appointment.planningState,
    tractorRegistration: appointment.tractorRegistration,
    trailerOrContainerRegistration: appointment.trailerOrContainerRegistration,
  });
}

function success(
  state: LifecycleState,
  before: LifecycleAppointment,
  after: LifecycleAppointment,
  action: LifecycleHistoryAction,
  actorId: string,
  reason: string,
): LifecycleActionResult {
  const sequence = state.history.length + 1;
  return {
    state: {
      appointments: state.appointments.map((appointment) =>
        appointment.id === after.id ? after : appointment),
      history: [
        ...state.history,
        {
          id: `lifecycle-history-${sequence.toString().padStart(3, '0')}`,
          sequence,
          appointmentId: before.id,
          action,
          actorId,
          reason,
          sourceStatus: before.appointmentStatus,
          targetStatus: after.appointmentStatus,
          before: snapshot(before),
          after: snapshot(after),
        },
      ],
    },
    error: null,
  };
}

function failure(state: LifecycleState, error: string): LifecycleActionResult {
  return { state, error };
}

function getAppointment(
  state: LifecycleState,
  appointmentId: string,
): LifecycleAppointment | null {
  return state.appointments.find((appointment) => appointment.id === appointmentId) ?? null;
}

function reasonError(reason: string): string | null {
  return reason.trim().length > 0 ? null : 'A reason is required.';
}

function configurationError(
  configuration: DemoConfigurationState,
  appointment: LifecycleAppointment,
  requireFlowCompatibility: boolean,
): string | null {
  const warehouses = configuration.warehouses.filter((warehouse) =>
    warehouse.id === appointment.warehouseId);
  if (warehouses.length === 0) return 'Warehouse configuration is missing.';
  if (warehouses.length > 1) return 'Warehouse configuration is ambiguous.';
  const warehouse = warehouses[0];
  if (warehouse.status !== 'published') return 'Warehouse configuration is not published.';

  const suppliers = configuration.suppliers.filter((supplier) =>
    supplier.organizationId === appointment.supplierOrganizationId);
  if (suppliers.length === 0) return 'Supplier configuration is missing.';
  if (suppliers.length > 1) return 'Supplier configuration is ambiguous.';
  const supplier = suppliers[0];
  if (!supplier.warehouseIds.includes(appointment.warehouseId)) {
    return 'Supplier is not assigned to the appointment warehouse.';
  }
  if (requireFlowCompatibility
    && (!warehouse.availableFlows.includes(appointment.flow)
      || !supplier.allowedFlows.includes(appointment.flow))) {
    return 'Appointment flow is incompatible with the published configuration.';
  }
  return null;
}

function routingMatches(
  decision: WorkflowRoutingDecision,
  appointment: LifecycleAppointment,
  step: WorkflowRoutingDecision['step'],
  capability: WorkflowRoutingDecision['capability'],
): boolean {
  return decision.step === step
    && decision.capability === capability
    && decision.evidence.scope.warehouseId === appointment.warehouseId;
}

function routingAllows(
  decision: WorkflowRoutingDecision,
  appointment: LifecycleAppointment,
  actorId: string,
  step: WorkflowRoutingDecision['step'],
  capability: WorkflowRoutingDecision['capability'],
): boolean {
  return routingMatches(decision, appointment, step, capability)
    && workflowDecisionAllowsActor(decision, actorId);
}

function actorCanChange(actor: DemoActor, appointment: LifecycleAppointment): boolean {
  if (actor.role === 'System Administrator') return true;
  if (actor.role === 'Warehouse Administrator') {
    return actor.warehouseIds.includes(appointment.warehouseId);
  }
  if (actor.role === 'Supplier Administrator' || actor.role === 'Supplier User') {
    return actor.supplierOrganizationId === appointment.supplierOrganizationId
      && actor.warehouseIds.includes(appointment.warehouseId);
  }
  return false;
}

function actorCanEvaluate(actor: DemoActor, appointment: LifecycleAppointment): boolean {
  return actor.role === 'System Administrator'
    || (actor.role === 'Warehouse Administrator'
      && actor.warehouseIds.includes(appointment.warehouseId));
}

function holdsCapacity(status: LifecyclePlanningStatus): boolean {
  return status === 'SUBMITTED' || status === 'PENDING_APPROVAL' || status === 'CONFIRMED';
}

function toPlanningAppointment(appointment: LifecycleAppointment): PlanningAppointment {
  return { ...appointment, appointmentStatus: appointment.appointmentStatus };
}

function activePlanningAppointments(
  state: LifecycleState,
  excludedAppointmentId?: string,
): readonly PlanningAppointment[] {
  return state.appointments
    .filter((appointment) =>
      appointment.id !== excludedAppointmentId && holdsCapacity(appointment.appointmentStatus))
    .map(toPlanningAppointment);
}

function compatibleSlotError(
  state: LifecycleState,
  appointment: LifecycleAppointment,
  plannedDate: string,
  plannedTime: string,
  configuration: DemoConfigurationState,
): string | null {
  const candidate = { ...appointment, plannedDate, plannedTime };
  const card = buildPlanningCalendar(
    [...activePlanningAppointments(state, appointment.id), toPlanningAppointment(candidate)],
    configuration.warehouses,
  ).find((item) => item.appointment.id === appointment.id);
  return card?.conflict?.message ?? (card ? null : 'Capacity configuration could not be evaluated.');
}

function parseReferenceTime(value: string): number {
  const civilMinute = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
  return Date.parse(civilMinute ? `${value}:00Z` : value);
}

function isAfterCutOff(
  appointment: LifecycleAppointment,
  configuration: DemoConfigurationState,
  referenceDateTime: string,
): boolean | null {
  const warehouses = configuration.warehouses.filter((warehouse) =>
    warehouse.id === appointment.warehouseId);
  if (warehouses.length !== 1 || warehouses[0].status !== 'published') return null;
  const appointmentTime = Date.parse(`${appointment.plannedDate}T${appointment.plannedTime}:00Z`);
  const referenceTime = parseReferenceTime(referenceDateTime);
  if (!Number.isFinite(appointmentTime) || !Number.isFinite(referenceTime)) return null;
  return referenceTime >= appointmentTime - warehouses[0].cutOffHours * 60 * 60 * 1000;
}

export function createLifecycleState(
  appointments: readonly PlanningAppointment[],
): LifecycleState {
  return {
    appointments: appointments.map((appointment) => {
      if (!isLifecyclePlanningStatus(appointment.appointmentStatus)) {
        throw new Error(`Unsupported lifecycle status: ${appointment.appointmentStatus}`);
      }
      return {
        ...appointment,
        skuLines: appointment.skuLines.map((line) => ({ ...line })),
        appointmentStatus: appointment.appointmentStatus,
        changeStatus: 'NO_CHANGE_REQUEST',
        operationalStatus: 'EXPECTED',
        flow: 'Material Delivery',
        isAdr: appointment.id === 'planning-northstar-1001',
        hasRequiredDocument: true,
        lateCancellation: false,
      };
    }),
    history: [],
  };
}

export function submitDraftAppointment(
  state: LifecycleState,
  appointmentId: string,
  actor: DemoActor,
  reason: string,
  configuration: DemoConfigurationState,
): LifecycleActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (appointment.appointmentStatus !== 'DRAFT') {
    return failure(state, 'Only a DRAFT appointment can be submitted.');
  }
  if (!actorCanChange(actor, appointment)) {
    return failure(state, 'The active actor cannot submit this appointment.');
  }
  const missingReason = reasonError(reason);
  if (missingReason) return failure(state, missingReason);
  const invalidConfiguration = configurationError(configuration, appointment, true);
  if (invalidConfiguration) return failure(state, invalidConfiguration);
  const invalidSlot = compatibleSlotError(
    state,
    appointment,
    appointment.plannedDate,
    appointment.plannedTime,
    configuration,
  );
  if (invalidSlot) return failure(state, invalidSlot);
  return success(
    state,
    appointment,
    { ...appointment, appointmentStatus: 'SUBMITTED' },
    'SUBMIT',
    actor.userId,
    reason.trim(),
  );
}

export function evaluateSubmittedAppointment(
  state: LifecycleState,
  appointmentId: string,
  actor: DemoActor,
  reason: string,
  configuration: DemoConfigurationState,
  approvalDecision: WorkflowRoutingDecision,
): LifecycleActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (appointment.appointmentStatus !== 'SUBMITTED') {
    return failure(state, 'Only a SUBMITTED appointment can be evaluated.');
  }
  if (!actorCanEvaluate(actor, appointment)) {
    return failure(state, 'The active actor cannot evaluate approval in this warehouse.');
  }
  const missingReason = reasonError(reason);
  if (missingReason) return failure(state, missingReason);
  const invalidConfiguration = configurationError(configuration, appointment, true);
  if (invalidConfiguration) return failure(state, invalidConfiguration);

  const request: ApprovalRequest = {
    warehouseId: appointment.warehouseId,
    supplierOrganizationId: appointment.supplierOrganizationId,
    flow: appointment.flow,
    isAdr: appointment.isAdr,
    hasRequiredDocument: appointment.hasRequiredDocument,
    hasPurchaseOrder: appointment.purchaseOrderNumber.trim().length > 0,
  };
  const mode = evaluateApproval(configuration, request);
  if (mode === 'manual') {
    const routed = routingMatches(
      approvalDecision,
      appointment,
      'MANUAL_APPROVAL',
      'APPROVE_APPOINTMENT',
    );
    const availableApprover = (approvalDecision.outcome === 'RUN'
      || approvalDecision.outcome === 'DELEGATE')
      && approvalDecision.selectedActor !== null;
    if (!routed || !availableApprover) {
      return failure(state, 'Manual approval is blocked because no authorized approver is available.');
    }
  }

  return success(
    state,
    appointment,
    {
      ...appointment,
      appointmentStatus: mode === 'auto' ? 'CONFIRMED' : 'PENDING_APPROVAL',
    },
    'EVALUATE_APPROVAL',
    actor.userId,
    reason.trim(),
  );
}

export function approveAppointment(
  state: LifecycleState,
  appointmentId: string,
  actorId: string,
  reason: string,
  decision: WorkflowRoutingDecision,
): LifecycleActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (appointment.appointmentStatus !== 'PENDING_APPROVAL') {
    return failure(state, 'Only a PENDING_APPROVAL appointment can be approved.');
  }
  const missingReason = reasonError(reason);
  if (missingReason) return failure(state, missingReason);
  if (!routingAllows(
    decision,
    appointment,
    actorId,
    'MANUAL_APPROVAL',
    'APPROVE_APPOINTMENT',
  )) {
    return failure(state, 'The active actor is not the routed approver.');
  }
  return success(
    state,
    appointment,
    { ...appointment, appointmentStatus: 'CONFIRMED' },
    'APPROVE',
    actorId,
    reason.trim(),
  );
}

export function rejectAppointment(
  state: LifecycleState,
  appointmentId: string,
  actorId: string,
  reason: string,
  decision: WorkflowRoutingDecision,
): LifecycleActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (appointment.appointmentStatus !== 'PENDING_APPROVAL') {
    return failure(state, 'Only a PENDING_APPROVAL appointment can be rejected.');
  }
  const missingReason = reasonError(reason);
  if (missingReason) return failure(state, missingReason);
  if (!routingAllows(
    decision,
    appointment,
    actorId,
    'MANUAL_REJECTION',
    'REJECT_APPOINTMENT',
  )) {
    return failure(state, 'The active actor is not the routed rejector.');
  }
  return success(
    state,
    appointment,
    { ...appointment, appointmentStatus: 'REJECTED' },
    'REJECT',
    actorId,
    reason.trim(),
  );
}

export function requestAppointmentData(
  state: LifecycleState,
  appointmentId: string,
  actorId: string,
  reason: string,
  decision: WorkflowRoutingDecision,
): LifecycleActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (appointment.appointmentStatus !== 'PENDING_APPROVAL') {
    return failure(state, 'Data can be requested only for a PENDING_APPROVAL appointment.');
  }
  if (appointment.changeStatus === 'SUPPLIER_ACTION_REQUIRED') {
    return failure(state, 'Supplier action is already required for this appointment.');
  }
  const missingReason = reasonError(reason);
  if (missingReason) return failure(state, missingReason);
  if (!routingAllows(
    decision,
    appointment,
    actorId,
    'REQUEST_APPOINTMENT_DATA',
    'REQUEST_APPOINTMENT_DATA',
  )) {
    return failure(state, 'The active actor is not routed to request appointment data.');
  }
  return success(
    state,
    appointment,
    { ...appointment, changeStatus: 'SUPPLIER_ACTION_REQUIRED' },
    'REQUEST_DATA',
    actorId,
    reason.trim(),
  );
}

export function rescheduleAppointment(
  state: LifecycleState,
  appointmentId: string,
  actor: DemoActor,
  reason: string,
  plannedDate: string,
  plannedTime: string,
  referenceDateTime: string,
  configuration: DemoConfigurationState,
): LifecycleActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (!actorCanChange(actor, appointment)) {
    return failure(state, 'The active actor cannot reschedule this appointment.');
  }
  if (!['SUBMITTED', 'PENDING_APPROVAL', 'CONFIRMED'].includes(appointment.appointmentStatus)) {
    return failure(state, 'The appointment status does not allow rescheduling.');
  }
  const missingReason = reasonError(reason);
  if (missingReason) return failure(state, missingReason);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) || !/^\d{2}:\d{2}$/.test(plannedTime)) {
    return failure(state, 'A valid explicit replacement date and time are required.');
  }
  const invalidConfiguration = configurationError(configuration, appointment, true);
  if (invalidConfiguration) return failure(state, invalidConfiguration);
  const afterCutOff = isAfterCutOff(appointment, configuration, referenceDateTime);
  if (afterCutOff === null) return failure(state, 'Cut-off could not be evaluated.');

  const isSupplier = actor.role === 'Supplier Administrator' || actor.role === 'Supplier User';
  if (afterCutOff && isSupplier) {
    if (appointment.changeStatus === 'RESCHEDULE_REQUESTED') {
      return failure(state, 'A reschedule is already requested for this appointment.');
    }
    return success(
      state,
      appointment,
      { ...appointment, changeStatus: 'RESCHEDULE_REQUESTED' },
      'REQUEST_RESCHEDULE',
      actor.userId,
      reason.trim(),
    );
  }

  const invalidSlot = compatibleSlotError(
    state,
    appointment,
    plannedDate,
    plannedTime,
    configuration,
  );
  if (invalidSlot) return failure(state, invalidSlot);
  return success(
    state,
    appointment,
    { ...appointment, plannedDate, plannedTime, changeStatus: 'NO_CHANGE_REQUEST' },
    'RESCHEDULE',
    actor.userId,
    reason.trim(),
  );
}

export function cancelAppointment(
  state: LifecycleState,
  appointmentId: string,
  actor: DemoActor,
  reason: string,
  referenceDateTime: string,
  configuration: DemoConfigurationState,
): LifecycleActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (!actorCanChange(actor, appointment)) {
    return failure(state, 'The active actor cannot cancel this appointment.');
  }
  if (!['SUBMITTED', 'PENDING_APPROVAL', 'CONFIRMED'].includes(appointment.appointmentStatus)) {
    return failure(state, 'The appointment status does not allow cancellation.');
  }
  const missingReason = reasonError(reason);
  if (missingReason) return failure(state, missingReason);
  const invalidConfiguration = configurationError(configuration, appointment, false);
  if (invalidConfiguration) return failure(state, invalidConfiguration);
  const afterCutOff = isAfterCutOff(appointment, configuration, referenceDateTime);
  if (afterCutOff === null) return failure(state, 'Cut-off could not be evaluated.');
  return success(
    state,
    appointment,
    {
      ...appointment,
      appointmentStatus: 'CANCELLED',
      changeStatus: 'NO_CHANGE_REQUEST',
      lateCancellation: afterCutOff,
    },
    'CANCEL',
    actor.userId,
    reason.trim(),
  );
}

export function restoreCancelledAppointment(
  state: LifecycleState,
  appointmentId: string,
  actor: DemoActor,
  reason: string,
  configuration: DemoConfigurationState,
): LifecycleActionResult {
  const appointment = getAppointment(state, appointmentId);
  if (!appointment) return failure(state, 'Appointment is missing.');
  if (actor.role !== 'System Administrator') {
    return failure(state, 'Only System Administrator can restore a cancelled appointment.');
  }
  if (appointment.appointmentStatus !== 'CANCELLED') {
    return failure(state, 'Only a CANCELLED appointment can be restored.');
  }
  const missingReason = reasonError(reason);
  if (missingReason) return failure(state, missingReason);
  const invalidConfiguration = configurationError(configuration, appointment, true);
  if (invalidConfiguration) return failure(state, invalidConfiguration);
  const invalidSlot = compatibleSlotError(
    state,
    appointment,
    appointment.plannedDate,
    appointment.plannedTime,
    configuration,
  );
  if (invalidSlot) return failure(state, invalidSlot);
  return success(
    state,
    appointment,
    { ...appointment, appointmentStatus: 'CONFIRMED', lateCancellation: false },
    'RESTORE_CANCELLED',
    actor.userId,
    reason.trim(),
  );
}

export function lifecycleCapacityAppointmentIds(state: LifecycleState): readonly string[] {
  return state.appointments
    .filter((appointment) => holdsCapacity(appointment.appointmentStatus))
    .map((appointment) => appointment.id)
    .sort();
}

export function roleMayOpenLifecycle(role: UiMvpRole): boolean {
  return role !== 'Security Officer';
}
