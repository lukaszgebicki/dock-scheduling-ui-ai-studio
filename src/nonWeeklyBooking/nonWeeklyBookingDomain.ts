import type { AppointmentWorkspaceRecord } from '../appointments/appointmentWorkspace';
import {
  evaluateCapacitySlot,
  findNearestCapacityAlternatives,
  toSafeCapacityResult,
  type CapacityAlternative,
  type CapacityAppointment,
} from '../capacity/capacityDomain';
import {
  deliveryFlows,
  deriveSupplierBookingContract,
  deriveSupplierFormContract,
  evaluateApproval,
  type DeliveryFlow,
  type DemoConfigurationState,
  type SupplierFormField,
  type WarehouseConfiguration,
} from '../demoDomain/configuration';
import {
  getSupplierOrganizationById,
  type DemoActor,
  type SupplierOrganizationId,
  type WarehouseId,
} from '../demoDomain/demoDomain';

export const nonWeeklyBookingSteps = [
  'WAREHOUSE_FLOW',
  'DELIVERY_DATA',
  'AVAILABLE_SLOTS',
  'TRANSPORT_DOCUMENTS',
  'SUMMARY_CONFIRMATION',
] as const;
export type NonWeeklyBookingStep = (typeof nonWeeklyBookingSteps)[number];

export interface NonWeeklyBookingInput {
  warehouseId: WarehouseId | '';
  flow: DeliveryFlow | '';
  referenceNumber: string;
  purchaseOrderNumber: string;
  asnNumber: string;
  palletCount: string;
  unitCount: string;
  grossWeight: string;
  volume: string;
  vehicleType: string;
  isAdr: boolean;
  isControlledTemperature: boolean;
  selectedSlotId: string;
  contactName: string;
  driverName: string;
  driverPhone: string;
  tractorRegistration: string;
  trailerOrContainerRegistration: string;
  documentName: string;
  sharedComment: string;
  consentConfirmed: boolean;
}

export interface NonWeeklyBookingOption {
  warehouseId: WarehouseId;
  warehouseName: string;
  timezone: string;
  flows: readonly DeliveryFlow[];
}

export interface NonWeeklySlotOption {
  id: string;
  date: string;
  time: string;
  durationMinutes: number;
  available: boolean;
  reasonCode: string;
  message: string;
  recommended: boolean;
}

export interface NonWeeklySlotModel {
  timezone: string;
  durationMinutes: number;
  slots: readonly NonWeeklySlotOption[];
  nearest: NonWeeklySlotOption | null;
  recommendations: readonly NonWeeklySlotOption[];
}

export interface NonWeeklyValidation {
  valid: boolean;
  errors: readonly string[];
}

export interface NonWeeklyApprovalPreview {
  outcome: 'CONFIRMED' | 'PENDING_APPROVAL';
  explanation: string;
}

export interface NonWeeklyConfirmationResult {
  record: AppointmentWorkspaceRecord | null;
  errorCode: string | null;
  error: string | null;
  alternatives: readonly CapacityAlternative[];
}

export const emptyNonWeeklyBookingInput: NonWeeklyBookingInput = {
  warehouseId: '',
  flow: '',
  referenceNumber: '',
  purchaseOrderNumber: '',
  asnNumber: '',
  palletCount: '',
  unitCount: '',
  grossWeight: '',
  volume: '',
  vehicleType: '',
  isAdr: false,
  isControlledTemperature: false,
  selectedSlotId: '',
  contactName: '',
  driverName: '',
  driverPhone: '',
  tractorRegistration: '',
  trailerOrContainerRegistration: '',
  documentName: '',
  sharedComment: '',
  consentConfirmed: false,
};

const slotReferenceDate = '2026-08-17';
const slotSearchDays = 7;
const minimumSlotDisplayCount = 12;
const recommendationCount = 3;

function normalize(value: string): string {
  return value.trim();
}

