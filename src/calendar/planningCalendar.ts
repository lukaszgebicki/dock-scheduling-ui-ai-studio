import type {
  DeliveryFlow,
  DockId,
  WarehouseConfiguration,
} from '../demoDomain/configuration';
import type { SupplierOrganizationId, WarehouseId } from '../demoDomain/demoDomain';
import {
  evaluateCapacitySlot,
  type CapacityReasonCode,
} from '../capacity/capacityDomain';

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
  durationMinutes?: number;
  flow?: DeliveryFlow;
  assignedDockId?: DockId | null;
  operationalStatus?: string;
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
    | 'WAREHOUSE_CONFIGURATION_AMBIGUOUS'
    | 'WAREHOUSE_NOT_PUBLISHED'
    | 'INVALID_SLOT'
    | 'NO_ACTIVE_DOCK'
    | 'OUTSIDE_WORKING_HOURS'
    | 'WAREHOUSE_BLOCKED'
    | 'CAPACITY_CONFIGURATION_MISSING'
    | 'CAPACITY_EXCEEDED';
  message: string;
}

export interface PlanningCalendarCard {
  appointment: PlanningAppointment;
  totals: PlanningCardTotals | null;
  conflict: CalendarConflict | null;
}

function calendarConflict(
  appointment: PlanningAppointment,
  warehouses: readonly WarehouseConfiguration[],
  appointments: readonly PlanningAppointment[],
): CalendarConflict | null {
  const result = evaluateCapacitySlot(warehouses, appointments, {
    warehouseId: appointment.warehouseId,
    date: appointment.plannedDate,
    time: appointment.plannedTime,
    durationMinutes: appointment.durationMinutes ?? 15,
    flow: appointment.flow ?? 'Material Delivery',
    dockId: appointment.assignedDockId ?? undefined,
    excludeAppointmentId: appointment.id,
  });
  if (result.available) return null;

  const kindByReason: Readonly<Record<
    Exclude<CapacityReasonCode, 'AVAILABLE'>,
    CalendarConflict['kind']
  >> = {
    WAREHOUSE_CONFIGURATION_MISSING: 'WAREHOUSE_CONFIGURATION_MISSING',
    WAREHOUSE_CONFIGURATION_AMBIGUOUS: 'WAREHOUSE_CONFIGURATION_AMBIGUOUS',
    WAREHOUSE_NOT_PUBLISHED: 'WAREHOUSE_NOT_PUBLISHED',
    INVALID_SLOT: 'INVALID_SLOT',
    OUTSIDE_WORKING_HOURS: 'OUTSIDE_WORKING_HOURS',
    NO_ACTIVE_COMPATIBLE_DOCK: 'NO_ACTIVE_DOCK',
    WAREHOUSE_BLOCKED: 'WAREHOUSE_BLOCKED',
    CAPACITY_POOL_MISSING: 'CAPACITY_CONFIGURATION_MISSING',
    CAPACITY_POOL_BLOCKED: 'WAREHOUSE_BLOCKED',
    CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  };

  const messages: Readonly<Record<CalendarConflict['kind'], string>> = {
    WAREHOUSE_CONFIGURATION_MISSING:
      'Calendar configuration is missing. Keep the booked slot and contact an Administrator.',
    WAREHOUSE_CONFIGURATION_AMBIGUOUS:
      'More than one warehouse configuration matches this booking. The slot remains unchanged until configuration is corrected.',
    WAREHOUSE_NOT_PUBLISHED:
      'Warehouse configuration is not published. The booked slot was not changed.',
    INVALID_SLOT:
      'The booked date, time or duration is invalid. The slot remains unchanged for review.',
    NO_ACTIVE_DOCK:
      'No active dock compatible with this flow is configured. The booked slot is preserved and cannot be treated as operationally ready.',
    OUTSIDE_WORKING_HOURS:
      'The booked duration is outside configured working hours. It remains unchanged for review.',
    WAREHOUSE_BLOCKED:
      'A configured block conflicts with this booking. No move, cancellation or override occurred.',
    CAPACITY_CONFIGURATION_MISSING:
      'Compatible capacity configuration is missing. The booked slot remains unchanged for Administrator review.',
    CAPACITY_EXCEEDED:
      'Configured capacity is exceeded for at least one occupied 15-minute unit. The selected slot is preserved and requires Administrator review.',
  };
  const kind = kindByReason[result.reasonCode as Exclude<CapacityReasonCode, 'AVAILABLE'>];
  return { kind, message: messages[kind] };
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
      conflict: calendarConflict(appointment, warehouses, appointments),
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
    durationMinutes: 30,
    flow: 'Material Delivery',
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
    durationMinutes: 45,
    flow: 'Material Delivery',
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
    durationMinutes: 30,
    flow: 'Material Delivery',
  },
];
