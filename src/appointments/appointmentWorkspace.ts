import {
  planningAppointments,
  type BookingOrigin,
  type PlanningAppointment,
  type PlanningSkuLine,
  type PlanningState,
} from '../calendar/planningCalendar';
import type { WarehouseConfiguration } from '../demoDomain/configuration';
import {
  getSupplierOrganizationById,
  getWarehouseById,
  type DemoActor,
  type SupplierOrganizationId,
  type UiMvpRole,
  type WarehouseId,
} from '../demoDomain/demoDomain';
import {
  applyAdministratorTransportChange,
  canAdministerTransport,
  inspectTransportReconciliation,
  validateSupplierTransportDetails,
  type TransportDetails,
  type TransportReconciliationInspection,
} from '../demoDomain/transportRules';
import type {
  LifecycleChangeStatus,
  LifecycleOperationalStatus,
  LifecyclePlanningStatus,
} from '../lifecycle/lifecycle';

export const workspaceColumnIds = [
  'appointment',
  'plannedArrival',
  'warehouse',
  'supplier',
  'deliveryType',
  'externalReference',
  'purchaseOrder',
  'planningState',
  'bookingOrigin',
  'lifecycleStatus',
  'operationalStatus',
  'skuSummary',
  'transport',
  'requiredAction',
  'lastChanged',
] as const;
export type WorkspaceColumnId = (typeof workspaceColumnIds)[number];

export const workspaceSafeFields = [
  'contactName',
  'driverIdentification',
  'phone',
  'tractorRegistration',
  'trailerOrContainerRegistration',
] as const;
export type WorkspaceSafeField = (typeof workspaceSafeFields)[number];

export const workspaceCommentVisibilities = [
  'SHARED_COMMENT',
  'INTERNAL_NOTE',
] as const;
export type WorkspaceCommentVisibility =
  (typeof workspaceCommentVisibilities)[number];

export type WorkspaceSourceKind = 'WEEKLY_PLANNING' | 'NON_WEEKLY_DEMO';
export type WorkspaceCompletionFilter =
  | 'all'
  | 'active'
  | 'cancelled'
  | 'completed';
export type WorkspaceActionRequiredFilter = 'all' | 'required' | 'none';

export interface WorkspaceDocument {
  id: string;
  name: string;
  status: 'AVAILABLE_METADATA' | 'NOT_PROVIDED';
}

export interface WorkspaceComment {
  id: string;
  sequence: number;
  visibility: WorkspaceCommentVisibility;
  text: string;
  actorId: string;
  userId: string;
  recordedAt: string;
}

export interface WorkspaceStatusHistoryEntry {
  id: string;
  sequence: number;
  category: 'PLANNING' | 'LIFECYCLE' | 'CHANGE' | 'OPERATIONAL';
  from: string;
  to: string;
  reason: string;
  externalVisible: boolean;
  recordedAt: string;
}

export interface WorkspaceChangeHistoryEntry {
  id: string;
  sequence: number;
  action: 'SAFE_EDIT' | 'ADD_COMMENT';
  actorId: string;
  userId: string;
  field?: WorkspaceSafeField;
  visibility?: WorkspaceCommentVisibility;
  reason: string;
  before: string;
  after: string;
  sourceEvidence: string;
  targetEvidence: string;
  externalVisible: boolean;
  recordedAt: string;
}

