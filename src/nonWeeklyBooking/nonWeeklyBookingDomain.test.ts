import { describe, expect, it } from 'vitest';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  buildNonWeeklySlotModel,
  canAccessNonWeeklyBooking,
  configuredNonWeeklyFields,
  confirmNonWeeklyBooking,
  deriveNonWeeklyDurationMinutes,
  emptyNonWeeklyBookingInput,
  nonWeeklyBookingOptions,
  previewNonWeeklyApproval,
  validateDeliveryData,
  type NonWeeklyBookingInput,
} from './nonWeeklyBookingDomain';

const actor = getDemoActor('supplier-administrator');
const records = createInitialAppointmentWorkspaceState().records;
const option = nonWeeklyBookingOptions(actor, initialDemoConfiguration)[0];

function validInput(overrides: Partial<NonWeeklyBookingInput> = {}): NonWeeklyBookingInput {
  return {
    ...emptyNonWeeklyBookingInput,
    warehouseId: option.warehouseId,
    flow: option.flows[0],
    referenceNumber: 'REF-STANDARD-001',
    purchaseOrderNumber: 'PO-STANDARD-001',
    palletCount: '8',
    vehicleType: 'Curtainsider',
    selectedSlotId: '2026-08-17T06:00',
    contactName: 'Supplier Contact',
    tractorRegistration: 'TR-STD-100',
    consentConfirmed: true,
    ...overrides,
  };
}

