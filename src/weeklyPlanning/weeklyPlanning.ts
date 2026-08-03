import type { WarehouseConfiguration } from '../demoDomain/configuration';
import type { FridayImportGroup, FridayImportLine } from '../import/fridayImport';
import {
  buildPlanningCalendar,
  type PlanningAppointment,
  type PlanningSkuLine,
} from '../calendar/planningCalendar';

export type WeeklyPlanningQueueState =
  | 'EXACT_READY'
  | 'TRANSPORT_CONFLICT'
  | 'UNSCHEDULED'
  | 'AMBIGUOUS'
  | 'INVALID'
  | 'DUPLICATE';

export interface WeeklyPlanningHistoryEntry {
  id: string;
  action: 'ATTACH_DETAILS' | 'SCHEDULE_UNRESERVED' | 'RESOLVE_AMBIGUOUS' | 'REPLACE_DETAILS';
  actorId: string;
  reason: string;
  groupFingerprint: string;
  targetAppointmentId: string;
  before: string;
  after: string;
}

export interface WeeklyPlanningQueueItem {
  group: FridayImportGroup;
  state: WeeklyPlanningQueueState;
  selectedTargetId: string | null;
  appliedAppointmentId: string | null;
}

export interface WeeklyPlanningState {
  appointments: readonly PlanningAppointment[];
  queue: readonly WeeklyPlanningQueueItem[];
  history: readonly WeeklyPlanningHistoryEntry[];
  appliedFingerprints: readonly string[];
}

export interface WeeklyPlanningActionResult {
  state: WeeklyPlanningState;
  error: string | null;
}

function queueState(group: FridayImportGroup): WeeklyPlanningQueueState {
  if (group.outcome === 'EXACT_MATCH') {
    return group.transportConflicts.length > 0 ? 'TRANSPORT_CONFLICT' : 'EXACT_READY';
  }
  if (group.outcome === 'NO_MATCH') return 'UNSCHEDULED';
  if (group.outcome === 'AMBIGUOUS_MATCH') return 'AMBIGUOUS';
  if (group.outcome === 'DUPLICATE_IMPORT') return 'DUPLICATE';
  return 'INVALID';
}

function snapshot(appointment: PlanningAppointment): string {
  return JSON.stringify({
    id: appointment.id,
    plannedDate: appointment.plannedDate,
    plannedTime: appointment.plannedTime,
    bookingOrigin: appointment.bookingOrigin,
    planningState: appointment.planningState,
    appointmentStatus: appointment.appointmentStatus,
    tractorRegistration: appointment.tractorRegistration,
    trailerOrContainerRegistration: appointment.trailerOrContainerRegistration,
    skuLines: appointment.skuLines,
  });
}

function toSkuLines(group: FridayImportGroup): readonly PlanningSkuLine[] {
  return group.lines.map((line: FridayImportLine, index) => ({
    id: `${group.fingerprint}-${index + 1}`,
    sku: line.sku,
    description: line.description,
    units: line.units,
    pallets: line.pallets,
    loadCarrierType: line.loadCarrierType,
    goodsCategory: line.goodsCategory,
    handling: line.handling,
    sourceRowId: String(line.rowNumber),
  }));
}

function replaceQueueItem(
  queue: readonly WeeklyPlanningQueueItem[],
  fingerprint: string,
  replacement: WeeklyPlanningQueueItem,
): readonly WeeklyPlanningQueueItem[] {
  return queue.map((item) => item.group.fingerprint === fingerprint ? replacement : item);
}

function historyEntry(
  state: WeeklyPlanningState,
  action: WeeklyPlanningHistoryEntry['action'],
  actorId: string,
  reason: string,
  groupFingerprint: string,
  targetAppointmentId: string,
  before: string,
  after: string,
): WeeklyPlanningHistoryEntry {
  return {
    id: `weekly-history-${state.history.length + 1}`,
    action,
    actorId,
    reason,
    groupFingerprint,
    targetAppointmentId,
    before,
    after,
  };
}

