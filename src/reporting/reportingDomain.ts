import type {
  AppointmentWorkspaceRecord,
} from '../appointments/appointmentWorkspace';
import type {
  DemoActor,
  SupplierOrganizationId,
  UiMvpRole,
  WarehouseId,
} from '../demoDomain/demoDomain';
import type { BookingOrigin, PlanningState } from '../calendar/planningCalendar';
import type { LifecyclePlanningStatus } from '../lifecycle/lifecycle';

export const reportModes = [
  'WEEKLY_ALL_DELIVERIES',
  'MONTHLY_SLIPSHEET',
  'CUSTOM',
] as const;
export type ReportMode = (typeof reportModes)[number];

export const reportLevels = ['PO', 'SKU'] as const;
export type ReportLevel = (typeof reportLevels)[number];
export type ReportSortDirection = 'ASC' | 'DESC';

export const reportColumnIds = [
  'appointmentReference',
  'warehouse',
  'plannedDate',
  'plannedTime',
  'purchaseOrder',
  'supplier',
  'bookingOrigin',
  'planningState',
  'appointmentStatus',
  'tractorRegistration',
  'trailerRegistration',
  'sourceKind',
  'skuSummary',
  'skuCount',
  'units',
  'pallets',
  'loadCarrierTypes',
  'goodsCategories',
  'handlingSummary',
  'sku',
  'description',
  'loadCarrierType',
  'goodsCategory',
  'handling',
] as const;
export type ReportColumnId = (typeof reportColumnIds)[number];
export type ReportCellValue = string | number | null;

export const reportColumnLabels: Readonly<Record<ReportColumnId, string>> = {
  appointmentReference: 'Appointment',
  warehouse: 'Warehouse',
  plannedDate: 'Planned date',
  plannedTime: 'Planned time',
  purchaseOrder: 'Purchase order',
  supplier: 'Supplier',
  bookingOrigin: 'Booking origin',
  planningState: 'Planning state',
  appointmentStatus: 'Appointment status',
  tractorRegistration: 'Tractor registration',
  trailerRegistration: 'Trailer or container registration',
  sourceKind: 'Source kind',
  skuSummary: 'SKU summary',
  skuCount: 'SKU count',
  units: 'Units',
  pallets: 'Pallets',
  loadCarrierTypes: 'Load carrier types',
  goodsCategories: 'Goods categories',
  handlingSummary: 'Handling summary',
  sku: 'SKU',
  description: 'Description',
  loadCarrierType: 'Load carrier type',
  goodsCategory: 'Goods category',
  handling: 'Handling',
};

export const poReportColumns: readonly ReportColumnId[] = [
  'appointmentReference',
  'warehouse',
  'plannedDate',
  'plannedTime',
  'purchaseOrder',
  'supplier',
  'bookingOrigin',
  'planningState',
  'appointmentStatus',
  'tractorRegistration',
  'trailerRegistration',
  'sourceKind',
  'skuSummary',
  'skuCount',
  'units',
  'pallets',
  'loadCarrierTypes',
  'goodsCategories',
  'handlingSummary',
];

export const skuReportColumns: readonly ReportColumnId[] = [
  'appointmentReference',
  'warehouse',
  'plannedDate',
  'plannedTime',
  'purchaseOrder',
  'supplier',
  'bookingOrigin',
  'planningState',
  'appointmentStatus',
  'tractorRegistration',
  'trailerRegistration',
  'sourceKind',
  'sku',
  'description',
  'units',
  'pallets',
  'loadCarrierType',
  'goodsCategory',
  'handling',
];

export const defaultPoColumns: readonly ReportColumnId[] = [
  'appointmentReference',
  'plannedDate',
  'plannedTime',
  'warehouse',
  'purchaseOrder',
  'supplier',
  'bookingOrigin',
  'planningState',
  'appointmentStatus',
  'skuSummary',
  'units',
  'pallets',
  'tractorRegistration',
  'trailerRegistration',
];