export interface AppointmentWorkspaceRecord {
  id: string;
  systemReference: string;
  externalReference: string;
  purchaseOrderNumber: string;
  asnNumber: string;
  supplierOrganizationId: SupplierOrganizationId;
  supplierName: string;
  carrierName: string;
  warehouseId: WarehouseId;
  warehouseName: string;
  plannedDate: string;
  plannedTime: string;
  timeZone: string;
  deliveryType: string;
  sourceKind: WorkspaceSourceKind;
  bookingOrigin: BookingOrigin;
  planningState: PlanningState;
  lifecycleStatus: LifecyclePlanningStatus;
  changeStatus: LifecycleChangeStatus;
  operationalStatus: LifecycleOperationalStatus;
  requiredAction: string;
  contactName: string;
  driverIdentification: string;
  phone: string;
  supplierTransportDetails: TransportDetails;
  importedTransportDetails: Partial<TransportDetails>;
  assignedDockId: string | null;
  skuLines: readonly PlanningSkuLine[];
  documents: readonly WorkspaceDocument[];
  comments: readonly WorkspaceComment[];
  statusHistory: readonly WorkspaceStatusHistoryEntry[];
  changeHistory: readonly WorkspaceChangeHistoryEntry[];
  importDiagnostic?: string;
  batchLineage?: string;
  internalPlanningNote?: string;
  createdBy: string;
  createdAt: string;
  lastChangedAt: string;
}

export interface WorkspaceFilters {
  lifecycleStatus: LifecyclePlanningStatus | 'all';
  plannedDateFrom: string;
  plannedDateTo: string;
  warehouseId: WarehouseId | 'all';
  supplierOrganizationId: SupplierOrganizationId | 'all';
  deliveryType: string | 'all';
  planningState: PlanningState | 'all';
  bookingOrigin: BookingOrigin | 'all';
  actionRequired: WorkspaceActionRequiredFilter;
  completion: WorkspaceCompletionFilter;
  missingDetailsOnly: boolean;
}

export interface WorkspaceSavedView {
  id: string;
  ownerUserId: string;
  name: string;
  normalizedName: string;
  filters: WorkspaceFilters;
  columns: readonly WorkspaceColumnId[];
  isDefault: boolean;
}

export interface AppointmentWorkspaceState {
  records: readonly AppointmentWorkspaceRecord[];
  savedViews: readonly WorkspaceSavedView[];
}

export interface WorkspaceActionResult {
  state: AppointmentWorkspaceState;
  error: string | null;
}

export interface WorkspaceSavedViewResult {
  views: readonly WorkspaceSavedView[];
  error: string | null;
  savedView: WorkspaceSavedView | null;
}

export interface WorkspaceSkuTotals {
  lineCount: number;
  units: number;
  pallets: number;
}

const lifecycleStatuses = new Set<LifecyclePlanningStatus>([
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
]);

const fullInternalRoles = new Set<UiMvpRole>([
  'System Administrator',
  'Warehouse Administrator',
  'Warehouse Operator',
]);

const supplierColumns: readonly WorkspaceColumnId[] = [
  'appointment',
  'plannedArrival',
  'warehouse',
  'deliveryType',
  'externalReference',
  'purchaseOrder',
  'lifecycleStatus',
  'requiredAction',
  'lastChanged',
];

const securityColumns: readonly WorkspaceColumnId[] = [
  'appointment',
  'plannedArrival',
  'warehouse',
  'supplier',
  'purchaseOrder',
  'lifecycleStatus',
  'operationalStatus',
  'transport',
  'requiredAction',
];

const internalColumns: readonly WorkspaceColumnId[] = [
  'appointment',
  'plannedArrival',
  'warehouse',
  'supplier',
  'purchaseOrder',
  'planningState',
  'bookingOrigin',
  'lifecycleStatus',
  'operationalStatus',
  'skuSummary',
  'transport',
  'requiredAction',
  'lastChanged',
];

export const emptyWorkspaceFilters: WorkspaceFilters = {
  lifecycleStatus: 'all',
  plannedDateFrom: '',
  plannedDateTo: '',
  warehouseId: 'all',
  supplierOrganizationId: 'all',
  deliveryType: 'all',
  planningState: 'all',
  bookingOrigin: 'all',
  actionRequired: 'all',
  completion: 'all',
  missingDetailsOnly: false,
};

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function lifecycleStatus(value: string): LifecyclePlanningStatus {
  return lifecycleStatuses.has(value as LifecyclePlanningStatus)
    ? value as LifecyclePlanningStatus
    : 'SUBMITTED';
}