export function createWeeklyPlanningState(
  appointments: readonly PlanningAppointment[],
  groups: readonly FridayImportGroup[],
): WeeklyPlanningState {
  return {
    appointments: appointments.map((appointment) => ({
      ...appointment,
      skuLines: appointment.skuLines.map((line) => ({ ...line })),
    })),
    queue: groups.map((group) => ({
      group,
      state: queueState(group),
      selectedTargetId: null,
      appliedAppointmentId: null,
    })),
    history: [],
    appliedFingerprints: [],
  };
}

export function attachExactDetails(
  state: WeeklyPlanningState,
  fingerprint: string,
  actorId: string,
  reason: string,
  authorized: boolean,
  replaceExisting = false,
): WeeklyPlanningActionResult {
  if (!authorized) return { state, error: 'The active actor is not authorized to resolve planning evidence.' };
  if (!reason.trim()) return { state, error: 'A reason is required.' };
  const item = state.queue.find((candidate) => candidate.group.fingerprint === fingerprint);
  if (!item || item.state !== 'EXACT_READY') return { state, error: 'The selected group is not ready for exact enrichment.' };
  if (item.group.matchedAppointmentIds.length !== 1) return { state, error: 'Exact enrichment requires exactly one target.' };
  if (item.group.transportConflicts.length > 0) return { state, error: 'Transport conflicts must be resolved without overwriting Supplier values.' };

  const targetId = item.group.matchedAppointmentIds[0];
  const target = state.appointments.find((appointment) => appointment.id === targetId);
  if (!target) return { state, error: 'The exact target is missing.' };
  if (state.appliedFingerprints.includes(fingerprint) && !replaceExisting) {
    return { state, error: 'This exact evidence was already applied.' };
  }
  if (target.skuLines.length > 0 && !replaceExisting) {
    return { state, error: 'Existing SKU details require an explicit replacement action.' };
  }

  const before = snapshot(target);
  const updated: PlanningAppointment = {
    ...target,
    planningState: 'DETAILS_ATTACHED',
    skuLines: toSkuLines(item.group),
    importDiagnostic: 'EXACT_MATCH',
    batchLineage: item.group.fingerprint,
  };
  const appointments = state.appointments.map((appointment) => appointment.id === targetId ? updated : appointment);
  const nextItem = { ...item, appliedAppointmentId: targetId };
  const action = replaceExisting ? 'REPLACE_DETAILS' : 'ATTACH_DETAILS';
  const nextState: WeeklyPlanningState = {
    appointments,
    queue: replaceQueueItem(state.queue, fingerprint, nextItem),
    history: [...state.history, historyEntry(state, action, actorId, reason.trim(), fingerprint, targetId, before, snapshot(updated))],
    appliedFingerprints: state.appliedFingerprints.includes(fingerprint)
      ? state.appliedFingerprints
      : [...state.appliedFingerprints, fingerprint],
  };
  return { state: nextState, error: null };
}

