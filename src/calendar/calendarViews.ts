import type {
  AppointmentWorkspaceRecord,
  WorkspaceSkuTotals,
} from '../appointments/appointmentWorkspace';
import {
  deliveryFlows,
  type DeliveryFlow,
  type DockId,
  type WarehouseConfiguration,
} from '../demoDomain/configuration';
import type { WarehouseId } from '../demoDomain/demoDomain';
import {
  buildPlanningCalendar,
  type PlanningAppointment,
  type PlanningCalendarCard,
} from './planningCalendar';

export const calendarViewIds = [
  'day',
  'week',
  'dock',
  'load-type',
  'list',
  'workflow',
] as const;

export type CalendarViewId = (typeof calendarViewIds)[number];

export const calendarViewLabels: Readonly<Record<CalendarViewId, string>> = {
  day: 'Day',
  week: 'Week',
  dock: 'Dock',
  'load-type': 'Load Type',
  list: 'List',
  workflow: 'Workflow',
};

export interface CalendarFilters {
  dateFrom: string;
  dateTo: string;
  warehouseId: WarehouseId | 'all';
  deliveryType: string | 'all';
}

export const emptyCalendarFilters: CalendarFilters = {
  dateFrom: '',
  dateTo: '',
  warehouseId: 'all',
  deliveryType: 'all',
};

export interface CalendarProjectionRecord {
  record: AppointmentWorkspaceRecord;
  card: PlanningCalendarCard;
  totals: WorkspaceSkuTotals | null;
  dayKey: string;
  weekKey: string;
  weekLabel: string;
  dockKey: string;
  dockLabel: string;
  loadTypeKey: string;
  loadTypeLabel: string;
  workflowKey: string;
  workflowLabel: string;
}

export interface CalendarProjectionGroup {
  id: string;
  label: string;
  records: readonly CalendarProjectionRecord[];
}

export interface CalendarFilterOptions {
  warehouses: readonly {
    id: WarehouseId;
    name: string;
  }[];
  deliveryTypes: readonly string[];
}

function displayDeliveryType(record: AppointmentWorkspaceRecord): string {
  return record.deliveryType.trim() || 'Unspecified';
}

function durationMinutes(record: AppointmentWorkspaceRecord): number {
  for (const entry of record.statusHistory.slice().reverse()) {
    const match = /(?:^| · )(\d+) min(?: · |$)/.exec(entry.reason);
    if (match) return Number(match[1]);
  }
  return 30;
}

function capacityFlow(record: AppointmentWorkspaceRecord): DeliveryFlow {
  return deliveryFlows.includes(record.deliveryType as DeliveryFlow)
    ? record.deliveryType as DeliveryFlow
    : 'Material Delivery';
}

export function toPlanningCalendarAppointment(
  record: AppointmentWorkspaceRecord,
): PlanningAppointment {
  return {
    id: record.id,
    supplierOrganizationId: record.supplierOrganizationId,
    supplierName: record.supplierName,
    warehouseId: record.warehouseId,
    purchaseOrderNumber: record.purchaseOrderNumber || record.systemReference,
    deliveryPartKey: '1',
    plannedDate: record.plannedDate,
    plannedTime: record.plannedTime,
    bookingOrigin: record.bookingOrigin,
    planningState: record.planningState,
    appointmentStatus: record.lifecycleStatus,
    tractorRegistration: record.supplierTransportDetails.tractorRegistration,
    trailerOrContainerRegistration:
      record.supplierTransportDetails.trailerOrContainerRegistration,
    skuLines: record.skuLines,
    durationMinutes: durationMinutes(record),
    flow: capacityFlow(record),
    assignedDockId: record.assignedDockId as DockId | null,
    operationalStatus: record.operationalStatus,
  };
}

function isoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function weekIdentity(value: string): { key: string; label: string } {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return { key: `invalid-${value}`, label: 'Invalid planned week' };
  }
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const start = isoDate(monday);
  const end = isoDate(sunday);
  return { key: start, label: `${start} – ${end}` };
}

function skuTotals(record: AppointmentWorkspaceRecord): WorkspaceSkuTotals | null {
  if (record.skuLines.length === 0) return null;
  return record.skuLines.reduce<WorkspaceSkuTotals>((totals, line) => ({
    lineCount: totals.lineCount + 1,
    units: totals.units + line.units,
    pallets: totals.pallets + line.pallets,
  }), { lineCount: 0, units: 0, pallets: 0 });
}