function deterministicTimestamp(sequence: number): string {
  const base = Date.UTC(2026, 7, 3, 18, 0, 0);
  return new Date(base + sequence * 60_000).toISOString();
}

function nextSequence(state: AppointmentWorkspaceState): number {
  return state.records.reduce((maximum, record) => Math.max(
    maximum,
    ...record.changeHistory.map((entry) => entry.sequence),
    ...record.comments.map((entry) => entry.sequence),
  ), 0) + 1;
}

function requiredActionFor(
  planningState: PlanningState,
  lifecycle: LifecyclePlanningStatus,
): string {
  if (planningState === 'AWAITING_DETAILS') return 'Awaiting SKU details';
  if (planningState === 'VALIDATION_CONFLICT') return 'Resolve planning conflict';
  if (lifecycle === 'SUBMITTED' || lifecycle === 'PENDING_APPROVAL') {
    return 'Awaiting approval';
  }
  if (lifecycle === 'CANCELLED') return 'Cancelled';
  return 'No action required';
}

function baseStatusHistory(
  appointment: PlanningAppointment,
  resolvedLifecycleStatus: LifecyclePlanningStatus,
): readonly WorkspaceStatusHistoryEntry[] {
  return [
    {
      id: `${appointment.id}-status-001`,
      sequence: 1,
      category: 'PLANNING',
      from: 'NOT_CREATED',
      to: appointment.planningState,
      reason: 'Local planning projection created.',
      externalVisible: true,
      recordedAt: '2026-08-01T08:00:00.000Z',
    },
    {
      id: `${appointment.id}-status-002`,
      sequence: 2,
      category: 'LIFECYCLE',
      from: 'NOT_CREATED',
      to: resolvedLifecycleStatus,
      reason: 'Source lifecycle evidence projected without mutation.',
      externalVisible: true,
      recordedAt: '2026-08-01T08:01:00.000Z',
    },
  ];
}

function importedTransportFor(
  appointment: PlanningAppointment,
): Partial<TransportDetails> {
  if (appointment.id !== 'planning-baltic-2001') return {};
  return {
    tractorRegistration: 'TR-IMPORT-999',
    trailerOrContainerRegistration: appointment.trailerOrContainerRegistration,
  };
}

function mapPlanningAppointment(
  appointment: PlanningAppointment,
  index: number,
): AppointmentWorkspaceRecord {
  const resolvedLifecycleStatus = lifecycleStatus(appointment.appointmentStatus);
  const supplier = getSupplierOrganizationById(appointment.supplierOrganizationId);
  const warehouse = getWarehouseById(appointment.warehouseId);
  return {
    id: appointment.id,
    systemReference: `APT-WPL-${(index + 1).toString().padStart(3, '0')}`,
    externalReference: `REF-${appointment.purchaseOrderNumber}`,
    purchaseOrderNumber: appointment.purchaseOrderNumber,
    asnNumber: appointment.id === 'planning-baltic-2001' ? 'ASN-DEMO-2001' : '',
    supplierOrganizationId: appointment.supplierOrganizationId,
    supplierName: supplier.displayName,
    carrierName: supplier.displayName,
    warehouseId: appointment.warehouseId,
    warehouseName: warehouse.displayName,
    plannedDate: appointment.plannedDate,
    plannedTime: appointment.plannedTime,
    timeZone: 'Europe/Warsaw',
    deliveryType: 'Material Delivery',
    sourceKind: 'WEEKLY_PLANNING',
    bookingOrigin: appointment.bookingOrigin,
    planningState: appointment.planningState,
    lifecycleStatus: resolvedLifecycleStatus,
    changeStatus: 'NO_CHANGE_REQUEST',
    operationalStatus: 'EXPECTED',
    requiredAction: requiredActionFor(
      appointment.planningState,
      resolvedLifecycleStatus,
    ),
    contactName: '',
    driverIdentification: '',
    phone: '',
    supplierTransportDetails: {
      tractorRegistration: appointment.tractorRegistration,
      trailerOrContainerRegistration:
        appointment.trailerOrContainerRegistration,
    },
    importedTransportDetails: importedTransportFor(appointment),
    assignedDockId: null,
    skuLines: appointment.skuLines.map((line) => ({ ...line })),
    documents: appointment.skuLines.length > 0
      ? [{
          id: `${appointment.id}-document-001`,
          name: 'Delivery details metadata',
          status: 'AVAILABLE_METADATA',
        }]
      : [{
          id: `${appointment.id}-document-empty`,
          name: 'No document metadata provided',
          status: 'NOT_PROVIDED',
        }],
    comments: [],
    statusHistory: baseStatusHistory(appointment, resolvedLifecycleStatus),
    changeHistory: [],
    importDiagnostic: appointment.importDiagnostic,
    batchLineage: appointment.batchLineage,
    internalPlanningNote: appointment.internalPlanningNote,
    createdBy: appointment.bookingOrigin,
    createdAt: `2026-08-01T08:0${index}:00.000Z`,
    lastChangedAt: `2026-08-01T08:0${index}:00.000Z`,
  };
}

