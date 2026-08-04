import type {
  CapacityPoolConfiguration,
  CapacityPoolId,
  DeliveryFlow,
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

export const capacityUnitMinutes = 15;

export const capacityReasonCodes = [
  'AVAILABLE',
  'WAREHOUSE_CONFIGURATION_MISSING',
  'WAREHOUSE_CONFIGURATION_AMBIGUOUS',
  'WAREHOUSE_NOT_PUBLISHED',
  'INVALID_SLOT',
  'OUTSIDE_WORKING_HOURS',
  'NO_ACTIVE_COMPATIBLE_DOCK',
  'WAREHOUSE_BLOCKED',
  'CAPACITY_POOL_MISSING',
  'CAPACITY_POOL_BLOCKED',
  'CAPACITY_EXCEEDED',
] as const;

export type CapacityReasonCode = (typeof capacityReasonCodes)[number];

export interface CapacityAppointment {
  id: string;
  warehouseId: WarehouseId;
  plannedDate: string;
  plannedTime: string;
  appointmentStatus: string;
  durationMinutes?: number;
  flow?: DeliveryFlow;
  assignedDockId?: DockId | null;
  operationalStatus?: string;
}

export interface CapacitySlotRequest {
  warehouseId: WarehouseId;
  date: string;
  time: string;
  durationMinutes: number;
  flow: DeliveryFlow;
  dockId?: DockId;
  capacityPoolId?: CapacityPoolId;
  excludeAppointmentId?: string;
}

export interface CapacityInternalEvidence {
  unitStarts: readonly string[];
  eligibleDockIds: readonly DockId[];
  capacityPoolIds: readonly CapacityPoolId[];
  effectiveLimit: number;
  maximumExistingOccupancy: number;
  blockingAppointmentIds: readonly string[];
}

export interface CapacityResult {
  available: boolean;
  reasonCode: CapacityReasonCode;
  message: string;
  internalEvidence: CapacityInternalEvidence | null;
}

export interface SafeCapacityResult {
  available: boolean;
  reasonCode: CapacityReasonCode | 'RESERVATION_CONFLICT';
  message: string;
}

export interface CapacityAlternative {
  date: string;
  time: string;
}

export interface CapacityAttempt {
  id: string;
  supplierOrganizationId: SupplierOrganizationId;
}

export interface CapacityCompetitionResult {
  error: string | null;
  results: readonly {
    attemptId: string;
    outcome: 'RESERVED' | 'RESERVATION_CONFLICT';
    slot: CapacityAlternative;
    message: string;
    alternatives: readonly CapacityAlternative[];
  }[];
}

export interface CapacityOverrideEvidence {
  actorId: string;
  userId: string;
  warehouseId: WarehouseId;
  reason: string;
  before: SafeCapacityResult;
  after: SafeCapacityResult;
}

export interface CapacityOverrideResult {
  result: CapacityResult;
  evidence: CapacityOverrideEvidence | null;
  error: string | null;
}

const holdingPlanningStatuses = new Set([
  'SUBMITTED',
  'PENDING_APPROVAL',
  'CONFIRMED',
]);

const releasedOperationalStatuses = new Set([
  'COMPLETED',
  'CHECKED_OUT',
  'NO_SHOW',
]);

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDate(value: Date): string {
  return `${value.getUTCFullYear()}-${twoDigits(value.getUTCMonth() + 1)}-${twoDigits(value.getUTCDate())}`;
}

function formatTime(value: Date): string {
  return `${twoDigits(value.getUTCHours())}:${twoDigits(value.getUTCMinutes())}`;
}

function parseCivilMinute(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  return formatDate(parsed) === date && formatTime(parsed) === time
    ? parsed.getTime()
    : null;
}

function unitKey(value: number): string {
  const date = new Date(value);
  return `${formatDate(date)}T${formatTime(date)}`;
}

export function occupiedCapacityUnits(
  date: string,
  time: string,
  durationMinutes: number,
): readonly string[] {
  const start = parseCivilMinute(date, time);
  if (start === null || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return [];
  }
  const unitMs = capacityUnitMinutes * 60_000;
  const alignedStart = Math.floor(start / unitMs) * unitMs;
  const end = start + durationMinutes * 60_000;
  const units: string[] = [];
  for (let value = alignedStart; value < end; value += unitMs) {
    units.push(unitKey(value));
  }
  return units;
}

function minutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minute] = value.split(':').map(Number);
  return hours <= 23 && minute <= 59 ? hours * 60 + minute : null;
}

function weekday(date: string): number | null {
  const parsed = parseCivilMinute(date, '12:00');
  return parsed === null ? null : new Date(parsed).getUTCDay();
}