function numericValue(value: string): number | null {
  if (!normalize(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function positiveMeasure(value: string): boolean {
  const parsed = numericValue(value);
  return parsed !== null && Number.isFinite(parsed) && parsed > 0;
}

function invalidMeasure(value: string): boolean {
  const parsed = numericValue(value);
  return parsed !== null && (!Number.isFinite(parsed) || parsed < 0);
}

function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function timeToMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
}

function requiredFields(
  configuration: DemoConfigurationState,
  input: Pick<NonWeeklyBookingInput, 'warehouseId' | 'flow'>,
): readonly SupplierFormField[] {
  if (!input.warehouseId || !input.flow) return [];
  return deriveSupplierFormContract(configuration, input.warehouseId, input.flow).requiredFields;
}

export function canAccessNonWeeklyBooking(
  actor: DemoActor,
  configuration: DemoConfigurationState,
): boolean {
  if (!actor.supplierOrganizationId
    || !['Supplier Administrator', 'Supplier User'].includes(actor.role)) {
    return false;
  }
  return deriveSupplierBookingContract(
    configuration,
    actor.supplierOrganizationId,
  ).canBook;
}

export function nonWeeklyBookingOptions(
  actor: DemoActor,
  configuration: DemoConfigurationState,
): readonly NonWeeklyBookingOption[] {
  if (!canAccessNonWeeklyBooking(actor, configuration)
    || !actor.supplierOrganizationId) return [];
  const contract = deriveSupplierBookingContract(
    configuration,
    actor.supplierOrganizationId,
  );
  const options: NonWeeklyBookingOption[] = [];

  for (const assignment of contract.warehouseFlowAssignments) {
    const warehouse = configuration.warehouses.find((candidate) =>
      candidate.id === assignment.warehouseId && candidate.status === 'published');
    if (!warehouse) continue;
    const flows: readonly DeliveryFlow[] = assignment.allowedFlows.filter((flow) =>
      deliveryFlows.includes(flow));
    if (flows.length === 0) continue;
    options.push({
      warehouseId: warehouse.id,
      warehouseName: warehouse.displayName,
      timezone: warehouse.timezone,
      flows,
    });
  }

  return options.sort((left, right) =>
    left.warehouseName.localeCompare(right.warehouseName, 'en-US'));
}

export function configuredNonWeeklyFields(
  configuration: DemoConfigurationState,
  input: Pick<NonWeeklyBookingInput, 'warehouseId' | 'flow'>,
): readonly SupplierFormField[] {
  return requiredFields(configuration, input);
}

export function validateWarehouseFlow(
  actor: DemoActor,
  configuration: DemoConfigurationState,
  input: NonWeeklyBookingInput,
): NonWeeklyValidation {
  const errors: string[] = [];
  if (!canAccessNonWeeklyBooking(actor, configuration)
    || !actor.supplierOrganizationId) {
    errors.push('The active Supplier is not allowed to create a standard appointment.');
    return { valid: false, errors };
  }
  const option = nonWeeklyBookingOptions(actor, configuration).find((candidate) =>
    candidate.warehouseId === input.warehouseId);
  if (!option) errors.push('Select an assigned published warehouse.');
  if (!input.flow || !option?.flows.includes(input.flow)) {
    errors.push('Select a configured delivery flow for this warehouse.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateDeliveryData(
  configuration: DemoConfigurationState,
  input: NonWeeklyBookingInput,
): NonWeeklyValidation {
  const errors: string[] = [];
  if (!normalize(input.referenceNumber)) errors.push('Reference number is required.');
  if (!normalize(input.vehicleType)) errors.push('Vehicle type is required before slot selection.');
  if (![input.palletCount, input.unitCount, input.grossWeight, input.volume].some(positiveMeasure)) {
    errors.push('At least one positive volume measure is required.');
  }
  for (const [label, value] of [
    ['Pallet count', input.palletCount],
    ['Unit count', input.unitCount],
    ['Gross weight', input.grossWeight],
    ['Volume', input.volume],
  ] as const) {
    if (invalidMeasure(value)) errors.push(`${label} cannot be negative or invalid.`);
  }
  const fields = requiredFields(configuration, input);
  if (fields.includes('purchase-order') && !normalize(input.purchaseOrderNumber)) {
    errors.push('Purchase order number is required by warehouse configuration.');
  }
  if (fields.includes('asn') && !normalize(input.asnNumber)) {
    errors.push('ASN is required by warehouse configuration.');
  }
  return { valid: errors.length === 0, errors };
}

export function deriveNonWeeklyDurationMinutes(
  input: Pick<
    NonWeeklyBookingInput,
    | 'flow'
    | 'palletCount'
    | 'unitCount'
    | 'grossWeight'
    | 'volume'
    | 'vehicleType'
    | 'isAdr'
    | 'isControlledTemperature'
  >,
): number {
  let duration = 30;
  const pallets = numericValue(input.palletCount) ?? 0;
  const units = numericValue(input.unitCount) ?? 0;
  const weight = numericValue(input.grossWeight) ?? 0;
  const volume = numericValue(input.volume) ?? 0;
  if (pallets > 10 || units > 1000 || weight > 10_000 || volume > 20) duration += 15;
  if (pallets > 24 || units > 3000 || weight > 24_000 || volume > 50) duration += 15;
  if (/container|mega|oversize/i.test(input.vehicleType)) duration += 15;
  if (input.isAdr) duration += 15;
  if (input.isControlledTemperature) duration += 15;
  return Math.min(120, Math.max(30, Math.ceil(duration / 15) * 15));
}

function recordDurationMinutes(record: AppointmentWorkspaceRecord): number {
  for (const entry of record.statusHistory.slice().reverse()) {
    const match = /(?:^| · )(\d+) min(?: · |$)/.exec(entry.reason);
    if (match) return Number(match[1]);
  }
  return 30;
}

function capacityAppointments(
  records: readonly AppointmentWorkspaceRecord[],
): readonly CapacityAppointment[] {
  return records.map((record) => ({
    id: record.id,
    warehouseId: record.warehouseId,
    plannedDate: record.plannedDate,
    plannedTime: record.plannedTime,
    appointmentStatus: record.lifecycleStatus,
    operationalStatus: record.operationalStatus,
    durationMinutes: recordDurationMinutes(record),
    flow: deliveryFlows.includes(record.deliveryType as DeliveryFlow)
      ? record.deliveryType as DeliveryFlow
      : 'Material Delivery',
    assignedDockId: record.assignedDockId as CapacityAppointment['assignedDockId'],
  }));
}

function selectedWarehouse(
  configuration: DemoConfigurationState,
  warehouseId: WarehouseId | '',
): WarehouseConfiguration | null {
  if (!warehouseId) return null;
  return configuration.warehouses.find((warehouse) =>
    warehouse.id === warehouseId && warehouse.status === 'published') ?? null;
}

export function buildNonWeeklySlotModel(
  configuration: DemoConfigurationState,
  records: readonly AppointmentWorkspaceRecord[],
  input: NonWeeklyBookingInput,
): NonWeeklySlotModel {
  const warehouse = selectedWarehouse(configuration, input.warehouseId);
  const durationMinutes = deriveNonWeeklyDurationMinutes(input);
  if (!warehouse || !input.flow) {
    return { timezone: '', durationMinutes, slots: [], nearest: null, recommendations: [] };
  }
  const existing = capacityAppointments(records);
  const candidates: NonWeeklySlotOption[] = [];
  const reference = new Date(`${slotReferenceDate}T12:00:00Z`);
  let enoughCandidates = false;

  for (let dayOffset = 0; dayOffset < slotSearchDays && !enoughCandidates; dayOffset += 1) {
    const date = new Date(reference);
    date.setUTCDate(reference.getUTCDate() + dayOffset);
    const dateValue = isoDate(date);
    const workingDay = warehouse.workingDays.find((day) => day.weekday === date.getUTCDay());
    if (!workingDay?.enabled) continue;
    const opens = timeToMinutes(workingDay.opensAt);
    const closes = timeToMinutes(workingDay.closesAt);
    if (opens === null || closes === null) continue;

    for (let minute = opens; minute + durationMinutes <= closes; minute += 15) {
      const time = minutesToTime(minute);
      const result = evaluateCapacitySlot(configuration.warehouses, existing, {
        warehouseId: warehouse.id,
        date: dateValue,
        time,
        durationMinutes,
        flow: input.flow,
      });
      const safe = toSafeCapacityResult(result);
      candidates.push({
        id: `${dateValue}T${time}`,
        date: dateValue,
        time,
        durationMinutes,
        available: safe.available,
        reasonCode: safe.reasonCode,
        message: safe.message,
        recommended: false,
      });
      const availableCount = candidates.filter((slot) => slot.available).length;
      if (candidates.length >= minimumSlotDisplayCount
        && availableCount >= recommendationCount) {
        enoughCandidates = true;
        break;
      }
    }
  }

  const available = candidates.filter((slot) => slot.available);
  const recommendedIds = new Set(available.slice(0, recommendationCount).map((slot) => slot.id));
  const slots = candidates.map((slot) => ({
    ...slot,
    recommended: recommendedIds.has(slot.id),
  }));
  const recommendations = slots.filter((slot) => slot.recommended);
  return {
    timezone: warehouse.timezone,
    durationMinutes,
    slots,
    nearest: recommendations[0] ?? null,
    recommendations,
  };
}

export function validateTransportDocuments(
  configuration: DemoConfigurationState,
  input: NonWeeklyBookingInput,
): NonWeeklyValidation {
  const errors: string[] = [];
  if (!normalize(input.contactName)) errors.push('Contact person is required.');
  if (!input.consentConfirmed) errors.push('Required booking consent must be confirmed.');
  const fields = requiredFields(configuration, input);
  if (fields.includes('vehicle-registration') && !normalize(input.tractorRegistration)) {
    errors.push('Vehicle registration is required by warehouse configuration.');
  }
  if (fields.includes('driver-name') && !normalize(input.driverName)) {
    errors.push('Driver name is required by warehouse configuration.');
  }
  if (fields.includes('document-reference') && !normalize(input.documentName)) {
    errors.push('Document metadata is required by warehouse configuration.');
  }
  return { valid: errors.length === 0, errors };
}

export function previewNonWeeklyApproval(
  actor: DemoActor,
  configuration: DemoConfigurationState,
  input: NonWeeklyBookingInput,
): NonWeeklyApprovalPreview {
  if (!actor.supplierOrganizationId || !input.warehouseId || !input.flow) {
    return { outcome: 'PENDING_APPROVAL', explanation: 'Approval cannot be evaluated until scope is complete.' };
  }
  const mode = evaluateApproval(configuration, {
    warehouseId: input.warehouseId,
    supplierOrganizationId: actor.supplierOrganizationId,
    flow: input.flow,
    isAdr: input.isAdr,
    isControlledTemperature: input.isControlledTemperature,
    hasRequiredDocument: normalize(input.documentName).length > 0,
    hasPurchaseOrder: normalize(input.purchaseOrderNumber).length > 0,
  });
  return mode === 'auto'
    ? { outcome: 'CONFIRMED', explanation: 'Published approval rules allow automatic confirmation.' }
    : { outcome: 'PENDING_APPROVAL', explanation: 'Published approval rules require Administrator decision.' };
}

function slotFromId(slotId: string): CapacityAlternative | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(slotId);
  return match ? { date: match[1], time: match[2] } : null;
}

function evidenceSummary(input: NonWeeklyBookingInput, durationMinutes: number): string {
  const measures = [
    input.palletCount && `${normalize(input.palletCount)} pallets`,
    input.unitCount && `${normalize(input.unitCount)} units`,
    input.grossWeight && `${normalize(input.grossWeight)} kg`,
    input.volume && `${normalize(input.volume)} m3`,
  ].filter(Boolean).join(' · ');
  return `Standard Supplier booking · ${durationMinutes} min · ${normalize(input.vehicleType)}${measures ? ` · ${measures}` : ''}`;
}

function recordSequence(records: readonly AppointmentWorkspaceRecord[]): number {
  return records.filter((record) => record.sourceKind === 'NON_WEEKLY_DEMO').length + 1;
}

export function confirmNonWeeklyBooking(
  actor: DemoActor,
  configuration: DemoConfigurationState,
  records: readonly AppointmentWorkspaceRecord[],
  input: NonWeeklyBookingInput,
): NonWeeklyConfirmationResult {
  const scopeValidation = validateWarehouseFlow(actor, configuration, input);
  const deliveryValidation = validateDeliveryData(configuration, input);
  const transportValidation = validateTransportDocuments(configuration, input);
  const selected = slotFromId(input.selectedSlotId);
  if (!scopeValidation.valid || !deliveryValidation.valid || !transportValidation.valid || !selected) {
    return {
      record: null,
      errorCode: 'VALIDATION_ERROR',
      error: [...scopeValidation.errors, ...deliveryValidation.errors, ...transportValidation.errors,
        ...(selected ? [] : ['Select an available slot.'])].join(' '),
      alternatives: [],
    };
  }
  const supplierOrganizationId = actor.supplierOrganizationId as SupplierOrganizationId;
  const duplicate = records.some((record) =>
    record.supplierOrganizationId === supplierOrganizationId
    && record.warehouseId === input.warehouseId
    && record.externalReference.toLocaleLowerCase('en-US')
      === normalize(input.referenceNumber).toLocaleLowerCase('en-US')
    && record.plannedDate === selected.date
    && record.plannedTime === selected.time);
  if (duplicate) {
    return {
      record: null,
      errorCode: 'ALREADY_CONFIRMED',
      error: 'This local standard booking was already confirmed.',
      alternatives: [],
    };
  }

  const durationMinutes = deriveNonWeeklyDurationMinutes(input);
  const availability = evaluateCapacitySlot(
    configuration.warehouses,
    capacityAppointments(records),
    {
      warehouseId: input.warehouseId as WarehouseId,
      date: selected.date,
      time: selected.time,
      durationMinutes,
      flow: input.flow as DeliveryFlow,
    },
  );
  if (!availability.available) {
    const alternatives = findNearestCapacityAlternatives(
      configuration.warehouses,
      capacityAppointments(records),
      {
        warehouseId: input.warehouseId as WarehouseId,
        date: selected.date,
        time: selected.time,
        durationMinutes,
        flow: input.flow as DeliveryFlow,
      },
    );
    return {
      record: null,
      errorCode: availability.reasonCode === 'CAPACITY_EXCEEDED'
        ? 'RESERVATION_CONFLICT'
        : availability.reasonCode,
      error: availability.reasonCode === 'CAPACITY_EXCEEDED'
        ? 'The selected slot was reserved before confirmation. Choose a compatible alternative.'
        : availability.message,
      alternatives,
    };
  }

  const warehouse = selectedWarehouse(configuration, input.warehouseId)!;
  const supplier = getSupplierOrganizationById(supplierOrganizationId);
  const approval = previewNonWeeklyApproval(actor, configuration, input);
  const sequence = recordSequence(records);
  const suffix = sequence.toString().padStart(3, '0');
  const timestamp = new Date(Date.UTC(2026, 7, 4, 12, sequence, 0)).toISOString();
  const historyReason = evidenceSummary(input, durationMinutes);
  const record: AppointmentWorkspaceRecord = {
    id: `appointment-nonweekly-${supplierOrganizationId}-${suffix}`,
    systemReference: `APT-NW-2026-${suffix}`,
    externalReference: normalize(input.referenceNumber),
    purchaseOrderNumber: normalize(input.purchaseOrderNumber),
    asnNumber: normalize(input.asnNumber),
    supplierOrganizationId,
    supplierName: supplier.displayName,
    carrierName: supplier.displayName,
    warehouseId: warehouse.id,
    warehouseName: warehouse.displayName,
    plannedDate: selected.date,
    plannedTime: selected.time,
    timeZone: warehouse.timezone,
    deliveryType: input.flow as DeliveryFlow,
    sourceKind: 'NON_WEEKLY_DEMO',
    bookingOrigin: 'SUPPLIER_RESERVED',
    planningState: 'READY',
    lifecycleStatus: approval.outcome,
    changeStatus: 'NO_CHANGE_REQUEST',
    operationalStatus: 'EXPECTED',
    requiredAction: approval.outcome === 'PENDING_APPROVAL'
      ? 'Awaiting approval'
      : 'No action required',
    contactName: normalize(input.contactName),
    driverIdentification: normalize(input.driverName),
    phone: normalize(input.driverPhone),
    supplierTransportDetails: {
      tractorRegistration: normalize(input.tractorRegistration),
      trailerOrContainerRegistration: normalize(input.trailerOrContainerRegistration),
    },
    importedTransportDetails: {},
    assignedDockId: null,
    skuLines: [],
    documents: normalize(input.documentName)
      ? [{
          id: `appointment-nonweekly-${supplierOrganizationId}-${suffix}-document-001`,
          name: normalize(input.documentName),
          status: 'AVAILABLE_METADATA',
        }]
      : [{
          id: `appointment-nonweekly-${supplierOrganizationId}-${suffix}-document-empty`,
          name: 'No document metadata provided',
          status: 'NOT_PROVIDED',
        }],
    comments: normalize(input.sharedComment)
      ? [{
          id: `appointment-nonweekly-${supplierOrganizationId}-${suffix}-comment-001`,
          sequence: 1,
          visibility: 'SHARED_COMMENT',
          text: normalize(input.sharedComment),
          actorId: actor.id,
          userId: actor.userId,
          recordedAt: timestamp,
        }]
      : [],
    statusHistory: [{
      id: `appointment-nonweekly-${supplierOrganizationId}-${suffix}-status-001`,
      sequence: 1,
      category: 'PLANNING',
      from: 'DRAFT',
      to: approval.outcome,
      reason: historyReason,
      externalVisible: true,
      recordedAt: timestamp,
    }],
    changeHistory: [],
    createdBy: actor.userId,
    createdAt: timestamp,
    lastChangedAt: timestamp,
  };

  return { record, errorCode: null, error: null, alternatives: [] };
}