function nonWeeklySupplierRecord(): AppointmentWorkspaceRecord {
  const supplier = getSupplierOrganizationById('vistula-materials');
  const warehouse = getWarehouseById('nowy-kisielin-distribution-center');
  return {
    id: 'appointment-nonweekly-vistula-001',
    systemReference: 'APT-NW-2026-001',
    externalReference: 'REF-NW-VISTULA-001',
    purchaseOrderNumber: 'PO-NW-VISTULA-001',
    asnNumber: '',
    supplierOrganizationId: 'vistula-materials',
    supplierName: supplier.displayName,
    carrierName: supplier.displayName,
    warehouseId: 'nowy-kisielin-distribution-center',
    warehouseName: warehouse.displayName,
    plannedDate: '2026-08-14',
    plannedTime: '09:30',
    timeZone: 'Europe/Warsaw',
    deliveryType: 'Packaging',
    sourceKind: 'NON_WEEKLY_DEMO',
    bookingOrigin: 'SUPPLIER_RESERVED',
    planningState: 'AWAITING_DETAILS',
    lifecycleStatus: 'CONFIRMED',
    changeStatus: 'NO_CHANGE_REQUEST',
    operationalStatus: 'EXPECTED',
    requiredAction: 'Complete vehicle contact data',
    contactName: '',
    driverIdentification: '',
    phone: '',
    supplierTransportDetails: {
      tractorRegistration: 'TR-NW-100',
      trailerOrContainerRegistration: 'TRL-NW-200',
    },
    importedTransportDetails: {},
    assignedDockId: null,
    skuLines: [],
    documents: [{
      id: 'appointment-nonweekly-vistula-001-document-empty',
      name: 'No document metadata provided',
      status: 'NOT_PROVIDED',
    }],
    comments: [],
    statusHistory: [
      {
        id: 'appointment-nonweekly-vistula-001-status-001',
        sequence: 1,
        category: 'LIFECYCLE',
        from: 'SUBMITTED',
        to: 'CONFIRMED',
        reason: 'Explicit non-weekly AC-SUP-002 demonstration fixture.',
        externalVisible: true,
        recordedAt: '2026-08-01T09:00:00.000Z',
      },
    ],
    changeHistory: [],
    createdBy: 'SUPPLIER_RESERVED',
    createdAt: '2026-08-01T09:00:00.000Z',
    lastChangedAt: '2026-08-01T09:00:00.000Z',
  };
}

export function createInitialAppointmentWorkspaceState(): AppointmentWorkspaceState {
  return {
    records: [
      ...planningAppointments.map(mapPlanningAppointment),
      nonWeeklySupplierRecord(),
    ],
    savedViews: [],
  };
}

