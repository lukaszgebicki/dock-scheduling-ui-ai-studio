import type { AppointmentWorkspaceRecord } from '../appointments/appointmentWorkspace';
import type {
  DemoActor,
  SupplierOrganizationId,
  UiMvpRole,
  WarehouseId,
} from '../demoDomain/demoDomain';

export const standingFrequencies = ['WEEKLY', 'BIWEEKLY'] as const;
export type StandingFrequency = (typeof standingFrequencies)[number];

export const standingTerminationModes = ['END_DATE', 'COUNT'] as const;
export type StandingTerminationMode = (typeof standingTerminationModes)[number];

export const standingSeriesStates = ['ACTIVE', 'PAUSED', 'ENDED'] as const;
export type StandingSeriesState = (typeof standingSeriesStates)[number];
export type StandingSeriesAction = 'PAUSE' | 'RESUME' | 'END';

export const occurrencePreviewActions = [
  'CANCEL',
  'RESCHEDULE_NEXT_DAY',
  'EDIT_TIME_PLUS_15',
] as const;
export type OccurrencePreviewAction = (typeof occurrencePreviewActions)[number];

export type StandingOccurrenceStatus =
  | 'ACTIVE_PREVIEW'
  | 'CANCELLED_PREVIEW'
  | 'RESCHEDULED_PREVIEW'
  | 'EDITED_TIME_PREVIEW';

export interface StandingScopeChoice {
  key: string;
  supplierOrganizationId: SupplierOrganizationId;
  supplierName: string;
  warehouseId: WarehouseId;
  warehouseName: string;
}

export interface StandingSeriesDefinition {
  scopeKey: string;
  weekday: number;
  time: string;
  frequency: StandingFrequency;
  startDate: string;
  terminationMode: StandingTerminationMode;
  endDate: string;
  occurrenceCount: number;
}

export interface StandingDefinitionValidation {
  valid: boolean;
  errors: readonly string[];
}

export interface StandingOccurrence {
  id: string;
  index: number;
  originalDate: string;
  originalTime: string;
  date: string;
  time: string;
  status: StandingOccurrenceStatus;
  conflictStatus: 'VISIBLE_APPOINTMENT_CONFLICT' | 'NO_VISIBLE_CONFLICT';
  capacityStatus: 'CAPACITY_NOT_RESERVED';
  approvalStatus: 'STANDARD_APPROVAL_PENDING';
  holdStatus: 'ILLUSTRATIVE_HOLD_NOT_STARTED';
}

export interface StandingPreview {
  choice: StandingScopeChoice;
  definition: StandingSeriesDefinition;
  occurrences: readonly StandingOccurrence[];
}

const accessRoles = new Set<UiMvpRole>([
  'System Administrator',
  'Warehouse Administrator',
  'Supplier Administrator',
]);

const managerRoles = new Set<UiMvpRole>([
  'Warehouse Administrator',
  'Supplier Administrator',
]);

function twoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${twoDigits(date.getUTCMonth() + 1)}-${twoDigits(date.getUTCDate())}`;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return toIsoDate(date) === value ? date : null;
}

function validTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function isoWeekday(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function addDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function addFifteenMinutes(dateValue: string, timeValue: string): { date: string; time: string } {
  const date = parseIsoDate(dateValue);
  if (!date || !validTime(timeValue)) return { date: dateValue, time: timeValue };
  const [hours, minutes] = timeValue.split(':').map(Number);
  date.setUTCHours(hours, minutes + 15, 0, 0);
  return { date: toIsoDate(date), time: `${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}` };
}

function compareChoices(left: StandingScopeChoice, right: StandingScopeChoice): number {
  return left.supplierName.localeCompare(right.supplierName, 'en-US')
    || left.warehouseName.localeCompare(right.warehouseName, 'en-US')
    || left.key.localeCompare(right.key, 'en-US');
}

function visibleConflict(
  records: readonly AppointmentWorkspaceRecord[],
  warehouseId: WarehouseId,
  date: string,
  time: string,
): StandingOccurrence['conflictStatus'] {
  return records.some((record) =>
    record.warehouseId === warehouseId
    && record.plannedDate === date
    && record.plannedTime === time)
    ? 'VISIBLE_APPOINTMENT_CONFLICT'
    : 'NO_VISIBLE_CONFLICT';
}

export function canAccessStandingAppointments(role: UiMvpRole): boolean {
  return accessRoles.has(role);
}

export function canManageStandingAppointments(role: UiMvpRole): boolean {
  return managerRoles.has(role);
}

export function standingScopeChoices(
  records: readonly AppointmentWorkspaceRecord[],
  actor: Pick<DemoActor, 'role' | 'supplierOrganizationId'>,
): readonly StandingScopeChoice[] {
  const choices = new Map<string, StandingScopeChoice>();
  for (const record of records) {
    if (actor.role === 'Supplier Administrator'
      && record.supplierOrganizationId !== actor.supplierOrganizationId) {
      continue;
    }
    const key = `${record.supplierOrganizationId}:${record.warehouseId}`;
    choices.set(key, {
      key,
      supplierOrganizationId: record.supplierOrganizationId,
      supplierName: record.supplierName,
      warehouseId: record.warehouseId,
      warehouseName: record.warehouseName,
    });
  }
  return Array.from(choices.values()).sort(compareChoices);
}

export function validateStandingDefinition(
  definition: StandingSeriesDefinition,
  choices: readonly StandingScopeChoice[],
  eligibleScopeKeys: ReadonlySet<string>,
  requireEligibility = true,
): StandingDefinitionValidation {
  const errors: string[] = [];
  if (!choices.some((choice) => choice.key === definition.scopeKey)) {
    errors.push('Select a Supplier and warehouse pair from the active actor scope.');
  }
  if (requireEligibility && !eligibleScopeKeys.has(definition.scopeKey)) {
    errors.push('The selected Supplier and warehouse pair is not locally eligible for a standing series.');
  }
  if (!Number.isInteger(definition.weekday) || definition.weekday < 1 || definition.weekday > 7) {
    errors.push('Select a valid weekday.');
  }
  if (!validTime(definition.time)) {
    errors.push('Select a valid occurrence time.');
  }
  if (!standingFrequencies.includes(definition.frequency)) {
    errors.push('Select weekly or biweekly frequency.');
  }
  const start = parseIsoDate(definition.startDate);
  if (!start) errors.push('Select a valid start date.');
  if (definition.terminationMode === 'END_DATE') {
    const end = parseIsoDate(definition.endDate);
    if (!end) errors.push('Select a valid inclusive end date.');
    if (start && end && definition.endDate < definition.startDate) {
      errors.push('The inclusive end date cannot be before the start date.');
    }
  } else if (definition.terminationMode === 'COUNT') {
    if (!Number.isInteger(definition.occurrenceCount)
      || definition.occurrenceCount < 1
      || definition.occurrenceCount > 26) {
      errors.push('Occurrence count must be a whole number from 1 to 26.');
    }
  } else {
    errors.push('Select exactly one termination rule.');
  }
  return { valid: errors.length === 0, errors };
}

export function firstOccurrenceDate(startDate: string, weekday: number): string | null {
  const start = parseIsoDate(startDate);
  if (!start || weekday < 1 || weekday > 7) return null;
  const offset = (weekday - isoWeekday(start) + 7) % 7;
  start.setUTCDate(start.getUTCDate() + offset);
  return toIsoDate(start);
}

export function generateStandingPreview(
  definition: StandingSeriesDefinition,
  choices: readonly StandingScopeChoice[],
  eligibleScopeKeys: ReadonlySet<string>,
  visibleRecords: readonly AppointmentWorkspaceRecord[],
  requireEligibility = true,
): { preview: StandingPreview | null; errors: readonly string[] } {
  const validation = validateStandingDefinition(
    definition,
    choices,
    eligibleScopeKeys,
    requireEligibility,
  );
  if (!validation.valid) return { preview: null, errors: validation.errors };
  const choice = choices.find((candidate) => candidate.key === definition.scopeKey)!;
  const firstDate = firstOccurrenceDate(definition.startDate, definition.weekday)!;
  const intervalDays = definition.frequency === 'WEEKLY' ? 7 : 14;
  const occurrences: StandingOccurrence[] = [];
  let date = firstDate;

  while (occurrences.length < 26) {
    if (definition.terminationMode === 'END_DATE' && date > definition.endDate) break;
    if (definition.terminationMode === 'COUNT'
      && occurrences.length >= definition.occurrenceCount) break;
    const index = occurrences.length + 1;
    occurrences.push({
      id: `${choice.key}:${index}:${date}:${definition.time}`,
      index,
      originalDate: date,
      originalTime: definition.time,
      date,
      time: definition.time,
      status: 'ACTIVE_PREVIEW',
      conflictStatus: visibleConflict(visibleRecords, choice.warehouseId, date, definition.time),
      capacityStatus: 'CAPACITY_NOT_RESERVED',
      approvalStatus: 'STANDARD_APPROVAL_PENDING',
      holdStatus: 'ILLUSTRATIVE_HOLD_NOT_STARTED',
    });
    date = addDays(date, intervalDays);
  }

  if (occurrences.length === 0) {
    return { preview: null, errors: ['The termination rule produces no occurrences.'] };
  }
  if (definition.terminationMode === 'END_DATE' && date <= definition.endDate) {
    return { preview: null, errors: ['The preview exceeds the maximum of 26 occurrences. Narrow the range.'] };
  }
  return { preview: { choice, definition, occurrences }, errors: [] };
}

export function previewOccurrenceAction(
  occurrence: StandingOccurrence,
  action: OccurrencePreviewAction,
  visibleRecords: readonly AppointmentWorkspaceRecord[],
  warehouseId: WarehouseId,
): StandingOccurrence {
  if (action === 'CANCEL') {
    return { ...occurrence, status: 'CANCELLED_PREVIEW' };
  }
  if (action === 'RESCHEDULE_NEXT_DAY') {
    const date = addDays(occurrence.originalDate, 1);
    return {
      ...occurrence,
      date,
      time: occurrence.originalTime,
      status: 'RESCHEDULED_PREVIEW',
      conflictStatus: visibleConflict(visibleRecords, warehouseId, date, occurrence.originalTime),
    };
  }
  const edited = addFifteenMinutes(occurrence.originalDate, occurrence.originalTime);
  return {
    ...occurrence,
    date: edited.date,
    time: edited.time,
    status: 'EDITED_TIME_PREVIEW',
    conflictStatus: visibleConflict(visibleRecords, warehouseId, edited.date, edited.time),
  };
}

export function transitionStandingSeries(
  current: StandingSeriesState,
  action: StandingSeriesAction,
): { state: StandingSeriesState; error: string | null } {
  if (current === 'ENDED') {
    return { state: current, error: 'An ended local series preview is terminal.' };
  }
  if (action === 'END') return { state: 'ENDED', error: null };
  if (action === 'PAUSE' && current === 'ACTIVE') return { state: 'PAUSED', error: null };
  if (action === 'RESUME' && current === 'PAUSED') return { state: 'ACTIVE', error: null };
  return { state: current, error: 'The requested series-state action is not available.' };
}

export function createSystemInspectionDefinition(
  choices: readonly StandingScopeChoice[],
  records: readonly AppointmentWorkspaceRecord[],
): StandingSeriesDefinition | null {
  const choice = choices[0];
  if (!choice) return null;
  const firstRecord = records
    .filter((record) => record.supplierOrganizationId === choice.supplierOrganizationId
      && record.warehouseId === choice.warehouseId)
    .slice()
    .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate, 'en-US')
      || left.plannedTime.localeCompare(right.plannedTime, 'en-US'))[0];
  if (!firstRecord) return null;
  const date = parseIsoDate(firstRecord.plannedDate)!;
  return {
    scopeKey: choice.key,
    weekday: isoWeekday(date),
    time: firstRecord.plannedTime,
    frequency: 'WEEKLY',
    startDate: firstRecord.plannedDate,
    terminationMode: 'COUNT',
    endDate: '',
    occurrenceCount: 3,
  };
}