function intervalOverlaps(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function blockOverlapsUnit(block: WarehouseBlock, unit: string): boolean {
  const [date, time] = unit.split('T');
  const unitStart = minutes(time);
  if (unitStart === null) return false;
  const unitEnd = unitStart + capacityUnitMinutes;

  if (block.schedule.kind === 'one-time') {
    if (block.schedule.date !== date) return false;
    if (block.schedule.allDay) return true;
    const blockStart = minutes(block.schedule.startsAt);
    const blockEnd = minutes(block.schedule.endsAt);
    return blockStart !== null && blockEnd !== null
      && intervalOverlaps(unitStart, unitEnd, blockStart, blockEnd);
  }

  const day = weekday(date);
  if (day === null || !block.schedule.weekdays.includes(day as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
    return false;
  }
  const blockStart = minutes(block.schedule.startsAt);
  const blockEnd = minutes(block.schedule.endsAt);
  return blockStart !== null && blockEnd !== null
    && intervalOverlaps(unitStart, unitEnd, blockStart, blockEnd);
}

function blockAffectsDock(
  block: WarehouseBlock,
  dock: DockConfiguration,
): boolean {
  const scope = block.scope;
  switch (scope.type) {
    case 'warehouse':
      return true;
    case 'zone':
      return scope.zone === dock.zone;
    case 'dock':
      return scope.dockId === dock.id;
    case 'capacity-pool':
      return false;
  }
}

function poolBlockOverlaps(
  block: WarehouseBlock,
  poolId: CapacityPoolId,
  units: readonly string[],
): boolean {
  const scope = block.scope;
  return scope.type === 'capacity-pool'
    && scope.capacityPoolId === poolId
    && units.some((unit) => blockOverlapsUnit(block, unit));
}

function appointmentHoldsCapacity(appointment: CapacityAppointment): boolean {
  return holdingPlanningStatuses.has(appointment.appointmentStatus)
    && !releasedOperationalStatuses.has(appointment.operationalStatus ?? '');
}

function appointmentOverlapsUnit(
  appointment: CapacityAppointment,
  unit: string,
): boolean {
  return occupiedCapacityUnits(
    appointment.plannedDate,
    appointment.plannedTime,
    appointment.durationMinutes ?? capacityUnitMinutes,
  ).includes(unit);
}

function safeMessage(reasonCode: CapacityReasonCode): string {
  const messages: Readonly<Record<CapacityReasonCode, string>> = {
    AVAILABLE: 'The slot is available for the requested duration.',
    WAREHOUSE_CONFIGURATION_MISSING: 'Warehouse configuration is unavailable.',
    WAREHOUSE_CONFIGURATION_AMBIGUOUS: 'Warehouse configuration is ambiguous.',
    WAREHOUSE_NOT_PUBLISHED: 'Warehouse configuration is not published.',
    INVALID_SLOT: 'A valid date, time and positive duration are required.',
    OUTSIDE_WORKING_HOURS: 'The requested duration is outside configured working hours.',
    NO_ACTIVE_COMPATIBLE_DOCK: 'No active compatible dock is available for this flow.',
    WAREHOUSE_BLOCKED: 'A configured block prevents this reservation.',
    CAPACITY_POOL_MISSING: 'Compatible capacity configuration is unavailable.',
    CAPACITY_POOL_BLOCKED: 'The compatible capacity pool is blocked for this period.',
    CAPACITY_EXCEEDED: 'The requested capacity is no longer available.',
  };
  return messages[reasonCode];
}

function failure(reasonCode: Exclude<CapacityReasonCode, 'AVAILABLE'>): CapacityResult {
  return {
    available: false,
    reasonCode,
    message: safeMessage(reasonCode),
    internalEvidence: null,
  };
}

function eligibleDocks(
  warehouse: WarehouseConfiguration,
  request: CapacitySlotRequest,
): readonly DockConfiguration[] {
  return warehouse.docks.filter((dock) =>
    dock.active
    && dock.allowedFlows.includes(request.flow)
    && (!request.dockId || request.dockId === dock.id));
}

function compatiblePools(
  warehouse: WarehouseConfiguration,
  docks: readonly DockConfiguration[],
  request: CapacitySlotRequest,
): readonly CapacityPoolConfiguration[] {
  return warehouse.capacityPools.filter((pool) =>
    pool.concurrentVehicles > 0
    && (!request.capacityPoolId || request.capacityPoolId === pool.id)
    && pool.dockIds.some((dockId) => docks.some((dock) => dock.id === dockId)));
}

function workingHoursAllow(
  warehouse: WarehouseConfiguration,
  request: CapacitySlotRequest,
): boolean {
  const start = parseCivilMinute(request.date, request.time);
  if (start === null || request.durationMinutes <= 0) return false;
  const end = start + request.durationMinutes * 60_000;
  const day = warehouse.workingDays.find((candidate) =>
    candidate.weekday === new Date(start).getUTCDay());
  const opens = day ? minutes(day.opensAt) : null;
  const closes = day ? minutes(day.closesAt) : null;
  const startMinute = new Date(start).getUTCHours() * 60 + new Date(start).getUTCMinutes();
  const endDate = new Date(end);
  const endMinute = endDate.getUTCHours() * 60 + endDate.getUTCMinutes();
  return Boolean(
    day?.enabled
    && opens !== null
    && closes !== null
    && formatDate(new Date(start)) === formatDate(endDate)
    && startMinute >= opens
    && endMinute <= closes,
  );
}

export function evaluateCapacitySlot(
  warehouses: readonly WarehouseConfiguration[],
  appointments: readonly CapacityAppointment[],
  request: CapacitySlotRequest,
): CapacityResult {
  const matches = warehouses.filter((warehouse) => warehouse.id === request.warehouseId);
  if (matches.length === 0) return failure('WAREHOUSE_CONFIGURATION_MISSING');
  if (matches.length > 1) return failure('WAREHOUSE_CONFIGURATION_AMBIGUOUS');
  const warehouse = matches[0];
  if (warehouse.status !== 'published') return failure('WAREHOUSE_NOT_PUBLISHED');

  const units = occupiedCapacityUnits(request.date, request.time, request.durationMinutes);
  if (units.length === 0) return failure('INVALID_SLOT');
  if (!workingHoursAllow(warehouse, request)) return failure('OUTSIDE_WORKING_HOURS');

  const docks = eligibleDocks(warehouse, request);
  if (docks.length === 0) return failure('NO_ACTIVE_COMPATIBLE_DOCK');

  const warehouseBlock = warehouse.blocks.find((block) =>
    block.scope.type === 'warehouse' && units.some((unit) => blockOverlapsUnit(block, unit)));
  if (warehouseBlock) return failure('WAREHOUSE_BLOCKED');

  const unblockedDocks = docks.filter((dock) => !warehouse.blocks.some((block) =>
    block.scope.type !== 'warehouse'
    && blockAffectsDock(block, dock)
    && units.some((unit) => blockOverlapsUnit(block, unit))));
  if (unblockedDocks.length === 0) return failure('WAREHOUSE_BLOCKED');

  const pools = compatiblePools(warehouse, unblockedDocks, request);
  if (pools.length === 0) return failure('CAPACITY_POOL_MISSING');
  if (pools.some((pool) => warehouse.blocks.some((block) =>
    poolBlockOverlaps(block, pool.id, units)))) {
    return failure('CAPACITY_POOL_BLOCKED');
  }

  const effectiveLimit = Math.min(...pools.map((pool) => pool.concurrentVehicles));
  const relevantAppointments = appointments.filter((appointment) =>
    appointment.id !== request.excludeAppointmentId
    && appointment.warehouseId === request.warehouseId
    && appointmentHoldsCapacity(appointment)
    && (!request.dockId || appointment.assignedDockId === request.dockId));

  let maximumExistingOccupancy = 0;
  const blockingAppointmentIds = new Set<string>();
  for (const unit of units) {
    const occupants = relevantAppointments.filter((appointment) =>
      appointmentOverlapsUnit(appointment, unit));
    maximumExistingOccupancy = Math.max(maximumExistingOccupancy, occupants.length);
    if (occupants.length + 1 > effectiveLimit) {
      occupants.forEach((appointment) => blockingAppointmentIds.add(appointment.id));
    }
  }

  const evidence: CapacityInternalEvidence = {
    unitStarts: units,
    eligibleDockIds: unblockedDocks.map((dock) => dock.id),
    capacityPoolIds: pools.map((pool) => pool.id),
    effectiveLimit,
    maximumExistingOccupancy,
    blockingAppointmentIds: Array.from(blockingAppointmentIds).sort(),
  };

  if (blockingAppointmentIds.size > 0) {
    return {
      available: false,
      reasonCode: 'CAPACITY_EXCEEDED',
      message: safeMessage('CAPACITY_EXCEEDED'),
      internalEvidence: evidence,
    };
  }

  return {
    available: true,
    reasonCode: 'AVAILABLE',
    message: safeMessage('AVAILABLE'),
    internalEvidence: evidence,
  };
}

export function toSafeCapacityResult(result: CapacityResult): SafeCapacityResult {
  return {
    available: result.available,
    reasonCode: result.reasonCode,
    message: result.message,
  };
}

function addMinutes(date: string, time: string, value: number): CapacityAlternative | null {
  const parsed = parseCivilMinute(date, time);
  if (parsed === null) return null;
  const next = new Date(parsed + value * 60_000);
  return { date: formatDate(next), time: formatTime(next) };
}

export function findNearestCapacityAlternatives(
  warehouses: readonly WarehouseConfiguration[],
  appointments: readonly CapacityAppointment[],
  request: CapacitySlotRequest,
  limit = 3,
): readonly CapacityAlternative[] {
  const alternatives: CapacityAlternative[] = [];
  for (let offset = capacityUnitMinutes; offset <= 7 * 24 * 60 && alternatives.length < limit; offset += capacityUnitMinutes) {
    const candidate = addMinutes(request.date, request.time, offset);
    if (!candidate) break;
    const result = evaluateCapacitySlot(warehouses, appointments, {
      ...request,
      date: candidate.date,
      time: candidate.time,
      excludeAppointmentId: undefined,
    });
    if (result.available) alternatives.push(candidate);
  }
  return alternatives;
}

export function simulateFinalCapacityCompetition(
  warehouses: readonly WarehouseConfiguration[],
  appointments: readonly CapacityAppointment[],
  request: CapacitySlotRequest,
  attempts: readonly [CapacityAttempt, CapacityAttempt],
): CapacityCompetitionResult {
  const initial = evaluateCapacitySlot(warehouses, appointments, request);
  const remaining = initial.internalEvidence
    ? initial.internalEvidence.effectiveLimit - initial.internalEvidence.maximumExistingOccupancy
    : 0;
  if (!initial.available || remaining !== 1) {
    return {
      error: 'The final-capacity demonstration requires exactly one compatible unit to remain.',
      results: [],
    };
  }

  const accepted: CapacityAppointment[] = appointments.map((appointment) => ({ ...appointment }));
  const results: CapacityCompetitionResult['results'][number][] = [];

  for (const attempt of attempts) {
    const availability = evaluateCapacitySlot(warehouses, accepted, request);
    if (availability.available) {
      accepted.push({
        id: `capacity-attempt-${attempt.id}`,
        warehouseId: request.warehouseId,
        plannedDate: request.date,
        plannedTime: request.time,
        durationMinutes: request.durationMinutes,
        flow: request.flow,
        appointmentStatus: 'SUBMITTED',
        assignedDockId: request.dockId ?? null,
      });
      results.push({
        attemptId: attempt.id,
        outcome: 'RESERVED',
        slot: { date: request.date, time: request.time },
        message: 'The local reservation attempt received the final compatible unit.',
        alternatives: [],
      });
      continue;
    }

    results.push({
      attemptId: attempt.id,
      outcome: 'RESERVATION_CONFLICT',
      slot: { date: request.date, time: request.time },
      message: 'The selected slot was reserved by an earlier local attempt. Choose a compatible alternative.',
      alternatives: findNearestCapacityAlternatives(
        warehouses,
        accepted,
        request,
      ),
    });
  }

  return { error: null, results };
}

function actorCanOverrideCapacity(
  actor: DemoActor,
  warehouse: WarehouseConfiguration,
): boolean {
  if (actor.role === 'System Administrator') return true;
  return actor.role === 'Warehouse Administrator'
    && actor.warehouseIds.includes(warehouse.id)
    && warehouse.administratorUserIds.includes(actor.userId);
}

export function applyCapacityOverride(
  actor: DemoActor,
  warehouse: WarehouseConfiguration,
  result: CapacityResult,
  reason: string,
): CapacityOverrideResult {
  if (!actorCanOverrideCapacity(actor, warehouse)) {
    return { result, evidence: null, error: 'The active actor cannot override capacity for this warehouse.' };
  }
  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    return { result, evidence: null, error: 'A capacity override requires a reason.' };
  }
  if (result.available || !['WAREHOUSE_BLOCKED', 'CAPACITY_POOL_BLOCKED', 'CAPACITY_EXCEEDED'].includes(result.reasonCode)) {
    return { result, evidence: null, error: 'This capacity result is not eligible for override.' };
  }

  const overridden: CapacityResult = {
    ...result,
    available: true,
    reasonCode: 'AVAILABLE',
    message: 'The slot is available only through a local authorized override.',
  };
  return {
    result: overridden,
    error: null,
    evidence: {
      actorId: actor.id,
      userId: actor.userId,
      warehouseId: warehouse.id,
      reason: normalizedReason,
      before: toSafeCapacityResult(result),
      after: toSafeCapacityResult(overridden),
    },
  };
}