export function isSupplierActor(actor: DemoActor): boolean {
  return actor.supplierOrganizationId !== undefined;
}

export function isFullInternalActor(actor: DemoActor): boolean {
  return fullInternalRoles.has(actor.role);
}

export function isSecurityActor(actor: DemoActor): boolean {
  return actor.role === 'Security Officer';
}

export function columnsForActor(actor: DemoActor): readonly WorkspaceColumnId[] {
  if (isSupplierActor(actor)) return supplierColumns;
  if (isSecurityActor(actor)) return securityColumns;
  return internalColumns;
}

export function canSelectColumns(actor: DemoActor): boolean {
  return isFullInternalActor(actor);
}

export function canSeeInternalDiagnostics(actor: DemoActor): boolean {
  return isFullInternalActor(actor);
}

export function canSeeInternalNotes(actor: DemoActor): boolean {
  return isFullInternalActor(actor);
}

export function canAddCommentVisibility(
  actor: DemoActor,
  visibility: WorkspaceCommentVisibility,
): boolean {
  if (visibility === 'SHARED_COMMENT') return true;
  return isFullInternalActor(actor);
}

export function skuTotals(
  record: Pick<AppointmentWorkspaceRecord, 'skuLines'>,
): WorkspaceSkuTotals | null {
  if (record.skuLines.length === 0) return null;
  return record.skuLines.reduce<WorkspaceSkuTotals>((totals, line) => ({
    lineCount: totals.lineCount + 1,
    units: totals.units + line.units,
    pallets: totals.pallets + line.pallets,
  }), { lineCount: 0, units: 0, pallets: 0 });
}

export function transportReconciliation(
  record: AppointmentWorkspaceRecord,
): TransportReconciliationInspection {
  return inspectTransportReconciliation(
    record.supplierTransportDetails,
    record.importedTransportDetails,
  );
}

export function visibleComments(
  record: AppointmentWorkspaceRecord,
  actor: DemoActor,
): readonly WorkspaceComment[] {
  return canSeeInternalNotes(actor)
    ? record.comments
    : record.comments.filter((comment) =>
      comment.visibility === 'SHARED_COMMENT');
}

export function visibleStatusHistory(
  record: AppointmentWorkspaceRecord,
  actor: DemoActor,
): readonly WorkspaceStatusHistoryEntry[] {
  return canSeeInternalDiagnostics(actor)
    ? record.statusHistory
    : record.statusHistory.filter((entry) => entry.externalVisible);
}

export function visibleChangeHistory(
  record: AppointmentWorkspaceRecord,
  actor: DemoActor,
): readonly WorkspaceChangeHistoryEntry[] {
  return canSeeInternalDiagnostics(actor)
    ? record.changeHistory
    : record.changeHistory.filter((entry) => entry.externalVisible);
}

function matchesCompletion(
  record: AppointmentWorkspaceRecord,
  completion: WorkspaceCompletionFilter,
): boolean {
  if (completion === 'all') return true;
  if (completion === 'cancelled') return record.lifecycleStatus === 'CANCELLED';
  if (completion === 'completed') {
    return record.operationalStatus === 'COMPLETED'
      || record.operationalStatus === 'CHECKED_OUT';
  }
  return record.lifecycleStatus !== 'CANCELLED'
    && record.operationalStatus !== 'COMPLETED'
    && record.operationalStatus !== 'CHECKED_OUT';
}

function searchableValues(
  record: AppointmentWorkspaceRecord,
  actor: DemoActor,
): readonly string[] {
  const values = [
    record.systemReference,
    record.externalReference,
    record.purchaseOrderNumber,
    record.asnNumber,
    record.supplierTransportDetails.tractorRegistration,
    record.supplierTransportDetails.trailerOrContainerRegistration,
    record.driverIdentification,
  ];
  return isSupplierActor(actor)
    ? values
    : [...values, record.supplierName, record.carrierName];
}