describe('non-weekly Supplier booking domain', () => {
  it('allows only active configured Supplier actors and derives scoped warehouse flows', () => {
    expect(canAccessNonWeeklyBooking(actor, initialDemoConfiguration)).toBe(true);
    expect(canAccessNonWeeklyBooking(getDemoActor('system-administrator'), initialDemoConfiguration)).toBe(false);
    expect(nonWeeklyBookingOptions(actor, initialDemoConfiguration)).toEqual([
      expect.objectContaining({
        warehouseId: 'nowy-kisielin-distribution-center',
        warehouseName: 'Nowy Kisielin Distribution Center',
        timezone: 'Europe/Warsaw',
        flows: ['Material Delivery', 'Finished Goods Pickup'],
      }),
    ]);

    const blocked = {
      ...initialDemoConfiguration,
      suppliers: initialDemoConfiguration.suppliers.map((supplier) =>
        supplier.organizationId === actor.supplierOrganizationId
          ? { ...supplier, status: 'blocked' as const }
          : supplier),
    };
    expect(canAccessNonWeeklyBooking(actor, blocked)).toBe(false);
    expect(nonWeeklyBookingOptions(actor, blocked)).toEqual([]);
  });

  it('uses published warehouse required fields and validates positive delivery evidence', () => {
    expect(configuredNonWeeklyFields(initialDemoConfiguration, validInput())).toEqual([
      'purchase-order',
      'vehicle-registration',
    ]);
    expect(validateDeliveryData(initialDemoConfiguration, validInput()).valid).toBe(true);
    expect(validateDeliveryData(initialDemoConfiguration, validInput({
      purchaseOrderNumber: '',
      palletCount: '-1',
      unitCount: '',
      grossWeight: '',
      volume: '',
    })).errors).toEqual(expect.arrayContaining([
      'At least one positive volume measure is required.',
      'Pallet count cannot be negative or invalid.',
      'Purchase order number is required by warehouse configuration.',
    ]));
  });

  it('derives duration in exact 15-minute units before availability', () => {
    expect(deriveNonWeeklyDurationMinutes(validInput())).toBe(30);
    expect(deriveNonWeeklyDurationMinutes(validInput({
      palletCount: '25',
      vehicleType: 'Container mega',
      isAdr: true,
      isControlledTemperature: true,
    }))).toBe(90);
  });

  it('returns Supplier-safe configured slots with nearest and three recommendations', () => {
    const model = buildNonWeeklySlotModel(
      initialDemoConfiguration,
      records,
      validInput(),
    );
    expect(model).toMatchObject({
      timezone: 'Europe/Warsaw',
      durationMinutes: 30,
      nearest: expect.objectContaining({ id: '2026-08-17T06:00', available: true }),
    });
    expect(model.recommendations).toHaveLength(3);
    expect(model.recommendations.map((slot) => slot.id)).toEqual([
      '2026-08-17T06:00',
      '2026-08-17T06:15',
      '2026-08-17T06:30',
    ]);
    expect(JSON.stringify(model.slots)).not.toContain('blockingAppointmentIds');
    expect(JSON.stringify(model.slots)).not.toContain('effectiveLimit');
  });

  it('uses existing approval evaluation for auto and manual outcomes', () => {
    expect(previewNonWeeklyApproval(actor, initialDemoConfiguration, validInput())).toMatchObject({
      outcome: 'CONFIRMED',
    });
    expect(previewNonWeeklyApproval(actor, initialDemoConfiguration, validInput({ isAdr: true }))).toMatchObject({
      outcome: 'PENDING_APPROVAL',
    });
  });

  it('creates one safe local workspace record and blocks duplicate confirmation', () => {
    const result = confirmNonWeeklyBooking(
      actor,
      initialDemoConfiguration,
      records,
      validInput({
        documentName: 'delivery-note.pdf',
        sharedComment: 'Call before arrival',
      }),
    );
    expect(result.error).toBeNull();
    expect(result.record).toEqual(expect.objectContaining({
      sourceKind: 'NON_WEEKLY_DEMO',
      bookingOrigin: 'SUPPLIER_RESERVED',
      planningState: 'READY',
      lifecycleStatus: 'CONFIRMED',
      operationalStatus: 'EXPECTED',
      deliveryType: 'Material Delivery',
      plannedDate: '2026-08-17',
      plannedTime: '06:00',
      supplierOrganizationId: actor.supplierOrganizationId,
      supplierTransportDetails: expect.objectContaining({ tractorRegistration: 'TR-STD-100' }),
      documents: [expect.objectContaining({ name: 'delivery-note.pdf', status: 'AVAILABLE_METADATA' })],
      comments: [expect.objectContaining({ visibility: 'SHARED_COMMENT', text: 'Call before arrival' })],
      statusHistory: [expect.objectContaining({
        from: 'DRAFT',
        to: 'CONFIRMED',
        reason: expect.stringContaining('30 min'),
      })],
    }));

    const duplicate = confirmNonWeeklyBooking(
      actor,
      initialDemoConfiguration,
      [...records, result.record!],
      validInput(),
    );
    expect(duplicate).toMatchObject({
      record: null,
      errorCode: 'ALREADY_CONFIRMED',
      error: 'This local standard booking was already confirmed.',
    });
  });

  it('revalidates final capacity and returns safe deterministic alternatives without creating a record', () => {
    const seed = records[0];
    const occupying = Array.from({ length: 4 }, (_, index) => ({
      ...seed,
      id: `final-capacity-${index + 1}`,
      systemReference: `APT-FINAL-${index + 1}`,
      externalReference: `REF-FINAL-${index + 1}`,
      plannedDate: '2026-08-17',
      plannedTime: '06:00',
      lifecycleStatus: 'CONFIRMED' as const,
      operationalStatus: 'EXPECTED' as const,
    }));
    const result = confirmNonWeeklyBooking(
      actor,
      initialDemoConfiguration,
      [...records, ...occupying],
      validInput(),
    );

    expect(result).toMatchObject({
      record: null,
      errorCode: 'RESERVATION_CONFLICT',
      error: 'The selected slot was reserved before confirmation. Choose a compatible alternative.',
      alternatives: [
        { date: '2026-08-17', time: '06:30' },
        { date: '2026-08-17', time: '06:45' },
        { date: '2026-08-17', time: '07:00' },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('final-capacity-1');
    expect(JSON.stringify(result)).not.toContain(seed.supplierOrganizationId);
  });
});