export const defaultSkuColumns: readonly ReportColumnId[] = [
  'appointmentReference',
  'plannedDate',
  'plannedTime',
  'warehouse',
  'purchaseOrder',
  'supplier',
  'sku',
  'description',
  'units',
  'pallets',
  'loadCarrierType',
  'goodsCategory',
  'handling',
  'tractorRegistration',
  'trailerRegistration',
];

export interface ReportFilters {
  warehouseId: WarehouseId | 'all';
  supplierOrganizationId: SupplierOrganizationId | 'all';
  bookingOrigin: BookingOrigin | 'all';
  planningState: PlanningState | 'all';
  appointmentStatus: LifecyclePlanningStatus | 'all';
  search: string;
}

export interface ReportSort {
  column: ReportColumnId;
  direction: ReportSortDirection;
}

export interface ReportDefinition {
  mode: ReportMode;
  level: ReportLevel;
  dateFrom: string;
  dateTo: string;
  filters: ReportFilters;
  columns: readonly ReportColumnId[];
  sort: ReportSort;
}

export interface ReportRow {
  key: string;
  appointmentId: string;
  lineId: string | null;
  plannedDate: string;
  supplierOrganizationId: SupplierOrganizationId;
  supplierName: string;
  units: number;
  pallets: number;
  values: Readonly<Partial<Record<ReportColumnId, ReportCellValue>>>;
}

export interface ReportSummaryRow {
  key: string;
  label: string;
  appointmentCount: number;
  units: number;
  pallets: number;
}

export interface ReportValidation {
  valid: boolean;
  errors: readonly string[];
}

const authorizedRoles = new Set<UiMvpRole>([
  'System Administrator',
  'Warehouse Administrator',
  'Warehouse Operator',
]);

const emptyFilters: ReportFilters = {
  warehouseId: 'all',
  supplierOrganizationId: 'all',
  bookingOrigin: 'all',
  planningState: 'all',
  appointmentStatus: 'all',
  search: '',
};

function twoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${twoDigits(date.getUTCMonth() + 1)}-${twoDigits(date.getUTCDate())}`;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return isoDate(date) === value ? date : null;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

function compareStrings(left: string, right: string): number {
  const a = normalized(left);
  const b = normalized(right);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function distinctSorted(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values.filter(Boolean))).sort(compareStrings);
}

function compareValues(
  left: ReportCellValue | undefined,
  right: ReportCellValue | undefined,
): number {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return compareStrings(String(left), String(right));
}

function lineTotals(record: AppointmentWorkspaceRecord): {
  skuCount: number;
  units: number;
  pallets: number;
} | null {
  if (record.skuLines.length === 0) return null;
  return record.skuLines.reduce((total, line) => ({
    skuCount: total.skuCount + 1,
    units: total.units + line.units,
    pallets: total.pallets + line.pallets,
  }), { skuCount: 0, units: 0, pallets: 0 });
}

function commonValues(record: AppointmentWorkspaceRecord): Readonly<Partial<Record<ReportColumnId, ReportCellValue>>> {
  return {
    appointmentReference: record.systemReference,
    warehouse: record.warehouseName,
    plannedDate: record.plannedDate,
    plannedTime: record.plannedTime,
    purchaseOrder: record.purchaseOrderNumber,
    supplier: record.supplierName,
    bookingOrigin: record.bookingOrigin,
    planningState: record.planningState,
    appointmentStatus: record.lifecycleStatus,
    tractorRegistration: record.supplierTransportDetails.tractorRegistration,
    trailerRegistration: record.supplierTransportDetails.trailerOrContainerRegistration,
    sourceKind: record.sourceKind,
  };
}

function poRow(record: AppointmentWorkspaceRecord): ReportRow {
  const totals = lineTotals(record);
  const loadCarrierTypes = distinctSorted(record.skuLines.map((line) => line.loadCarrierType));
  const goodsCategories = distinctSorted(record.skuLines.map((line) => line.goodsCategory));
  const handling = distinctSorted(record.skuLines.map((line) => line.handling));
  return {
    key: record.id,
    appointmentId: record.id,
    lineId: null,
    plannedDate: record.plannedDate,
    supplierOrganizationId: record.supplierOrganizationId,
    supplierName: record.supplierName,
    units: totals?.units ?? 0,
    pallets: totals?.pallets ?? 0,
    values: {
      ...commonValues(record),
      skuSummary: totals
        ? `${totals.skuCount} SKU lines`
        : 'Awaiting SKU details',
      skuCount: totals?.skuCount ?? null,
      units: totals?.units ?? null,
      pallets: totals?.pallets ?? null,
      loadCarrierTypes: loadCarrierTypes.join(' | ') || null,
      goodsCategories: goodsCategories.join(' | ') || null,
      handlingSummary: handling.join(' | ') || null,
      sku: record.skuLines.map((line) => line.sku).join(' | ') || null,
      description: record.skuLines.map((line) => line.description).join(' | ') || null,
    },
  };
}

function skuRows(record: AppointmentWorkspaceRecord): readonly ReportRow[] {
  return record.skuLines.map((line) => ({
    key: `${record.id}:${line.id}`,
    appointmentId: record.id,
    lineId: line.id,
    plannedDate: record.plannedDate,
    supplierOrganizationId: record.supplierOrganizationId,
    supplierName: record.supplierName,
    units: line.units,
    pallets: line.pallets,
    values: {
      ...commonValues(record),
      sku: line.sku,
      description: line.description,
      units: line.units,
      pallets: line.pallets,
      loadCarrierType: line.loadCarrierType,
      goodsCategory: line.goodsCategory,
      handling: line.handling,
    },
  }));
}

function searchableValues(row: ReportRow): readonly string[] {
  return [
    row.values.appointmentReference,
    row.values.purchaseOrder,
    row.values.sku,
    row.values.description,
    row.values.supplier,
    row.values.tractorRegistration,
    row.values.trailerRegistration,
  ].filter((value): value is string | number => value !== null && value !== undefined)
    .map(String);
}

function recordMatchesFilters(
  record: AppointmentWorkspaceRecord,
  definition: ReportDefinition,
): boolean {
  const { filters } = definition;
  return record.plannedDate >= definition.dateFrom
    && record.plannedDate <= definition.dateTo
    && (filters.warehouseId === 'all' || record.warehouseId === filters.warehouseId)
    && (filters.supplierOrganizationId === 'all'
      || record.supplierOrganizationId === filters.supplierOrganizationId)
    && (filters.bookingOrigin === 'all' || record.bookingOrigin === filters.bookingOrigin)
    && (filters.planningState === 'all' || record.planningState === filters.planningState)
    && (filters.appointmentStatus === 'all'
      || record.lifecycleStatus === filters.appointmentStatus);
}

function rowMatchesSearch(row: ReportRow, search: string): boolean {
  const query = normalized(search);
  return query.length === 0
    || searchableValues(row).some((value) => normalized(value).includes(query));
}

function stableSortRows(
  rows: readonly ReportRow[],
  sort: ReportSort,
): readonly ReportRow[] {
  const multiplier = sort.direction === 'ASC' ? 1 : -1;
  return rows.slice().sort((left, right) => {
    const primary = compareValues(left.values[sort.column], right.values[sort.column]);
    if (primary !== 0) return primary * multiplier;
    const appointment = compareStrings(left.appointmentId, right.appointmentId);
    if (appointment !== 0) return appointment;
    return compareStrings(left.lineId ?? '', right.lineId ?? '');
  });
}

function allowedColumns(level: ReportLevel): readonly ReportColumnId[] {
  return level === 'PO' ? poReportColumns : skuReportColumns;
}

export function canAccessReporting(role: UiMvpRole): boolean {
  return authorizedRoles.has(role);
}

export function resolveWeekRange(anchor: string): { dateFrom: string; dateTo: string } | null {
  const date = parseIsoDate(anchor);
  if (!date) return null;
  const weekday = date.getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const start = new Date(date);
  start.setUTCDate(start.getUTCDate() - daysFromMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { dateFrom: isoDate(start), dateTo: isoDate(end) };
}

export function resolveMonthRange(anchor: string): { dateFrom: string; dateTo: string } | null {
  const date = parseIsoDate(anchor);
  if (!date) return null;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { dateFrom: isoDate(start), dateTo: isoDate(end) };
}

export function createInitialReportDefinition(anchor: string): ReportDefinition {
  const range = resolveWeekRange(anchor) ?? { dateFrom: anchor, dateTo: anchor };
  return {
    mode: 'WEEKLY_ALL_DELIVERIES',
    level: 'PO',
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    filters: { ...emptyFilters },
    columns: defaultPoColumns.slice(),
    sort: { column: 'plannedDate', direction: 'ASC' },
  };
}

export function applyReportMode(
  current: ReportDefinition,
  mode: ReportMode,
  anchor: string,
): ReportDefinition {
  if (mode === 'WEEKLY_ALL_DELIVERIES') {
    const range = resolveWeekRange(anchor);
    return {
      ...current,
      mode,
      level: 'PO',
      dateFrom: range?.dateFrom ?? '',
      dateTo: range?.dateTo ?? '',
      columns: defaultPoColumns.slice(),
      sort: { column: 'plannedDate', direction: 'ASC' },
    };
  }
  if (mode === 'MONTHLY_SLIPSHEET') {
    const range = resolveMonthRange(anchor);
    return {
      ...current,
      mode,
      level: 'SKU',
      dateFrom: range?.dateFrom ?? '',
      dateTo: range?.dateTo ?? '',
      columns: defaultSkuColumns.slice(),
      sort: { column: 'plannedDate', direction: 'ASC' },
    };
  }
  return { ...current, mode };
}

export function changeReportLevel(
  current: ReportDefinition,
  level: ReportLevel,
): ReportDefinition {
  const catalog = allowedColumns(level);
  const retained = current.columns.filter((column) => catalog.includes(column));
  const columns = retained.length > 0
    ? retained
    : level === 'PO' ? defaultPoColumns.slice() : defaultSkuColumns.slice();
  const sortColumn = catalog.includes(current.sort.column)
    ? current.sort.column
    : 'plannedDate';
  return {
    ...current,
    level,
    columns,
    sort: { ...current.sort, column: sortColumn },
  };
}

export function sanitizeReportDefinition(
  definition: ReportDefinition,
): ReportDefinition {
  const catalog = allowedColumns(definition.level);
  const columns = definition.columns.filter((column, index, all) =>
    catalog.includes(column) && all.indexOf(column) === index);
  const sortColumn = catalog.includes(definition.sort.column)
    ? definition.sort.column
    : 'plannedDate';
  return {
    ...definition,
    columns,
    sort: { ...definition.sort, column: sortColumn },
  };
}

export function validateReportDefinition(
  definition: ReportDefinition,
): ReportValidation {
  const errors: string[] = [];
  const start = parseIsoDate(definition.dateFrom);
  const end = parseIsoDate(definition.dateTo);
  if (!start) errors.push('A valid inclusive start date is required.');
  if (!end) errors.push('A valid inclusive end date is required.');
  if (start && end && definition.dateFrom > definition.dateTo) {
    errors.push('The inclusive start date cannot be after the end date.');
  }
  const catalog = allowedColumns(definition.level);
  if (definition.columns.length === 0) {
    errors.push('Select at least one report column.');
  }
  if (definition.columns.some((column) => !catalog.includes(column))) {
    errors.push('A selected column is not available at the active report level.');
  }
  if (!catalog.includes(definition.sort.column)) {
    errors.push('The sort column is not available at the active report level.');
  }
  return { valid: errors.length === 0, errors };
}

export function buildReportRows(
  records: readonly AppointmentWorkspaceRecord[],
  definition: ReportDefinition,
): readonly ReportRow[] {
  const sanitized = sanitizeReportDefinition(definition);
  if (!validateReportDefinition(sanitized).valid) return [];
  const rows = records
    .filter((record) => recordMatchesFilters(record, sanitized))
    .flatMap((record) => sanitized.level === 'PO' ? [poRow(record)] : skuRows(record))
    .filter((row) => rowMatchesSearch(row, sanitized.filters.search));
  return stableSortRows(rows, sanitized.sort);
}

function summarize(
  rows: readonly ReportRow[],
  keyFor: (row: ReportRow) => string,
  labelFor: (row: ReportRow) => string,
): readonly ReportSummaryRow[] {
  const groups = new Map<string, {
    label: string;
    appointments: Set<string>;
    units: number;
    pallets: number;
  }>();
  for (const row of rows) {
    const key = keyFor(row);
    const group = groups.get(key) ?? {
      label: labelFor(row),
      appointments: new Set<string>(),
      units: 0,
      pallets: 0,
    };
    group.appointments.add(row.appointmentId);
    group.units += row.units;
    group.pallets += row.pallets;
    groups.set(key, group);
  }
  return Array.from(groups.entries())
    .map(([key, group]) => ({
      key,
      label: group.label,
      appointmentCount: group.appointments.size,
      units: group.units,
      pallets: group.pallets,
    }))
    .sort((left, right) => compareStrings(left.label, right.label));
}

export function summarizeBySupplier(
  rows: readonly ReportRow[],
): readonly ReportSummaryRow[] {
  return summarize(
    rows,
    (row) => row.supplierOrganizationId,
    (row) => row.supplierName,
  );
}

export function summarizeByMonth(
  rows: readonly ReportRow[],
): readonly ReportSummaryRow[] {
  return summarize(
    rows,
    (row) => row.plannedDate.slice(0, 7),
    (row) => row.plannedDate.slice(0, 7),
  );
}

export function availableReportColumns(level: ReportLevel): readonly ReportColumnId[] {
  return allowedColumns(level);
}

export function reportCellValue(
  row: ReportRow,
  column: ReportColumnId,
): ReportCellValue {
  return row.values[column] ?? null;
}

export function reportMetadata(
  definition: ReportDefinition,
  actor: Pick<DemoActor, 'role' | 'userId'>,
): readonly (readonly [string, string])[] {
  const filters = definition.filters;
  return [
    ['Report mode', definition.mode],
    ['Report level', definition.level],
    ['Inclusive date from', definition.dateFrom],
    ['Inclusive date to', definition.dateTo],
    ['Warehouse filter', filters.warehouseId],
    ['Supplier filter', filters.supplierOrganizationId],
    ['Booking origin filter', filters.bookingOrigin],
    ['Planning state filter', filters.planningState],
    ['Appointment status filter', filters.appointmentStatus],
    ['Search', filters.search.trim()],
    ['Selected columns', definition.columns.join('|')],
    ['Sort', `${definition.sort.column}:${definition.sort.direction}`],
    ['Active role', actor.role],
    ['Active user', actor.userId],
    ['Effect boundary', 'Generated locally for demonstration; no data was persisted or sent.'],
  ];
}

export function reportFileStem(definition: ReportDefinition): string {
  const mode = definition.mode.toLocaleLowerCase('en-US').replaceAll('_', '-');
  return `${mode}-${definition.level.toLocaleLowerCase('en-US')}-${definition.dateFrom}-to-${definition.dateTo}`;
}