export function filterWorkspaceRecords(
  records: readonly AppointmentWorkspaceRecord[],
  actor: DemoActor,
  filters: WorkspaceFilters,
  searchTerm: string,
): readonly AppointmentWorkspaceRecord[] {
  const query = normalized(searchTerm);
  return records.filter((record) => {
    const matchesSearch = query.length === 0
      || searchableValues(record, actor)
        .some((value) => normalized(value).includes(query));
    const matchesFrom = !filters.plannedDateFrom
      || record.plannedDate >= filters.plannedDateFrom;
    const matchesTo = !filters.plannedDateTo
      || record.plannedDate <= filters.plannedDateTo;
    const matchesAction = filters.actionRequired === 'all'
      || (filters.actionRequired === 'required'
        ? record.requiredAction !== 'No action required'
        : record.requiredAction === 'No action required');
    return matchesSearch
      && (filters.lifecycleStatus === 'all'
        || record.lifecycleStatus === filters.lifecycleStatus)
      && matchesFrom
      && matchesTo
      && (filters.warehouseId === 'all'
        || record.warehouseId === filters.warehouseId)
      && (filters.supplierOrganizationId === 'all'
        || record.supplierOrganizationId === filters.supplierOrganizationId)
      && (filters.deliveryType === 'all'
        || record.deliveryType === filters.deliveryType)
      && (filters.planningState === 'all'
        || record.planningState === filters.planningState)
      && (filters.bookingOrigin === 'all'
        || record.bookingOrigin === filters.bookingOrigin)
      && matchesAction
      && matchesCompletion(record, filters.completion)
      && (!filters.missingDetailsOnly || record.skuLines.length === 0);
  }).slice().sort((left, right) =>
    left.plannedDate.localeCompare(right.plannedDate)
    || left.plannedTime.localeCompare(right.plannedTime)
    || left.id.localeCompare(right.id));
}

function cloneFilters(filters: WorkspaceFilters): WorkspaceFilters {
  return { ...filters };
}

export function savedViewsForActor(
  views: readonly WorkspaceSavedView[],
  actor: DemoActor,
): readonly WorkspaceSavedView[] {
  return views.filter((view) => view.ownerUserId === actor.userId);
}

export function saveWorkspaceView(
  existing: readonly WorkspaceSavedView[],
  actor: DemoActor,
  name: string,
  filters: WorkspaceFilters,
  columns: readonly WorkspaceColumnId[],
): WorkspaceSavedViewResult {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { views: existing, error: 'Saved view name is required.', savedView: null };
  }
  const normalizedName = normalized(trimmedName);
  if (existing.some((view) =>
    view.ownerUserId === actor.userId
    && view.normalizedName === normalizedName)) {
    return { views: existing, error: 'A saved view with this name already exists.', savedView: null };
  }
  const actorViews = existing.filter((view) => view.ownerUserId === actor.userId);
  const savedView: WorkspaceSavedView = {
    id: `saved-view-${actor.userId}-${(actorViews.length + 1).toString().padStart(3, '0')}`,
    ownerUserId: actor.userId,
    name: trimmedName,
    normalizedName,
    filters: cloneFilters(filters),
    columns: columns.slice(),
    isDefault: actorViews.length === 0,
  };
  return { views: [...existing, savedView], error: null, savedView };
}

export function setDefaultWorkspaceView(
  existing: readonly WorkspaceSavedView[],
  actor: DemoActor,
  viewId: string,
): WorkspaceSavedViewResult {
  const selected = existing.find((view) =>
    view.id === viewId && view.ownerUserId === actor.userId);
  if (!selected) {
    return { views: existing, error: 'The saved view is not available to the active actor.', savedView: null };
  }
  const views = existing.map((view) => view.ownerUserId === actor.userId
    ? { ...view, isDefault: view.id === viewId }
    : view);
  return {
    views,
    error: null,
    savedView: views.find((view) => view.id === viewId) ?? null,
  };
}