function workflowIdentity(record: AppointmentWorkspaceRecord): {
  key: string;
  label: string;
} {
  const key = [
    record.planningState,
    record.lifecycleStatus,
    record.operationalStatus,
    record.requiredAction,
  ].join('|');
  return {
    key,
    label: `${record.planningState} · ${record.lifecycleStatus} · ${record.operationalStatus} · ${record.requiredAction}`,
  };
}

export function validateCalendarFilters(filters: CalendarFilters): string | null {
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    return 'Planned date from must not be after planned date to.';
  }
  return null;
}

function matchesFilters(
  record: AppointmentWorkspaceRecord,
  filters: CalendarFilters,
): boolean {
  return (!filters.dateFrom || record.plannedDate >= filters.dateFrom)
    && (!filters.dateTo || record.plannedDate <= filters.dateTo)
    && (filters.warehouseId === 'all'
      || record.warehouseId === filters.warehouseId)
    && (filters.deliveryType === 'all'
      || displayDeliveryType(record) === filters.deliveryType);
}

export function calendarFilterOptions(
  records: readonly AppointmentWorkspaceRecord[],
): CalendarFilterOptions {
  const warehouseNames = new Map<WarehouseId, string>();
  records.forEach((record) => {
    warehouseNames.set(record.warehouseId, record.warehouseName);
  });
  return {
    warehouses: Array.from(warehouseNames, ([id, name]) => ({ id, name }))
      .sort((left, right) =>
        left.name.localeCompare(right.name, 'en-US')
        || left.id.localeCompare(right.id)),
    deliveryTypes: Array.from(new Set(records.map(displayDeliveryType)))
      .sort((left, right) => left.localeCompare(right, 'en-US')),
  };
}

export function buildWorkspaceCalendarProjection(
  records: readonly AppointmentWorkspaceRecord[],
  warehouses: readonly WarehouseConfiguration[],
  filters: CalendarFilters = emptyCalendarFilters,
): readonly CalendarProjectionRecord[] {
  if (validateCalendarFilters(filters)) return [];

  const planningCards = buildPlanningCalendar(
    records.map(toPlanningCalendarAppointment),
    warehouses,
  );
  const cardsById = new Map(planningCards.map((card) => [card.appointment.id, card]));

  return records
    .filter((record) => matchesFilters(record, filters))
    .slice()
    .sort((left, right) =>
      left.plannedDate.localeCompare(right.plannedDate)
      || left.plannedTime.localeCompare(right.plannedTime)
      || left.id.localeCompare(right.id))
    .map((record) => {
      const week = weekIdentity(record.plannedDate);
      const workflow = workflowIdentity(record);
      const loadType = displayDeliveryType(record);
      const dock = record.assignedDockId ?? 'unassigned';
      const card = cardsById.get(record.id);
      if (!card) throw new Error(`Missing calendar card for ${record.id}.`);
      return {
        record,
        card,
        totals: skuTotals(record),
        dayKey: record.plannedDate,
        weekKey: week.key,
        weekLabel: week.label,
        dockKey: dock,
        dockLabel: record.assignedDockId ?? 'Unassigned',
        loadTypeKey: loadType,
        loadTypeLabel: loadType,
        workflowKey: workflow.key,
        workflowLabel: workflow.label,
      };
    });
}

function groupProjection(
  records: readonly CalendarProjectionRecord[],
  identity: (record: CalendarProjectionRecord) => { key: string; label: string },
): readonly CalendarProjectionGroup[] {
  const groups = new Map<string, CalendarProjectionGroup>();
  records.forEach((record) => {
    const { key, label } = identity(record);
    const existing = groups.get(key);
    groups.set(key, existing
      ? { ...existing, records: [...existing.records, record] }
      : { id: key, label, records: [record] });
  });
  return Array.from(groups.values());
}

export function groupCalendarProjection(
  records: readonly CalendarProjectionRecord[],
  view: Exclude<CalendarViewId, 'list'>,
): readonly CalendarProjectionGroup[] {
  switch (view) {
    case 'day':
      return groupProjection(records, (record) => ({
        key: record.dayKey,
        label: record.dayKey,
      }));
    case 'week':
      return groupProjection(records, (record) => ({
        key: record.weekKey,
        label: record.weekLabel,
      }));
    case 'dock':
      return groupProjection(records, (record) => ({
        key: record.dockKey,
        label: record.dockLabel,
      }));
    case 'load-type':
      return groupProjection(records, (record) => ({
        key: record.loadTypeKey,
        label: record.loadTypeLabel,
      }));
    case 'workflow':
      return groupProjection(records, (record) => ({
        key: record.workflowKey,
        label: record.workflowLabel,
      }));
  }
}