export function resolveAmbiguousTarget(
  state: WeeklyPlanningState,
  fingerprint: string,
  targetAppointmentId: string,
  actorId: string,
  reason: string,
  authorized: boolean,
): WeeklyPlanningActionResult {
  if (!authorized) return { state, error: 'The active actor is not authorized to resolve planning conflicts.' };
  if (!reason.trim()) return { state, error: 'A reason is required.' };
  const item = state.queue.find((candidate) => candidate.group.fingerprint === fingerprint);
  if (!item || item.state !== 'AMBIGUOUS') return { state, error: 'The selected group is not ambiguous.' };
  if (!item.group.matchedAppointmentIds.includes(targetAppointmentId)) {
    return { state, error: 'The selected target is not one of the exact candidates.' };
  }
  const target = state.appointments.find((appointment) => appointment.id === targetAppointmentId);
  if (!target) return { state, error: 'The selected target is missing.' };
  const resolvedGroup: FridayImportGroup = {
    ...item.group,
    outcome: 'EXACT_MATCH',
    matchedAppointmentIds: [targetAppointmentId],
    diagnostics: [...item.group.diagnostics, `Administrator selected ${targetAppointmentId}.`],
  };
  const nextItem: WeeklyPlanningQueueItem = {
    group: resolvedGroup,
    state: resolvedGroup.transportConflicts.length > 0 ? 'TRANSPORT_CONFLICT' : 'EXACT_READY',
    selectedTargetId: targetAppointmentId,
    appliedAppointmentId: null,
  };
  const nextState: WeeklyPlanningState = {
    ...state,
    queue: replaceQueueItem(state.queue, fingerprint, nextItem),
    history: [...state.history, historyEntry(
      state,
      'RESOLVE_AMBIGUOUS',
      actorId,
      reason.trim(),
      fingerprint,
      targetAppointmentId,
      JSON.stringify(item.group.matchedAppointmentIds),
      JSON.stringify([targetAppointmentId]),
    )],
  };
  return { state: nextState, error: null };
}

export function scheduleUnreservedDelivery(
  state: WeeklyPlanningState,
  fingerprint: string,
  actorId: string,
  reason: string,
  authorized: boolean,
  plannedDate: string,
  plannedTime: string,
  warehouses: readonly WarehouseConfiguration[],
): WeeklyPlanningActionResult {
  if (!authorized) return { state, error: 'The active actor is not authorized to schedule unreserved deliveries.' };
  if (!reason.trim()) return { state, error: 'A reason is required.' };
  const item = state.queue.find((candidate) => candidate.group.fingerprint === fingerprint);
  if (!item || item.state !== 'UNSCHEDULED') return { state, error: 'The selected group is not in the unscheduled queue.' };
  if (!plannedDate || !/^\d{2}:\d{2}$/.test(plannedTime)) return { state, error: 'An explicit date and time are required.' };
  const warehouseId = item.group.identity.warehouseCode.toLowerCase() as PlanningAppointment['warehouseId'];
  const supplierOrganizationId = item.group.identity.supplierCode.toLowerCase() as PlanningAppointment['supplierOrganizationId'];
  const candidate: PlanningAppointment = {
    id: `admin-added-${state.appointments.length + 1}`,
    warehouseId,
    supplierOrganizationId,
    supplierName: item.group.identity.supplierCode,
    purchaseOrderNumber: item.group.identity.purchaseOrderNumber,
    deliveryPartKey: '1',
    plannedDate,
    plannedTime,
    bookingOrigin: 'ADMIN_ADDED',
    planningState: 'DETAILS_ATTACHED',
    appointmentStatus: 'UNSCHEDULED',
    tractorRegistration: item.group.transportConflicts[0]?.existingValue ?? '',
    trailerOrContainerRegistration: item.group.transportConflicts[1]?.existingValue ?? '',
    skuLines: toSkuLines(item.group),
    importDiagnostic: 'NO_MATCH',
    batchLineage: item.group.fingerprint,
  };
  const projected = buildPlanningCalendar([...state.appointments, candidate], warehouses)
    .find((card) => card.appointment.id === candidate.id);
  if (!projected || projected.conflict) {
    return { state, error: projected?.conflict?.message ?? 'Capacity configuration could not be evaluated.' };
  }
  const nextItem = { ...item, appliedAppointmentId: candidate.id };
  const nextState: WeeklyPlanningState = {
    appointments: [...state.appointments, candidate],
    queue: replaceQueueItem(state.queue, fingerprint, nextItem),
    history: [...state.history, historyEntry(
      state,
      'SCHEDULE_UNRESERVED',
      actorId,
      reason.trim(),
      fingerprint,
      candidate.id,
      'UNSCHEDULED',
      snapshot(candidate),
    )],
    appliedFingerprints: [...state.appliedFingerprints, fingerprint],
  };
  return { state: nextState, error: null };
}
