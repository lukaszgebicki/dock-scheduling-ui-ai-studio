import { describe, expect, it } from 'vitest';
import {
  createBlockId,
  initialDemoConfiguration,
} from '../demoDomain/configuration';
import {
  aggregatePlanningLines,
  buildPlanningCalendar,
  planningAppointments,
} from './planningCalendar';

describe('PO planning calendar domain', () => {
  it('AC-CAL-002 creates one card per appointment and aggregates every SKU line exactly once', () => {
    const cards = buildPlanningCalendar(
      planningAppointments,
      initialDemoConfiguration.warehouses,
    );

    expect(cards).toHaveLength(planningAppointments.length);
    expect(new Set(cards.map((card) => card.appointment.id)).size).toBe(cards.length);

    const enriched = cards.find((card) => card.appointment.id === 'planning-baltic-2001');
    expect(enriched?.totals).toEqual({
      skuCount: 3,
      units: 2100,
      pallets: 4.25,
    });
  });

  it('AC-CAL-004 returns no aggregate for a PO without SKU lines', () => {
    expect(aggregatePlanningLines([])).toBeNull();
    const awaiting = buildPlanningCalendar(
      [planningAppointments[0]],
      initialDemoConfiguration.warehouses,
    )[0];
    expect(awaiting.totals).toBeNull();
    expect(awaiting.appointment.planningState).toBe('AWAITING_DETAILS');
  });

  it('fails closed on missing configuration without changing the booked slot', () => {
    const appointment = planningAppointments[0];
    const [card] = buildPlanningCalendar([appointment], []);

    expect(card.conflict?.kind).toBe('WAREHOUSE_CONFIGURATION_MISSING');
    expect(card.appointment.plannedDate).toBe(appointment.plannedDate);
    expect(card.appointment.plannedTime).toBe(appointment.plannedTime);
    expect(card.appointment.appointmentStatus).toBe(appointment.appointmentStatus);
  });

  it('fails closed when more than one warehouse configuration matches', () => {
    const appointment = planningAppointments[0];
    const warehouse = initialDemoConfiguration.warehouses.find(
      (candidate) => candidate.id === appointment.warehouseId,
    );
    if (!warehouse) throw new Error('Expected warehouse fixture.');

    const [card] = buildPlanningCalendar(
      [appointment],
      [warehouse, { ...warehouse }],
    );

    expect(card.conflict?.kind).toBe('WAREHOUSE_CONFIGURATION_AMBIGUOUS');
    expect(card.appointment.plannedTime).toBe(appointment.plannedTime);
  });

  it('fails closed when the warehouse has no active dock', () => {
    const appointment = planningAppointments[0];
    const warehouse = initialDemoConfiguration.warehouses.find(
      (candidate) => candidate.id === appointment.warehouseId,
    );
    if (!warehouse) throw new Error('Expected warehouse fixture.');

    const [card] = buildPlanningCalendar([appointment], [{
      ...warehouse,
      docks: warehouse.docks.map((dock) => ({ ...dock, active: false })),
    }]);

    expect(card.conflict?.kind).toBe('NO_ACTIVE_DOCK');
    expect(card.conflict?.message).toContain('slot is preserved');
  });

  it('preserves a slot when a published warehouse block conflicts', () => {
    const appointment = planningAppointments[0];
    const warehouse = initialDemoConfiguration.warehouses.find(
      (candidate) => candidate.id === appointment.warehouseId,
    );
    if (!warehouse) throw new Error('Expected warehouse fixture.');

    const blockedWarehouse = {
      ...warehouse,
      blocks: [{
        id: createBlockId('calendar-test-block'),
        reasonType: 'Maintenance' as const,
        reason: 'Test maintenance',
        scope: { type: 'warehouse' as const },
        schedule: {
          kind: 'one-time' as const,
          date: appointment.plannedDate,
          allDay: true,
          startsAt: '00:00',
          endsAt: '23:59',
        },
      }],
    };
    const [card] = buildPlanningCalendar([appointment], [blockedWarehouse]);

    expect(card.conflict?.kind).toBe('WAREHOUSE_BLOCKED');
    expect(card.appointment.plannedDate).toBe('2026-08-10');
    expect(card.conflict?.message).toContain('No move, cancellation or override occurred');
  });

  it('detects deterministic capacity overflow and keeps all PO headers', () => {
    const base = planningAppointments[0];
    const second = {
      ...planningAppointments[2],
      id: 'planning-capacity-second',
      warehouseId: base.warehouseId,
      plannedDate: base.plannedDate,
      plannedTime: base.plannedTime,
    };
    const warehouse = initialDemoConfiguration.warehouses.find(
      (candidate) => candidate.id === base.warehouseId,
    );
    if (!warehouse) throw new Error('Expected warehouse fixture.');
    const constrained = {
      ...warehouse,
      capacityPools: warehouse.capacityPools.map((pool, index) => ({
        ...pool,
        concurrentVehicles: index === 0 ? 1 : 0,
      })),
    };

    const cards = buildPlanningCalendar([base, second], [constrained]);
    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.conflict?.kind === 'CAPACITY_EXCEEDED')).toBe(true);
    expect(cards.map((card) => card.appointment.plannedTime)).toEqual(['08:00', '08:00']);
  });
});
