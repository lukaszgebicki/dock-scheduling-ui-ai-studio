import { describe, expect, it } from 'vitest';
import {
  initialDemoConfiguration,
  type WarehouseConfiguration,
} from '../demoDomain/configuration';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  applyCapacityOverride,
  evaluateCapacitySlot,
  occupiedCapacityUnits,
  simulateFinalCapacityCompetition,
  toSafeCapacityResult,
  type CapacityAppointment,
  type CapacitySlotRequest,
} from './capacityDomain';

const warehouse = initialDemoConfiguration.warehouses[0];

function constrainedWarehouse(limit = 1): WarehouseConfiguration {
  return {
    ...warehouse,
    capacityPools: warehouse.capacityPools.map((pool) => ({
      ...pool,
      concurrentVehicles: limit,
    })),
  };
}

function request(overrides: Partial<CapacitySlotRequest> = {}): CapacitySlotRequest {
  return {
    warehouseId: warehouse.id,
    date: '2026-08-10',
    time: '08:00',
    durationMinutes: 30,
    flow: 'Material Delivery',
    ...overrides,
  };
}

function appointment(overrides: Partial<CapacityAppointment> = {}): CapacityAppointment {
  return {
    id: 'capacity-existing-1',
    warehouseId: warehouse.id,
    plannedDate: '2026-08-10',
    plannedTime: '08:00',
    durationMinutes: 30,
    appointmentStatus: 'CONFIRMED',
    operationalStatus: 'EXPECTED',
    ...overrides,
  };
}

describe('composite capacity domain', () => {
  it('occupies every intersecting 15-minute unit', () => {
    expect(occupiedCapacityUnits('2026-08-10', '08:07', 15)).toEqual([
      '2026-08-10T08:00',
      '2026-08-10T08:15',
    ]);
    expect(occupiedCapacityUnits('2026-08-10', '08:00', 30)).toEqual([
      '2026-08-10T08:00',
      '2026-08-10T08:15',
    ]);
  });

  it('blocks an overlapping request at the first active capacity limit', () => {
    const result = evaluateCapacitySlot(
      [constrainedWarehouse()],
      [appointment()],
      request({ time: '08:15', durationMinutes: 15 }),
    );

    expect(result).toMatchObject({
      available: false,
      reasonCode: 'CAPACITY_EXCEEDED',
    });
    expect(result.internalEvidence).toEqual(expect.objectContaining({
      unitStarts: ['2026-08-10T08:15'],
      effectiveLimit: 1,
      maximumExistingOccupancy: 1,
      blockingAppointmentIds: ['capacity-existing-1'],
    }));
  });

  it('fails closed in stable configuration order', () => {
    expect(evaluateCapacitySlot([], [], request()).reasonCode)
      .toBe('WAREHOUSE_CONFIGURATION_MISSING');
    expect(evaluateCapacitySlot([
      constrainedWarehouse(),
      constrainedWarehouse(),
    ], [], request()).reasonCode).toBe('WAREHOUSE_CONFIGURATION_AMBIGUOUS');
    expect(evaluateCapacitySlot([{
      ...constrainedWarehouse(),
      status: 'draft',
      docks: warehouse.docks.map((dock) => ({ ...dock, active: false })),
    }], [], request()).reasonCode).toBe('WAREHOUSE_NOT_PUBLISHED');
  });

  it('releases capacity for cancelled and completed records', () => {
    for (const released of [
      appointment({ appointmentStatus: 'CANCELLED' }),
      appointment({ operationalStatus: 'COMPLETED' }),
      appointment({ operationalStatus: 'CHECKED_OUT' }),
    ]) {
      expect(evaluateCapacitySlot(
        [constrainedWarehouse()],
        [released],
        request(),
      ).available).toBe(true);
    }
  });

  it('projects a Supplier-safe result without internal totals or competing identity', () => {
    const internal = evaluateCapacitySlot(
      [constrainedWarehouse()],
      [appointment()],
      request(),
    );
    const safe = toSafeCapacityResult(internal);

    expect(safe).toEqual({
      available: false,
      reasonCode: 'CAPACITY_EXCEEDED',
      message: 'The requested capacity is no longer available.',
    });
    expect(JSON.stringify(safe)).not.toContain('capacity-existing-1');
    expect(JSON.stringify(safe)).not.toContain('effectiveLimit');
  });

  it('allows only scoped Administrators to apply a reasoned local override', () => {
    const blocked = evaluateCapacitySlot(
      [constrainedWarehouse()],
      [appointment()],
      request(),
    );

    const unauthorized = applyCapacityOverride(
      getDemoActor('supplier-administrator'),
      constrainedWarehouse(),
      blocked,
      'Supplier request',
    );
    expect(unauthorized.error).toContain('cannot override');
    expect(unauthorized.evidence).toBeNull();

    const missingReason = applyCapacityOverride(
      getDemoActor('warehouse-administrator'),
      constrainedWarehouse(),
      blocked,
      '   ',
    );
    expect(missingReason.error).toBe('A capacity override requires a reason.');

    const authorized = applyCapacityOverride(
      getDemoActor('warehouse-administrator'),
      constrainedWarehouse(),
      blocked,
      'Approved recovery capacity',
    );
    expect(authorized.error).toBeNull();
    expect(authorized.result.available).toBe(true);
    expect(authorized.evidence).toEqual(expect.objectContaining({
      actorId: 'warehouse-administrator',
      warehouseId: warehouse.id,
      reason: 'Approved recovery capacity',
      before: expect.objectContaining({ reasonCode: 'CAPACITY_EXCEEDED' }),
      after: expect.objectContaining({ available: true }),
    }));
  });

  it('AC-CONC-001 gives the final unit to one ordered attempt and safe alternatives to the loser', () => {
    const competition = simulateFinalCapacityCompetition(
      [constrainedWarehouse()],
      [],
      request(),
      [
        { id: 'attempt-a', supplierOrganizationId: 'northstar-packaging' },
        { id: 'attempt-b', supplierOrganizationId: 'vistula-materials' },
      ],
    );

    expect(competition.error).toBeNull();
    expect(competition.results).toEqual([
      expect.objectContaining({
        attemptId: 'attempt-a',
        outcome: 'RESERVED',
        alternatives: [],
      }),
      expect.objectContaining({
        attemptId: 'attempt-b',
        outcome: 'RESERVATION_CONFLICT',
        alternatives: [
          { date: '2026-08-10', time: '08:30' },
          { date: '2026-08-10', time: '08:45' },
          { date: '2026-08-10', time: '09:00' },
        ],
      }),
    ]);
    expect(JSON.stringify(competition.results[1])).not.toContain('attempt-a');
    expect(JSON.stringify(competition.results[1])).not.toContain('northstar-packaging');
  });
});
