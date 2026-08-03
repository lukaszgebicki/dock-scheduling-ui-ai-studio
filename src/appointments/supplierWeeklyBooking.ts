import type { SupplierOrganizationId, WarehouseId } from '../demoDomain/demoDomain';
import { validateSupplierTransportDetails } from '../demoDomain/transportRules';

export interface SupplierBookingSlot {
  id: string;
  warehouseId: WarehouseId;
  deliveryWeek: string;
  startsAt: string;
  label: string;
}

export interface SupplierWeeklyBookingInput {
  supplierOrganizationId: SupplierOrganizationId | '';
  warehouseId: WarehouseId | '';
  deliveryWeek: string;
  purchaseOrderNumber: string;
  selectedSlotId: string;
  tractorRegistration: string;
  trailerOrContainerRegistration: string;
}

export interface SupplierWeeklyBookingFixture {
  referenceDate: string;
  expectedDeliveryWeek: string;
  selectableSlots: readonly SupplierBookingSlot[];
  existingReservations: readonly Pick<
    SupplierWeeklyBookingResult,
    'supplierOrganizationId' | 'warehouseId' | 'deliveryWeek' | 'purchaseOrderNumber'
  >[];
}

export type SupplierWeeklyBookingField =
  | 'supplierOrganizationId'
  | 'warehouseId'
  | 'deliveryWeek'
  | 'purchaseOrderNumber'
  | 'selectedSlotId'
  | 'tractorRegistration'
  | 'trailerOrContainerRegistration';

export interface SupplierWeeklyBookingError {
  field: SupplierWeeklyBookingField;
  message: string;
}

export interface SupplierWeeklyBookingResult {
  origin: 'SUPPLIER_RESERVED';
  planningState: 'AWAITING_DETAILS';
  supplierOrganizationId: SupplierOrganizationId;
  warehouseId: WarehouseId;
  deliveryWeek: string;
  purchaseOrderNumber: string;
  selectedSlot: SupplierBookingSlot;
  tractorRegistration: string;
  trailerOrContainerRegistration: string;
  deliveryPartKey: '1';
  skuLines: readonly [];
  persistence: 'MEMORY_ONLY';
  externalEffects: readonly [];
}

export type SupplierWeeklyBookingValidation =
  | { valid: false; errors: readonly SupplierWeeklyBookingError[]; duplicateWarning: null }
  | { valid: true; result: SupplierWeeklyBookingResult; errors: readonly []; duplicateWarning: string | null };

function normalize(value: string): string {
  return value.trim();
}

function normalizeComparable(value: string): string {
  return normalize(value).toLocaleUpperCase('en-US');
}

export function validateSupplierWeeklyBooking(
  input: SupplierWeeklyBookingInput,
  fixture: SupplierWeeklyBookingFixture,
): SupplierWeeklyBookingValidation {
  const errors: SupplierWeeklyBookingError[] = [];
  const purchaseOrderNumber = normalize(input.purchaseOrderNumber);
  const deliveryWeek = normalize(input.deliveryWeek);
  const selectedSlotId = normalize(input.selectedSlotId);

  if (!input.supplierOrganizationId) {
    errors.push({ field: 'supplierOrganizationId', message: 'Supplier scope is required.' });
  }
  if (!input.warehouseId) {
    errors.push({ field: 'warehouseId', message: 'Warehouse is required.' });
  }
  if (!deliveryWeek) {
    errors.push({ field: 'deliveryWeek', message: 'Delivery week is required.' });
  } else if (deliveryWeek !== fixture.expectedDeliveryWeek) {
    errors.push({
      field: 'deliveryWeek',
      message: `Delivery week must be the configured next week (${fixture.expectedDeliveryWeek}) for reference date ${fixture.referenceDate}.`,
    });
  }
  if (!purchaseOrderNumber) {
    errors.push({ field: 'purchaseOrderNumber', message: 'Purchase order number is required.' });
  }
  if (!selectedSlotId) {
    errors.push({ field: 'selectedSlotId', message: 'A next-week slot is required.' });
  }

  const transport = validateSupplierTransportDetails({
    tractorRegistration: input.tractorRegistration,
    trailerOrContainerRegistration: input.trailerOrContainerRegistration,
  });
  for (const field of transport.missingFields) {
    errors.push({
      field,
      message: field === 'tractorRegistration'
        ? 'Tractor registration is required.'
        : 'Trailer or container registration is required.',
    });
  }

  const selectedSlot = fixture.selectableSlots.find((slot) => slot.id === selectedSlotId);
  if (selectedSlotId && !selectedSlot) {
    errors.push({ field: 'selectedSlotId', message: 'The selected slot is not available.' });
  } else if (selectedSlot) {
    if (selectedSlot.deliveryWeek !== fixture.expectedDeliveryWeek) {
      errors.push({ field: 'selectedSlotId', message: 'The selected slot is not in week W+1.' });
    }
    if (input.warehouseId && selectedSlot.warehouseId !== input.warehouseId) {
      errors.push({ field: 'selectedSlotId', message: 'The selected slot is outside the selected warehouse scope.' });
    }
  }

  if (errors.length > 0 || !input.supplierOrganizationId || !input.warehouseId || !selectedSlot) {
    return { valid: false, errors, duplicateWarning: null };
  }

  const duplicate = fixture.existingReservations.some((reservation) =>
    reservation.supplierOrganizationId === input.supplierOrganizationId
    && reservation.warehouseId === input.warehouseId
    && reservation.deliveryWeek === deliveryWeek
    && normalizeComparable(reservation.purchaseOrderNumber) === normalizeComparable(purchaseOrderNumber));

  return {
    valid: true,
    errors: [],
    duplicateWarning: duplicate
      ? 'A reservation with this purchase order already exists in the same local Supplier, warehouse and delivery-week scope.'
      : null,
    result: {
      origin: 'SUPPLIER_RESERVED',
      planningState: 'AWAITING_DETAILS',
      supplierOrganizationId: input.supplierOrganizationId,
      warehouseId: input.warehouseId,
      deliveryWeek,
      purchaseOrderNumber,
      selectedSlot,
      tractorRegistration: transport.normalizedDetails.tractorRegistration,
      trailerOrContainerRegistration: transport.normalizedDetails.trailerOrContainerRegistration,
      deliveryPartKey: '1',
      skuLines: [],
      persistence: 'MEMORY_ONLY',
      externalEffects: [],
    },
  };
}
