import { describe, expect, it } from 'vitest';
import { validateSupplierWeeklyBooking, type SupplierWeeklyBookingFixture, type SupplierWeeklyBookingInput } from './supplierWeeklyBooking';

const fixture: SupplierWeeklyBookingFixture = {
  referenceDate: '2026-08-03',
  expectedDeliveryWeek: '2026-W33',
  selectableSlots: [{
    id: 'slot-a',
    warehouseId: 'nowy-kisielin-distribution-center',
    deliveryWeek: '2026-W33',
    startsAt: '2026-08-10T08:00:00+02:00',
    label: 'Monday 08:00',
  }],
  existingReservations: [{
    supplierOrganizationId: 'northstar-packaging',
    warehouseId: 'nowy-kisielin-distribution-center',
    deliveryWeek: '2026-W33',
    purchaseOrderNumber: 'PO-1',
  }],
};

const validInput: SupplierWeeklyBookingInput = {
  supplierOrganizationId: 'northstar-packaging',
  warehouseId: 'nowy-kisielin-distribution-center',
  deliveryWeek: '2026-W33',
  purchaseOrderNumber: ' PO-2 ',
  selectedSlotId: 'slot-a',
  tractorRegistration: ' TR-100 ',
  trailerOrContainerRegistration: ' CT-200 ',
};

describe('restricted Supplier weekly booking', () => {
  it('AC-SUP-007 fails closed for every required field', () => {
    const validation = validateSupplierWeeklyBooking({
      supplierOrganizationId: '',
      warehouseId: '',
      deliveryWeek: ' ',
      purchaseOrderNumber: ' ',
      selectedSlotId: ' ',
      tractorRegistration: ' ',
      trailerOrContainerRegistration: ' ',
    }, fixture);

    expect(validation.valid).toBe(false);
    if (validation.valid) throw new Error('Expected invalid booking.');
    expect(validation.errors.map((error) => error.field)).toEqual([
      'supplierOrganizationId',
      'warehouseId',
      'deliveryWeek',
      'purchaseOrderNumber',
      'selectedSlotId',
      'tractorRegistration',
      'trailerOrContainerRegistration',
    ]);
  });

  it('rejects a non-W+1 or cross-warehouse slot deterministically', () => {
    const validation = validateSupplierWeeklyBooking({
      ...validInput,
      warehouseId: 'zielona-gora-plant',
      deliveryWeek: '2026-W34',
    }, fixture);
    expect(validation.valid).toBe(false);
    if (validation.valid) throw new Error('Expected invalid booking.');
    expect(validation.errors.map((error) => error.field)).toContain('deliveryWeek');
    expect(validation.errors.map((error) => error.field)).toContain('selectedSlotId');
  });

  it('AC-SUP-008 creates only the normalized local demonstrational result', () => {
    const validation = validateSupplierWeeklyBooking(validInput, fixture);
    expect(validation.valid).toBe(true);
    if (!validation.valid) throw new Error('Expected valid booking.');
    expect(validation.result).toMatchObject({
      origin: 'SUPPLIER_RESERVED',
      planningState: 'AWAITING_DETAILS',
      purchaseOrderNumber: 'PO-2',
      tractorRegistration: 'TR-100',
      trailerOrContainerRegistration: 'CT-200',
      deliveryPartKey: '1',
      skuLines: [],
      persistence: 'MEMORY_ONLY',
      externalEffects: [],
    });
  });

  it('warns about duplicates only in the same Supplier, warehouse and week scope', () => {
    const sameScope = validateSupplierWeeklyBooking({ ...validInput, purchaseOrderNumber: ' po-1 ' }, fixture);
    expect(sameScope.valid && sameScope.duplicateWarning).toContain('same local Supplier');

    const otherSupplier = validateSupplierWeeklyBooking({
      ...validInput,
      supplierOrganizationId: 'vistula-materials',
      purchaseOrderNumber: 'PO-1',
    }, fixture);
    expect(otherSupplier.valid && otherSupplier.duplicateWarning).toBeNull();
  });
});