function failure(
  state: AppointmentWorkspaceState,
  error: string,
): WorkspaceActionResult {
  return { state, error };
}

function replaceRecord(
  state: AppointmentWorkspaceState,
  record: AppointmentWorkspaceRecord,
): AppointmentWorkspaceState {
  return {
    ...state,
    records: state.records.map((candidate) =>
      candidate.id === record.id ? record : candidate),
  };
}

function recordForAction(
  state: AppointmentWorkspaceState,
  recordId: string,
): AppointmentWorkspaceRecord | null {
  return state.records.find((record) => record.id === recordId) ?? null;
}

function fieldValue(
  record: AppointmentWorkspaceRecord,
  field: WorkspaceSafeField,
): string {
  if (field === 'tractorRegistration') {
    return record.supplierTransportDetails.tractorRegistration;
  }
  if (field === 'trailerOrContainerRegistration') {
    return record.supplierTransportDetails.trailerOrContainerRegistration;
  }
  return record[field];
}

function externalVisibilityForEdit(
  actor: DemoActor,
  field: WorkspaceSafeField,
): boolean {
  return isSupplierActor(actor)
    || workspaceSafeFields.includes(field);
}

export function editableFieldsForRecord(
  actor: DemoActor,
  record: AppointmentWorkspaceRecord,
  warehouse: Pick<WarehouseConfiguration, 'id' | 'administratorUserIds'>,
): readonly WorkspaceSafeField[] {
  if (record.operationalStatus !== 'EXPECTED') return [];
  if (isSupplierActor(actor)) {
    return actor.supplierOrganizationId === record.supplierOrganizationId
      ? workspaceSafeFields
      : [];
  }
  if (actor.role === 'System Administrator'
    || actor.role === 'Warehouse Administrator') {
    return canAdministerTransport(actor, warehouse)
      ? workspaceSafeFields
      : ['contactName', 'driverIdentification', 'phone'];
  }
  if (actor.role === 'Warehouse Operator') {
    return ['contactName', 'driverIdentification', 'phone'];
  }
  return [];
}

export function updateWorkspaceField(
  state: AppointmentWorkspaceState,
  recordId: string,
  actor: DemoActor,
  canView: boolean,
  warehouse: Pick<WarehouseConfiguration, 'id' | 'administratorUserIds'>,
  field: WorkspaceSafeField,
  nextValue: string,
  reason: string,
): WorkspaceActionResult {
  const record = recordForAction(state, recordId);
  if (!record || !canView) return failure(state, 'Appointment is not available to the active actor.');
  if (record.operationalStatus !== 'EXPECTED') {
    return failure(state, 'Safe inline editing is blocked at or after CHECKED_IN.');
  }
  if (!editableFieldsForRecord(actor, record, warehouse).includes(field)) {
    return failure(state, 'The active actor cannot edit this field for the appointment.');
  }
  const normalizedReason = reason.trim();
  if (!normalizedReason) return failure(state, 'An edit reason is required.');
  const next = nextValue.trim();
  if (!next) return failure(state, 'The replacement value is required.');
  const before = fieldValue(record, field);
  if (before === next) return failure(state, 'The field value is unchanged.');

  let updatedRecord: AppointmentWorkspaceRecord;
  if (field === 'tractorRegistration'
    || field === 'trailerOrContainerRegistration') {
    const proposed: TransportDetails = {
      ...record.supplierTransportDetails,
      [field]: next,
    };
    if (isSupplierActor(actor)) {
      if (!validateSupplierTransportDetails(proposed).valid) {
        return failure(state, 'Both Supplier transport identifiers must remain present.');
      }
      updatedRecord = { ...record, supplierTransportDetails: proposed };
    } else {
      try {
        const result = applyAdministratorTransportChange({
          actor,
          warehouse,
          origin: record.bookingOrigin,
          current: record.supplierTransportDetails,
          next: proposed,
          reason: normalizedReason,
        });
        updatedRecord = {
          ...record,
          supplierTransportDetails: result.details,
        };
      } catch (error) {
        return failure(
          state,
          error instanceof Error ? error.message : 'Transport change was blocked.',
        );
      }
    }
  } else {
    updatedRecord = { ...record, [field]: next };
  }

  const sequence = nextSequence(state);
  const recordedAt = deterministicTimestamp(sequence);
  const history: WorkspaceChangeHistoryEntry = {
    id: `workspace-history-${sequence.toString().padStart(3, '0')}`,
    sequence,
    action: 'SAFE_EDIT',
    actorId: actor.id,
    userId: actor.userId,
    field,
    reason: normalizedReason,
    before,
    after: next,
    sourceEvidence: `${field}=${before}`,
    targetEvidence: `${field}=${next}`,
    externalVisible: externalVisibilityForEdit(actor, field),
    recordedAt,
  };
  updatedRecord = {
    ...updatedRecord,
    changeHistory: [...record.changeHistory, history],
    lastChangedAt: recordedAt,
  };
  return { state: replaceRecord(state, updatedRecord), error: null };
}

