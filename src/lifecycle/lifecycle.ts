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

function cloneAppointment(appointment: LifecycleAppointment): LifecycleAppointment {
  return {
    ...appointment,
    skuLines: appointment.skuLines.map((line) => ({ ...line })),
  };
}

function snapshot(appointment: LifecycleAppointment): string {
  return JSON.stringify({
    id: appointment.id,
    appointmentStatus: appointment.appointmentStatus,
    changeStatus: appointment.changeStatus,
    operationalStatus: appointment.operationalStatus,
    plannedDate: appointment.plannedDate,
    plannedTime: appointment.plannedTime,
    bookingOrigin: appointment.bookingOrigin,
    planningState: appointment.planningState,
    tractorRegistration: appointment.tractorRegistration,
    trailerOrContainerRegistration: appointment.trailerOrContainerRegistration,
  });
}

function appendHistory(
  state: LifecycleState,
  appointment: LifecycleAppointment,
  updated: LifecycleAppointment,
  action: LifecycleHistoryAction,
  actorId: string,
  reason: string,
): LifecycleState {
  const sequence = state.history.length + 1;
  return {
    appointments: state.appointments.map((candidate) =>
      candidate.id === updated.id ? updated : candidate),
    history: [
      ...state.history,
      {
        id: `lifecycle-history-${sequence.toString().padStart(3, '0')}`,
        sequence,
        appointmentId: appointment.id,
        action,
        actorId,
        reason,
        sourceStatus: appointment.appointmentStatus,
        targetStatus: updated.appointmentStatus,
        before: snapshot(appointment),
        after: snapshot(updated),
      },
    ],
  };
}

function requiredReason(reason: string): string | null {
  return reason.trim().length > 0 ? null : 'A reason is required.';
}

function findAppointment(state: LifecycleState, appointmentId: string): LifecycleAppointment | null {
  return state.appointments.find((appointment) => appointment.id === appointmentId) ?? null;
}

function exactConfiguration(
  configuration: DemoConfigurationState,
  appointment: LifecycleAppointment,
): string | null {
  const warehouses = configuration.warehouses.filter((warehouse) =>
    warehouse.id === appointment.warehouseId);
  if (warehouses.length === 0) return 'Warehouse configuration is missing.';
  if (warehouses.length > 1) return 'Warehouse configuration is ambiguous.';
  if (warehouses[0].status !== 'published') return 'Warehouse configuration is not published.';

  const suppliers = configuration.suppliers.filter((supplier) =>
    supplier.organizationId === appointment.supplierOrganizationId);
  if (suppliers.length === 0) return 'Supplier configuration is missing.';
  if (suppliers.length > 1) return 'Supplier configuration is ambiguous.';
  if (!suppliers[0].warehouseIds.includes(appointment.warehouseId)) {
    return 'Supplier is not assigned to the appointment warehouse.';
  }
  return null;
}

function routingDecisionMatches(
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
  return routingDecisionMatches(decision, appointment, step, capability)
    && workflowDecisionAllowsActor(decision, actorId);
}

function actorCanChangeAppointment(actor: DemoActor, appointment: LifecycleAppointment): boolean {
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

function capacityHolding(status: LifecyclePlanningStatus): boolean {
  return status === 'SUBMITTED' || status === 'PENDING_APPROVAL' || status === 'CONFIRMED';
}

function toPlanningAppointment(appointment: LifecycleAppointment): PlanningAppointment {
  return {
    ...appointment,
    appointmentStatus: appointment.appointmentStatus,
  };
}

function activePlanningAppointments(
  state: LifecycleState,
  excludedAppointmentId?: string,
): readonly PlanningAppointment[] {
  return state.appointments
    .filter((appointment) =>
      appointment.id !== excludedAppointmentId && capacityHolding(appointment.appointmentStatus))
    .map(toPlanningAppointment);
}

function compatibleSlotError(
  state: LifecycleState,
  appointment: LifecycleAppointment,
  plannedDate: string,
  plannedTime: string,
  configuration: DemoConfigurationState,
): string | null {
  const candidate: LifecycleAppointment = { ...appointment, plannedDate, plannedTime };
  const projected = buildPlanningCalendar(
    [...activePlanningAppointments(state, appointment.id), toPlanningAppointment(candidate)],
    configuration.warehouses,
  ).find((card) => card.appointment.id === appointment.id);
  return projected?.conflict?.message ?? (projected ? null : 'Capacity configuration could not be evaluated.');
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
  const referenceTime = Date.parse(referenceDateTime);
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
      };
    }),
    history: [],
  };
}

