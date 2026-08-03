import type {
  SupplierOrganizationId,
  WarehouseId,
} from '../demoDomain/demoDomain';
import type {
  WarehouseBlock,
  WarehouseConfiguration,
} from '../demoDomain/configuration';

export type BookingOrigin = 'SUPPLIER_RESERVED' | 'ADMIN_ADDED';
export type PlanningState =
  | 'AWAITING_DETAILS'
  | 'DETAILS_ATTACHED'
  | 'VALIDATION_CONFLICT'
  | 'READY';

export interface PlanningSkuLine {
  id: string;
  sku: string;
  description: string;
  units: number;
  pallets: number;
  loadCarrierType: string;
  goodsCategory: string;
  handling: string;
  warning?: string;
  internalPlanningNote?: string;
  sourceRowId?: string;
}

export interface PlanningAppointment {
  id: string;
  supplierOrganizationId: SupplierOrganizationId;
  supplierName: string;
  warehouseId: WarehouseId;
  purchaseOrderNumber: string;
  deliveryPartKey: '1';
  plannedDate: string;
  plannedTime: string;
  bookingOrigin: BookingOrigin;
  planningState: PlanningState;
  appointmentStatus: string;
  tractorRegistration: string;
  trailerOrContainerRegistration: string;
  skuLines: readonly PlanningSkuLine[];
  internalPlanningNote?: string;
  importDiagnostic?: string;
  batchLineage?: string;
}

export interface PlanningCardTotals {
  skuCount: number;
  units: number;
  pallets: number;
}

export interface CalendarConflict {
  kind:
    | 'WAREHOUSE_CONFIGURATION_MISSING'
    | 'WAREHOUSE_NOT_PUBLISHED'
    | 'OUTSIDE_WORKING_HOURS'
    | 'WAREHOUSE_BLOCKED'
    | 'CAPACITY_EXCEEDED';
  message: string;
}

export interface PlanningCalendarCard {
  appointment: PlanningAppointment;
  totals: PlanningCardTotals | null;
  conflict: CalendarConflict | null;
}

function minutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function blockApplies(block: WarehouseBlock, appointment: PlanningAppointment): boolean {
  if (block.scope.type !== 'warehouse') return false;
  if (block.schedule.kind === 'one-time') {
    if (block.schedule.date !== appointment.plannedDate) return false;
    if (block.schedule.allDay) return true;
    const planned = minutes(appointment.plannedTime);
    return planned >= minutes(block.schedule.startsAt)
      && planned < minutes(block.schedule.endsAt);
  }
  if (!block.schedule.weekdays.includes(weekday(appointment.plannedDate) as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
    return false;
  }
  const planned = minutes(appointment.plannedTime);
  return planned >= minutes(block.schedule.startsAt)
    && planned < minutes(block.schedule.endsAt);
}

function configurationConflict(
  appointment: PlanningAppointment,
  warehouse: WarehouseConfiguration | undefined,
  appointments: readonly PlanningAppointment[],
): CalendarConflict | null {
  if (!warehouse) {
    return {
      kind: 'WAREHOUSE_CONFIGURATION_MISSING',
      message: 'Calendar configuration is missing. Keep the booked slot and contact an Administrator.',
    };
  }
  if (warehouse.status !== 'published') {
    return {
      kind: 'WAREHOUSE_NOT_PUBLISHED',
      message: 'Warehouse configuration is not published. The booked slot was not changed.',
    };
  }
  const day = warehouse.workingDays.find((candidate) => candidate.weekday === weekday(appointment.plannedDate));
  const planned = minutes(appointment.plannedTime);
  if (!day?.enabled || planned < minutes(day.opensAt) || planned >= minutes(day.closesAt)) {
    return {
      kind: 'OUTSIDE_WORKING_HOURS',
      message: 'The booked slot is outside configured working hours. It remains unchanged for review.',
    };
  }
  if (warehouse.blocks.some((block) => blockApplies(block, appointment))) {
    return {
      kind: 'WAREHOUSE_BLOCKED',
      message: 'A configured block conflicts with this booking. No move, cancellation or override occurred.',
    };
  }
  const configuredCapacity = warehouse.capacityPools.reduce(
    (sum, pool) => sum + Math.max(0, pool.concurrentVehicles),
    0,
  );
  const simultaneous = appointments.filter((candidate) =>
    candidate.warehouseId === appointment.warehouseId
    && candidate.plannedDate === appointment.plannedDate
    && candidate.plannedTime === appointment.plannedTime).length;
  if (configuredCapacity <= 0 || simultaneous > configuredCapacity) {
    return {
      kind: 'CAPACITY_EXCEEDED',
      message: 'Configured capacity is exceeded. The selected slot is preserved and requires Administrator review.',
    };
  }
  return null;
}

export function aggregatePlanningLines(lines: readonly PlanningSkuLine[]): PlanningCardTotals | null {
  if (lines.length === 0) return null;
  return lines.reduce<PlanningCardTotals>((totals, line) => ({
    skuCount: totals.skuCount + 1,
    units: totals.units + line.units,
    pallets: totals.pallets + line.pallets,
  }), { skuCount: 0, units: 0, pallets: 0 });
}

export function buildPlanningCalendar(
  appointments: readonly PlanningAppointment[],
  warehouses: readonly WarehouseConfiguration[],
): readonly PlanningCalendarCard[] {
  return appointments
    .slice()
    .sort((left, right) =>
      left.plannedDate.localeCompare(right.plannedDate)
      || left.plannedTime.localeCompare(right.plannedTime)
      || left.id.localeCompare(right.id))
    .map((appointment) => ({
      appointment,
      totals: aggregatePlanningLines(appointment.skuLines),
      conflict: configurationConflict(
        appointment,
        warehouses.find((warehouse) => warehouse.id === appointment.warehouseId),
        appointments,
      ),
    }));
}

export const planningAppointments: readonly PlanningAppointment[] = [
  {
    id: 'planning-northstar-1001',
    supplierOrganizationId: 'northstar-packaging',
    supplierName: 'Northstar Packaging',
    warehouseId: 'nowy-kisielin-distribution-center',
    purchaseOrderNumber: 'PO-DEMO-1001',
    deliveryPartKey: '1',
    plannedDate: '2026-08-10',
    plannedTime: '08:00',
    bookingOrigin: 'SUPPLIER_RESERVED',
    planningState: 'AWAITING_DETAILS',
    appointmentStatus: 'SUBMITTED',
    tractorRegistration: 'TR-100',
    trailerOrContainerRegistration: 'TRL-200',
    skuLines: [],
  },
  {
    id: 'planning-baltic-2001',
    supplierOrganizationId: 'baltic-freight',
    supplierName: 'Baltic Freight',
    warehouseId: 'zielona-gora-plant',
    purchaseOrderNumber: 'PO-DEMO-2001',
    deliveryPartKey: '1',
    plannedDate: '2026-08-11',
    plannedTime: '10:00',
    bookingOrigin: 'ADMIN_ADDED',
    planningState: 'READY',
    appointmentStatus: 'CONFIRMED',
    tractorRegistration: 'TR-210',
    trailerOrContainerRegistration: 'TRL-220',
    skuLines: [
      {
        id: 'line-1',
        sku: 'SKU-001',
        description: 'Packaging film',
        units: 1200,
        pallets: 2.5,
        loadCarrierType: 'EURO_PALLET',
        goodsCategory: 'DRY_GOODS',
        handling: 'Keep dry',
        sourceRowId: 'row-1',
      },
      {
        id: 'line-2',
        sku: 'SKU-002',
        description: 'Cardboard separators',
        units: 600,
        pallets: 1.25,
        loadCarrierType: 'EURO_PALLET',
        goodsCategory: 'DRY_GOODS',
        handling: 'Do not stack',
        warning: 'Manual handling check',
        internalPlanningNote: 'Internal-only note',
        sourceRowId: 'row-2',
      },
      {
        id: 'line-3',
        sku: 'SKU-003',
        description: 'Protective corners',
        units: 300,
        pallets: 0.5,
        loadCarrierType: 'BOX',
        goodsCategory: 'DRY_GOODS',
        handling: 'Standard',
        sourceRowId: 'row-3',
      },
    ],
    internalPlanningNote: 'Internal import review complete',
    importDiagnostic: 'EXACT_MATCH',
    batchLineage: 'batch-demo-1',
  },
  {
    id: 'planning-vistula-3001',
    supplierOrganizationId: 'vistula-materials',
    supplierName: 'Vistula Materials',
    warehouseId: 'nowy-kisielin-distribution-center',
    purchaseOrderNumber: 'PO-DEMO-3001',
    deliveryPartKey: '1',
    plannedDate: '2026-08-12',
    plannedTime: '13:00',
    bookingOrigin: 'SUPPLIER_RESERVED',
    planningState: 'DETAILS_ATTACHED',
    appointmentStatus: 'SUBMITTED',
    tractorRegistration: 'TR-310',
    trailerOrContainerRegistration: 'CONT-320',
    skuLines: [{
      id: 'line-v-1',
      sku: 'SKU-101',
      description: 'Glass packaging',
      units: 900,
      pallets: 3,
      loadCarrierType: 'EURO_PALLET',
      goodsCategory: 'PACKAGING',
      handling: 'Fragile',
    }],
  },
];
