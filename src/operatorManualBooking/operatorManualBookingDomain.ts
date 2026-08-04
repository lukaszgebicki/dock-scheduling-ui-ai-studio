import type {
  AppointmentWorkspaceRecord,
  WorkspaceCommentVisibility,
} from '../appointments/appointmentWorkspace';
import {
  evaluateCapacitySlot,
  findNearestCapacityAlternatives,
  type CapacityAlternative,
  type CapacityAppointment,
} from '../capacity/capacityDomain';
import {
  deliveryFlows,
  evaluateApproval,
  type DeliveryFlow,
  type DemoConfigurationState,
  type SupplierFormField,
} from '../demoDomain/configuration';
import {
  getSupplierOrganizationById,
  type DemoActor,
  type SupplierOrganizationId,
  type WarehouseId,
} from '../demoDomain/demoDomain';
import {
  buildNonWeeklySlotModel,
  configuredNonWeeklyFields,
  deriveNonWeeklyDurationMinutes,
  emptyNonWeeklyBookingInput,
  validateDeliveryData,
  validateTransportDocuments,
  type NonWeeklyBookingInput,
  type NonWeeklySlotModel,
  type NonWeeklyValidation,
} from '../nonWeeklyBooking/nonWeeklyBookingDomain';

export const operatorManualBookingSteps = [
  'WAREHOUSE_SUPPLIER_FLOW',
  'DELIVERY_DATA',
  'AVAILABLE_SLOTS',
  'TRANSPORT_DOCUMENTS',
  'SUMMARY_CONFIRMATION',
] as const;

export interface OperatorManualBookingInput extends NonWeeklyBookingInput {
  supplierOrganizationId: SupplierOrganizationId | '';
  commentVisibility: WorkspaceCommentVisibility;
}

export interface OperatorSupplierOption {
  supplierOrganizationId: SupplierOrganizationId;
  supplierName: string;
  flows: readonly DeliveryFlow[];
}

export interface OperatorWarehouseOption {
  warehouseId: WarehouseId;
  warehouseName: string;
  timezone: string;
  suppliers: readonly OperatorSupplierOption[];
}

export interface OperatorApprovalPreview {
  outcome: 'CONFIRMED' | 'PENDING_APPROVAL';
  explanation: string;
}

export interface OperatorManualConfirmationResult {
  record: AppointmentWorkspaceRecord | null;
  errorCode: string | null;
  error: string | null;
  alternatives: readonly CapacityAlternative[];
}

export const emptyOperatorManualBookingInput: OperatorManualBookingInput = {
  ...emptyNonWeeklyBookingInput,
  supplierOrganizationId: '',
  commentVisibility: 'INTERNAL_NOTE',
};

function normalize(value: string): string {
  return value.trim();
}

function optionsForOperator(
  actor: DemoActor,
  configuration: DemoConfigurationState,
): readonly OperatorWarehouseOption[] {
  if (actor.role !== 'Warehouse Operator') return [];

  return configuration.warehouses
    .filter((warehouse) =>
      warehouse.status === 'published'
      && actor.warehouseIds.includes(warehouse.id))
    .map((warehouse) => {
      const suppliers = configuration.suppliers
        .filter((supplier) =>
          supplier.status === 'active'
          && supplier.warehouseIds.includes(warehouse.id)
          && warehouse.supplierOrganizationIds.includes(supplier.organizationId))
        .map((supplier) => ({
          supplierOrganizationId: supplier.organizationId,
          supplierName: getSupplierOrganizationById(supplier.organizationId).displayName,
          flows: supplier.allowedFlows.filter((flow) =>
            warehouse.availableFlows.includes(flow)),
        }))
        .filter((supplier) => supplier.flows.length > 0)
        .sort((left, right) => supplierName(left).localeCompare(
          supplierName(right),
          'en-US',
        ));

      return {
        warehouseId: warehouse.id,
        warehouseName: warehouse.displayName,
        timezone: warehouse.timezone,
        suppliers,
      };
    })
    .filter((warehouse) => warehouse.suppliers.length > 0)
    .sort((left, right) =>
      left.warehouseName.localeCompare(right.warehouseName, 'en-US'));
}

function supplierName(option: OperatorSupplierOption): string {
  return option.supplierName;
}

export function canAccessOperatorManualBooking(
  actor: DemoActor,
  configuration: DemoConfigurationState,
): boolean {
  return optionsForOperator(actor, configuration).length > 0;
}