export function evaluateSubmittedAppointment(
  state: LifecycleState,
  appointmentId: string,
  actorId: string,
  reason: string,
  configuration: DemoConfigurationState,
  approvalDecision: WorkflowRoutingDecision,
): LifecycleActionResult {
  const appointment = findAppointment(state, appointmentId);
  if (!appointment) return { state, error: 'Appointment is missing.' };
  if (appointment.appointmentStatus !== 'SUBMITTED') {
    return { state, error: 'Only a SUBMITTED appointment can be evaluated.' };
  }
  const reasonError = requiredReason(reason);
  if (reasonError) return { state, error: reasonError };
  const configurationError = exactConfiguration(configuration, appointment);
  if (configurationError) return { state, error: configurationError };

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
    if (!routingDecisionMatches(
      approvalDecision,
      appointment,
      'MANUAL_APPROVAL',
      'APPROVE_APPOINTMENT',
    )) {
      return { state, error: 'Approval routing evidence does not match this appointment.' };
    }
    if (approvalDecision.outcome === 'BLOCK' || approvalDecision.outcome === 'SKIP'
      || approvalDecision.selectedActor === null) {
      return { state, error: 'Manual approval is blocked because no authorized approver is available.' };
    }
  }

  const updated: LifecycleAppointment = {
    ...appointment,
    appointmentStatus: mode === 'auto' ? 'CONFIRMED' : 'PENDING_APPROVAL',
  };
  return {
    state: appendHistory(
      state,
      appointment,
      updated,
      'EVALUATE_APPROVAL',
      actorId,
      reason.trim(),
    ),
    error: null,
  };
}

export function approveAppointment(
  state: LifecycleState,
  appointmentId: string,
  actorId: string,
  reason: string,
  decision: WorkflowRoutingDecision,
): LifecycleActionResult {
  const appointment = findAppointment(state, appointmentId);
  if (!appointment) return { state, error: 'Appointment is missing.' };
  if (appointment.appointmentStatus !== 'PENDING_APPROVAL') {
    return { state, error: 'Only a PENDING_APPROVAL appointment can be approved.' };
  }
  const reasonError = requiredReason(reason);
  if (reasonError) return { state, error: reasonError };
  if (!routingAllows(
    decision,
    appointment,
    actorId,
    'MANUAL_APPROVAL',
    'APPROVE_APPOINTMENT',
  )) {
    return { state, error: 'The active actor is not the routed approver.' };
  }
  const updated = { ...appointment, appointmentStatus: 'CONFIRMED' as const };
  return {
    state: appendHistory(state, appointment, updated, 'APPROVE', actorId, reason.trim()),
    error: null,
  };
}

export function rejectAppointment(
  state: LifecycleState,
  appointmentId: string,
  actorId: string,
  reason: string,
  decision: WorkflowRoutingDecision,
): LifecycleActionResult {
  const appointment = findAppointment(state, appointmentId);
  if (!appointment) return { state, error: 'Appointment is missing.' };
  if (appointment.appointmentStatus !== 'PENDING_APPROVAL') {
    return { state, error: 'Only a PENDING_APPROVAL appointment can be rejected.' };
  }
  const reasonError = requiredReason(reason);
  if (reasonError) return { state, error: reasonError };
  if (!routingAllows(
    decision,
    appointment,
    actorId,
    'MANUAL_REJECTION',
    'REJECT_APPOINTMENT',
  )) {
    return { state, error: 'The active actor is not the routed rejector.' };
  }
  const updated = { ...appointment, appointmentStatus: 'REJECTED' as const };
  return {
    state: appendHistory(state, appointment, updated, 'REJECT', actorId, reason.trim()),
    error: null,
  };
}

