import { describe, expect, it } from 'vitest';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  buildOperatorManualSlotModel,
  canAccessOperatorManualBooking,
  confirmOperatorManualBooking,
  configuredOperatorManualFields,
  deriveOperatorManualDurationMinutes,
  emptyOperatorManualBookingInput,
  operatorManualBookingOptions,
  previewOperatorManualApproval,
  validateOperatorManualScope,
  type OperatorManualBookingInput,
} from './operatorManualBookingDomain';

const actor = getDemoActor('warehouse-operator');
const records = createInitialAppointmentWorkspaceState().records;
const option = operatorManualBookingOptions(actor, initialDemoConfiguration)[0];
const supplier = option.suppliers[0];

function validInput(
  overrides: Partial<OperatorManualBookingInput> = {},
): OperatorManualBookingInput {
  return {
    ...emptyOperatorManualBookingInput,
    warehouseId: option.warehouseId,
    supplierOrganizationId: supplier.supplierOrganizationId,
    flow: supplier.flows[0],
    referenceNumber: 'REF-OPERATOR-001',
    purchaseOrderNumber: 'PO-OPERATOR-001',
    palletCount: '8',
    vehicleType: 'Curtainsider',
    selectedSlotId: '2026-08-17T06:00',
    contactName: 'Operator Contact',
    tractorRegistration: 'TR-OP-100',
    documentName: 'delivery-note.pdf',
    sharedComment: 'Internal preparation note',
    commentVisibility: 'INTERNAL_NOTE',
    consentConfirmed: true,
    ...overrides,
  };
}

describe('Operator manual booking domain', () => {
  it('allows only Warehouse Operator and derives assigned published Supplier scope', () => {
    expect(canAccessOperatorManualBooking(actor, initialDemoConfiguration)).toBe(true);
    expect(canAccessOperatorManualBooking(
      getDemoActor('system-administrator'),
      initialDemoConfiguration,
    )).toBe(false);

    expect(operatorManualBookingOptions(actor, initialDemoConfiguration)).toEqual([
      expect.objectContaining({
        warehouseId: 'zielona-gora-plant',
        warehouseName: 'Zielona Góra Plant',
        timezone: 'Europe/Warsaw',
        suppliers: [
          expect.objectContaining({
            supplierOrganizationId: 'baltic-freight',
            flows: ['Material Delivery', 'Finished Goods Pickup'],
          }),
          expect.objectContaining({
            supplierOrganizationId: 'vistula-materials',
            flows: ['Material Delivery', 'Finished Goods Pickup'],
          }),
        ],
      }),
    ]);

    expect(validateOperatorManualScope(actor, initialDemoConfiguration, validInput({
      supplierOrganizationId: 'northstar-packaging',
    }))).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        'Select an active Supplier assigned to this warehouse.',
      ]),
    });
  });

  it('reuses configured required fields and deterministic duration', () => {
    expect(configuredOperatorManualFields(
      initialDemoConfiguration,
      validInput(),
    )).toEqual(['purchase-order', 'vehicle-registration']);

    expect(deriveOperatorManualDurationMinutes(validInput())).toBe(30);
    expect(deriveOperatorManualDurationMinutes(validInput({
      palletCount: '25',
      vehicleType: 'Container mega',
      isAdr: true,
      isControlledTemperature: true,
    }))).toBe(105);
  });

  it('returns safe shared-capacity slots and approval outcomes', () => {
    const model = buildOperatorManualSlotModel(
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
    expect(JSON.stringify(model)).not.toContain('blockingAppointmentIds');
    expect(JSON.stringify(model)).not.toContain('effectiveLimit');

    expect(previewOperatorManualApproval(
      initialDemoConfiguration,
      validInput({ documentName: '' }),
    )).toMatchObject({ outcome: 'PENDING_APPROVAL' });
    expect(previewOperatorManualApproval(
      initialDemoConfiguration,
      validInput(),
    )).toMatchObject({ outcome: 'CONFIRMED' });
    expect(previewOperatorManualApproval(
      initialDemoConfiguration,
      validInput({ isAdr: true }),
    )).toMatchObject({ outcome: 'PENDING_APPROVAL' });
  });

  it('creates one ADMIN_ADDED safe local record and blocks duplicate confirmation', () => {
    const result = confirmOperatorManualBooking(
      actor,
      initialDemoConfiguration,
      records,
      validInput(),
    );

    expect(result.error).toBeNull();
    expect(result.record).toEqual(expect.objectContaining({
      sourceKind: 'NON_WEEKLY_DEMO',
      bookingOrigin: 'ADMIN_ADDED',
      planningState: 'READY',
      lifecycleStatus: 'CONFIRMED',
      operationalStatus: 'EXPECTED',
      supplierOrganizationId: 'baltic-freight',
      warehouseId: 'zielona-gora-plant',
      createdBy: actor.userId,
      skuLines: [],
      importedTransportDetails: {},
      comments: [expect.objectContaining({
        visibility: 'INTERNAL_NOTE',
        actorId: actor.id,
        userId: actor.userId,
      })],
      statusHistory: [expect.objectContaining({
        from: 'DRAFT',
        to: 'CONFIRMED',
        reason: expect.stringContaining('Operator manual booking · 30 min'),
      })],
    }));

    const duplicate = confirmOperatorManualBooking(
      actor,
      initialDemoConfiguration,
      [...records, result.record!],
      validInput(),
    );
    expect(duplicate).toMatchObject({
      record: null,
      errorCode: 'ALREADY_CONFIRMED',
      error: 'This local Operator booking was already confirmed.',
    });
  });

  it('revalidates final capacity and returns safe alternatives without creating a record', () => {
    const seed = records[0];
    const occupying = Array.from({ length: 4 }, (_, index) => ({
      ...seed,
      id: `operator-final-capacity-${index + 1}`,
      systemReference: `APT-OP-FINAL-${index + 1}`,
      externalReference: `REF-OP-FINAL-${index + 1}`,
      warehouseId: option.warehouseId,
      supplierOrganizationId: supplier.supplierOrganizationId,
      plannedDate: '2026-08-17',
      plannedTime: '06:00',
      lifecycleStatus: 'CONFIRMED' as const,
      operationalStatus: 'EXPECTED' as const,
    }));

    const result = confirmOperatorManualBooking(
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
    expect(JSON.stringify(result)).not.toContain('operator-final-capacity-1');
  });
});