export function operatorManualBookingOptions(
  actor: DemoActor,
  configuration: DemoConfigurationState,
): readonly OperatorWarehouseOption[] {
  return optionsForOperator(actor, configuration);
}

export function configuredOperatorManualFields(
  configuration: DemoConfigurationState,
  input: Pick<OperatorManualBookingInput, 'warehouseId' | 'flow'>,
): readonly SupplierFormField[] {
  return configuredNonWeeklyFields(configuration, input);
}

export function validateOperatorManualScope(
  actor: DemoActor,
  configuration: DemoConfigurationState,
  input: OperatorManualBookingInput,
): NonWeeklyValidation {
  const errors: string[] = [];
  if (actor.role !== 'Warehouse Operator') {
    return {
      valid: false,
      errors: ['Only a Warehouse Operator can create an appointment on behalf of a Supplier.'],
    };
  }

  const warehouse = optionsForOperator(actor, configuration).find((candidate) =>
    candidate.warehouseId === input.warehouseId);
  if (!warehouse) errors.push('Select an assigned published warehouse.');

  const supplier = warehouse?.suppliers.find((candidate) =>
    candidate.supplierOrganizationId === input.supplierOrganizationId);
  if (!supplier) errors.push('Select an active Supplier assigned to this warehouse.');

  if (!input.flow || !supplier?.flows.includes(input.flow)) {
    errors.push('Select a configured delivery flow for this Supplier and warehouse.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateOperatorManualDeliveryData(
  configuration: DemoConfigurationState,
  input: OperatorManualBookingInput,
): NonWeeklyValidation {
  return validateDeliveryData(configuration, input);
}

export function validateOperatorManualTransport(
  configuration: DemoConfigurationState,
  input: OperatorManualBookingInput,
): NonWeeklyValidation {
  return validateTransportDocuments(configuration, input);
}

export function deriveOperatorManualDurationMinutes(
  input: OperatorManualBookingInput,
): number {
  return deriveNonWeeklyDurationMinutes(input);
}

export function buildOperatorManualSlotModel(
  configuration: DemoConfigurationState,
  records: readonly AppointmentWorkspaceRecord[],
  input: OperatorManualBookingInput,
): NonWeeklySlotModel {
  return buildNonWeeklySlotModel(configuration, records, input);
}

export function previewOperatorManualApproval(
  configuration: DemoConfigurationState,
  input: OperatorManualBookingInput,
): OperatorApprovalPreview {
  if (!input.warehouseId || !input.supplierOrganizationId || !input.flow) {
    return {
      outcome: 'PENDING_APPROVAL',
      explanation: 'Approval cannot be evaluated until warehouse, Supplier and flow are complete.',
    };
  }

  const mode = evaluateApproval(configuration, {
    warehouseId: input.warehouseId,
    supplierOrganizationId: input.supplierOrganizationId,
    flow: input.flow,
    isAdr: input.isAdr,
    isControlledTemperature: input.isControlledTemperature,
    hasRequiredDocument: normalize(input.documentName).length > 0,
    hasPurchaseOrder: normalize(input.purchaseOrderNumber).length > 0,
  });

  return mode === 'auto'
    ? {
        outcome: 'CONFIRMED',
        explanation: 'Published approval rules allow automatic confirmation.',
      }
    : {
        outcome: 'PENDING_APPROVAL',
        explanation: 'Published approval rules require Administrator decision.',
      };
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

function slotFromId(slotId: string): CapacityAlternative | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(slotId);
  return match ? { date: match[1], time: match[2] } : null;
}

function evidenceSummary(
  input: OperatorManualBookingInput,
  durationMinutes: number,
): string {
  const measures = [
    input.palletCount && `${normalize(input.palletCount)} pallets`,
    input.unitCount && `${normalize(input.unitCount)} units`,
    input.grossWeight && `${normalize(input.grossWeight)} kg`,
    input.volume && `${normalize(input.volume)} m3`,
  ].filter(Boolean).join(' · ');

  return `Operator manual booking · ${durationMinutes} min · ${normalize(input.vehicleType)}${measures ? ` · ${measures}` : ''}`;
}

function recordSequence(records: readonly AppointmentWorkspaceRecord[]): number {
  return records.filter((record) =>
    record.sourceKind === 'NON_WEEKLY_DEMO'
    && record.bookingOrigin === 'ADMIN_ADDED').length + 1;
}

export function confirmOperatorManualBooking(
  actor: DemoActor,
  configuration: DemoConfigurationState,
  records: readonly AppointmentWorkspaceRecord[],
  input: OperatorManualBookingInput,
): OperatorManualConfirmationResult {
  const scopeValidation = validateOperatorManualScope(actor, configuration, input);
  const deliveryValidation = validateOperatorManualDeliveryData(configuration, input);
  const transportValidation = validateOperatorManualTransport(configuration, input);
  const selected = slotFromId(input.selectedSlotId);

  if (!scopeValidation.valid
    || !deliveryValidation.valid
    || !transportValidation.valid
    || !selected) {
    return {
      record: null,
      errorCode: 'VALIDATION_ERROR',
      error: [
        ...scopeValidation.errors,
        ...deliveryValidation.errors,
        ...transportValidation.errors,
        ...(selected ? [] : ['Select an available slot.']),
      ].join(' '),
      alternatives: [],
    };
  }

  const supplierOrganizationId = input.supplierOrganizationId as SupplierOrganizationId;
  const warehouseId = input.warehouseId as WarehouseId;
  const flow = input.flow as DeliveryFlow;
  const duplicate = records.some((record) =>
    record.supplierOrganizationId === supplierOrganizationId
    && record.warehouseId === warehouseId
    && record.externalReference.toLocaleLowerCase('en-US')
      === normalize(input.referenceNumber).toLocaleLowerCase('en-US')
    && record.plannedDate === selected.date
    && record.plannedTime === selected.time);

  if (duplicate) {
    return {
      record: null,
      errorCode: 'ALREADY_CONFIRMED',
      error: 'This local Operator booking was already confirmed.',
      alternatives: [],
    };
  }

  const durationMinutes = deriveOperatorManualDurationMinutes(input);
  const request = {
    warehouseId,
    date: selected.date,
    time: selected.time,
    durationMinutes,
    flow,
  };
  const appointments = capacityAppointments(records);
  const availability = evaluateCapacitySlot(
    configuration.warehouses,
    appointments,
    request,
  );

  if (!availability.available) {
    const alternatives = findNearestCapacityAlternatives(
      configuration.warehouses,
      appointments,
      request,
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

  const warehouse = configuration.warehouses.find((candidate) =>
    candidate.id === warehouseId && candidate.status === 'published')!;
  const supplier = getSupplierOrganizationById(supplierOrganizationId);
  const approval = previewOperatorManualApproval(configuration, input);
  const sequence = recordSequence(records);
  const suffix = sequence.toString().padStart(3, '0');
  const timestamp = new Date(Date.UTC(2026, 7, 4, 13, sequence, 0)).toISOString();
  const recordId = `appointment-operator-${actor.userId}-${supplierOrganizationId}-${suffix}`;

  const record: AppointmentWorkspaceRecord = {
    id: recordId,
    systemReference: `APT-OP-2026-${suffix}`,
    externalReference: normalize(input.referenceNumber),
    purchaseOrderNumber: normalize(input.purchaseOrderNumber),
    asnNumber: normalize(input.asnNumber),
    supplierOrganizationId,
    supplierName: supplier.displayName,
    carrierName: supplier.displayName,
    warehouseId,
    warehouseName: warehouse.displayName,
    plannedDate: selected.date,
    plannedTime: selected.time,
    timeZone: warehouse.timezone,
    deliveryType: flow,
    sourceKind: 'NON_WEEKLY_DEMO',
    bookingOrigin: 'ADMIN_ADDED',
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
          id: `${recordId}-document-001`,
          name: normalize(input.documentName),
          status: 'AVAILABLE_METADATA',
        }]
      : [{
          id: `${recordId}-document-empty`,
          name: 'No document metadata provided',
          status: 'NOT_PROVIDED',
        }],
    comments: normalize(input.sharedComment)
      ? [{
          id: `${recordId}-comment-001`,
          sequence: 1,
          visibility: input.commentVisibility,
          text: normalize(input.sharedComment),
          actorId: actor.id,
          userId: actor.userId,
          recordedAt: timestamp,
        }]
      : [],
    statusHistory: [{
      id: `${recordId}-status-001`,
      sequence: 1,
      category: 'PLANNING',
      from: 'DRAFT',
      to: approval.outcome,
      reason: evidenceSummary(input, durationMinutes),
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