export function requestAppointmentData(
  state: LifecycleState,
  appointmentId: string,
  actorId: string,
  reason: string,
  decision: WorkflowRoutingDecision,
): LifecycleActionResult {
  const appointment = findAppointment(state, appointmentId);
  if (!appointment) return { state, error: 'Appointment is missing.' };
  if (appointment.appointmentStatus !== 'PENDING_APPROVAL') {
    return { state, error: 'Data can be requested only for a PENDING_APPROVAL appointment.' };
  }
  const reasonError = requiredReason(reason);
  if (reasonError) return { state, error: reasonError };
  if (!routingAllows(
    decision,
    appointment,
    actorId,
    'REQUEST_APPOINTMENT_DATA',
    'REQUEST_APPOINTMENT_DATA',
  )) {
    return { state, error: 'The active actor is not routed to request appointment data.' };
  }
  const updated: LifecycleAppointment = {
    ...appointment,
    changeStatus: 'SUPPLIER_ACTION_REQUIRED',
  };
  return {
    state: appendHistory(state, appointment, updated, 'REQUEST_DATA', actorId, reason.trim()),
    error: null,
  };
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
  const appointment = findAppointment(state, appointmentId);
  if (!appointment) return { state, error: 'Appointment is missing.' };
  if (!actorCanChangeAppointment(actor, appointment)) {
    return { state, error: 'The active actor cannot reschedule this appointment.' };
  }
  if (!['SUBMITTED', 'PENDING_APPROVAL', 'CONFIRMED'].includes(appointment.appointmentStatus)) {
    return { state, error: 'The appointment status does not allow rescheduling.' };
  }
  const reasonError = requiredReason(reason);
  if (reasonError) return { state, error: reasonError };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) || !/^\d{2}:\d{2}$/.test(plannedTime)) {
    return { state, error: 'A valid explicit replacement date and time are required.' };
  }
  const configurationError = exactConfiguration(configuration, appointment);
  if (configurationError) return { state, error: configurationError };
  const afterCutOff = isAfterCutOff(appointment, configuration, referenceDateTime);
  if (afterCutOff === null) return { state, error: 'Cut-off could not be evaluated.' };

  if (afterCutOff && (actor.role === 'Supplier Administrator' || actor.role === 'Supplier User')) {
    const updated: LifecycleAppointment = {
      ...appointment,
      changeStatus: 'RESCHEDULE_REQUESTED',
    };
    return {
      state: appendHistory(
        state,
        appointment,
        updated,
        'REQUEST_RESCHEDULE',
        actor.userId,
        reason.trim(),
      ),
      error: null,
    };
  }

  const slotError = compatibleSlotError(
    state,
    appointment,
    plannedDate,
    plannedTime,
    configuration,
  );
  if (slotError) return { state, error: slotError };
  const updated: LifecycleAppointment = {
    ...appointment,
    plannedDate,
    plannedTime,
    changeStatus: 'NO_CHANGE_REQUEST',
  };
  return {
    state: appendHistory(state, appointment, updated, 'RESCHEDULE', actor.userId, reason.trim()),
    error: null,
  };
}

export function cancelAppointment(
  state: LifecycleState,
  appointmentId: string,
  actor: DemoActor,
  reason: string,
): LifecycleActionResult {
  const appointment = findAppointment(state, appointmentId);
  if (!appointment) return { state, error: 'Appointment is missing.' };
  if (!actorCanChangeAppointment(actor, appointment)) {
    return { state, error: 'The active actor cannot cancel this appointment.' };
  }
  if (!['SUBMITTED', 'PENDING_APPROVAL', 'CONFIRMED'].includes(appointment.appointmentStatus)) {
    return { state, error: 'The appointment status does not allow cancellation.' };
  }
  const reasonError = requiredReason(reason);
  if (reasonError) return { state, error: reasonError };
  const updated: LifecycleAppointment = {
    ...appointment,
    appointmentStatus: 'CANCELLED',
    changeStatus: 'NO_CHANGE_REQUEST',
  };
  return {
    state: appendHistory(state, appointment, updated, 'CANCEL', actor.userId, reason.trim()),
    error: null,
  };
}

export function restoreCancelledAppointment(
  state: LifecycleState,
  appointmentId: string,
  actor: DemoActor,
  reason: string,
  configuration: DemoConfigurationState,
): LifecycleActionResult {
  const appointment = findAppointment(state, appointmentId);
  if (!appointment) return { state, error: 'Appointment is missing.' };
  if (actor.role !== 'System Administrator') {
    return { state, error: 'Only System Administrator can restore a cancelled appointment.' };
  }
  if (appointment.appointmentStatus !== 'CANCELLED') {
    return { state, error: 'Only a CANCELLED appointment can be restored.' };
  }
  const reasonError = requiredReason(reason);
  if (reasonError) return { state, error: reasonError };
  const configurationError = exactConfiguration(configuration, appointment);
  if (configurationError) return { state, error: configurationError };
  const slotError = compatibleSlotError(
    state,
    appointment,
    appointment.plannedDate,
    appointment.plannedTime,
    configuration,
  );
  if (slotError) return { state, error: slotError };
  const updated: LifecycleAppointment = {
    ...appointment,
    appointmentStatus: 'CONFIRMED',
  };
  return {
    state: appendHistory(
      state,
      appointment,
      updated,
      'RESTORE_CANCELLED',
      actor.userId,
      reason.trim(),
    ),
    error: null,
  };
}

export function lifecycleCapacityAppointmentIds(state: LifecycleState): readonly string[] {
  return state.appointments
    .filter((appointment) => capacityHolding(appointment.appointmentStatus))
    .map((appointment) => appointment.id)
    .sort();
}

export function roleMayOpenLifecycle(role: UiMvpRole): boolean {
  return role !== 'Security Officer';
}