export function addWorkspaceComment(
  state: AppointmentWorkspaceState,
  recordId: string,
  actor: DemoActor,
  canView: boolean,
  visibility: WorkspaceCommentVisibility | '',
  text: string,
  reason: string,
): WorkspaceActionResult {
  const record = recordForAction(state, recordId);
  if (!record || !canView) return failure(state, 'Appointment is not available to the active actor.');
  if (!visibility) return failure(state, 'Comment visibility must be selected explicitly.');
  if (!canAddCommentVisibility(actor, visibility)) {
    return failure(state, 'The active actor cannot create an Internal Note.');
  }
  const normalizedText = text.trim();
  if (!normalizedText) return failure(state, 'Comment text is required.');
  const normalizedReason = reason.trim();
  if (!normalizedReason) return failure(state, 'A comment reason is required.');
  const sequence = nextSequence(state);
  const recordedAt = deterministicTimestamp(sequence);
  const comment: WorkspaceComment = {
    id: `workspace-comment-${sequence.toString().padStart(3, '0')}`,
    sequence,
    visibility,
    text: normalizedText,
    actorId: actor.id,
    userId: actor.userId,
    recordedAt,
  };
  const history: WorkspaceChangeHistoryEntry = {
    id: `workspace-history-${sequence.toString().padStart(3, '0')}`,
    sequence,
    action: 'ADD_COMMENT',
    actorId: actor.id,
    userId: actor.userId,
    visibility,
    reason: normalizedReason,
    before: '',
    after: normalizedText,
    sourceEvidence: 'No comment',
    targetEvidence: `${visibility}:${normalizedText}`,
    externalVisible: visibility === 'SHARED_COMMENT',
    recordedAt,
  };
  const updatedRecord: AppointmentWorkspaceRecord = {
    ...record,
    comments: [...record.comments, comment],
    changeHistory: [...record.changeHistory, history],
    lastChangedAt: recordedAt,
  };
  return { state: replaceRecord(state, updatedRecord), error: null };
}

export function withSavedViews(
  state: AppointmentWorkspaceState,
  views: readonly WorkspaceSavedView[],
): AppointmentWorkspaceState {
  return { ...state, savedViews: views };
}

export function fieldLabel(field: WorkspaceSafeField): string {
  const labels: Readonly<Record<WorkspaceSafeField, string>> = {
    contactName: 'Contact name',
    driverIdentification: 'Driver name or identification',
    phone: 'Phone',
    tractorRegistration: 'Tractor registration',
    trailerOrContainerRegistration: 'Trailer or container registration',
  };
  return labels[field];
}
