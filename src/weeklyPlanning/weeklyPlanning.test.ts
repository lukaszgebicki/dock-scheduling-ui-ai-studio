import { describe, expect, it } from 'vitest';
import { planningAppointments } from '../calendar/planningCalendar';
import { initialDemoConfiguration } from '../demoDomain/configuration';
import {
  buildFridayImportPreview,
  createFridayImportTargets,
  fridayImportHeaders,
} from '../import/fridayImport';
import {
  attachExactDetails,
  createWeeklyPlanningState,
  resolveAmbiguousTarget,
  scheduleUnreservedDelivery,
} from './weeklyPlanning';

const header = fridayImportHeaders.join(',');
const values = (overrides: Record<string, string> = {}) => {
  const row: Record<string, string> = {
    warehouseCode: 'nowy-kisielin-distribution-center',
    supplierCode: 'northstar-packaging',
    purchaseOrderNumber: 'PO-DEMO-1001',
    deliveryWeek: '2026-W33',
    deliveryPartKey: '1',
    sku: 'SKU-W-1',
    description: 'Weekly detail',
    units: '100',
    pallets: '1',
    loadCarrierType: 'EURO_PALLET',
    goodsCategory: 'DRY_GOODS',
    handling: 'Standard',
    tractorRegistration: 'TR-100',
    trailerOrContainerRegistration: 'TRL-200',
    ...overrides,
  };
  return fridayImportHeaders.map((name) => row[name]).join(',');
};

function groups(rows: readonly string[], targets = createFridayImportTargets(planningAppointments)) {
  return buildFridayImportPreview({
    fileName: 'weekly.csv',
    size: rows.join('\n').length,
    text: [header, ...rows].join('\n'),
    targets,
  }).groups;
}

describe('weekly planning domain', () => {
  it('attaches zero-to-many exact lines while preserving slot, origin, transport and lifecycle status', () => {
    const evidence = groups([
      values(),
      values({ sku: 'SKU-W-2', units: '50', pallets: '0.5' }),
    ]);
    const before = planningAppointments[0];
    const initial = createWeeklyPlanningState(planningAppointments, evidence);
    const result = attachExactDetails(initial, evidence[0].fingerprint, 'warehouse-admin', 'Checked exact evidence', true);

    expect(result.error).toBeNull();
    const updated = result.state.appointments.find((appointment) => appointment.id === before.id)!;
    expect(updated.skuLines).toHaveLength(2);
    expect(updated.plannedDate).toBe(before.plannedDate);
    expect(updated.plannedTime).toBe(before.plannedTime);
    expect(updated.bookingOrigin).toBe(before.bookingOrigin);
    expect(updated.tractorRegistration).toBe(before.tractorRegistration);
    expect(updated.trailerOrContainerRegistration).toBe(before.trailerOrContainerRegistration);
    expect(updated.appointmentStatus).toBe(before.appointmentStatus);
    expect(result.state.history[0].before).toContain('AWAITING_DETAILS');
    expect(result.state.history[0].after).toContain('DETAILS_ATTACHED');
  });

  it('blocks transport conflicts and unauthorized or reasonless actions', () => {
    const evidence = groups([values({ tractorRegistration: 'OTHER-TRACTOR' })]);
    const initial = createWeeklyPlanningState(planningAppointments, evidence);

    expect(initial.queue[0].state).toBe('TRANSPORT_CONFLICT');
    expect(attachExactDetails(initial, evidence[0].fingerprint, 'x', 'Reason', true).error).toContain('not ready');
    expect(attachExactDetails(initial, evidence[0].fingerprint, 'x', 'Reason', false).error).toContain('not authorized');
    expect(attachExactDetails(initial, evidence[0].fingerprint, 'x', '', true).error).toContain('reason');
  });

  it('is idempotent and requires explicit replacement instead of appending quantities', () => {
    const evidence = groups([values()]);
    const initial = createWeeklyPlanningState(planningAppointments, evidence);
    const first = attachExactDetails(initial, evidence[0].fingerprint, 'admin', 'First apply', true);
    const second = attachExactDetails(first.state, evidence[0].fingerprint, 'admin', 'Again', true);

    expect(second.error).toContain('already applied');
    expect(second.state.appointments[0].skuLines).toHaveLength(1);
    const replaced = attachExactDetails(first.state, evidence[0].fingerprint, 'admin', 'Explicit replacement', true, true);
    expect(replaced.error).toBeNull();
    expect(replaced.state.appointments[0].skuLines).toHaveLength(1);
    expect(replaced.state.history.at(-1)?.action).toBe('REPLACE_DETAILS');
  });

  it('keeps no-match evidence unscheduled until compatible-slot authorization succeeds', () => {
    const evidence = groups([values({ purchaseOrderNumber: 'PO-UNMATCHED-55' })]);
    const initial = createWeeklyPlanningState(planningAppointments, evidence);
    expect(initial.queue[0].state).toBe('UNSCHEDULED');

    const blocked = scheduleUnreservedDelivery(
      initial, evidence[0].fingerprint, 'supplier', 'No access', false,
      '2026-08-13', '09:00', initialDemoConfiguration.warehouses,
    );
    expect(blocked.error).toContain('not authorized');
    expect(blocked.state.appointments).toHaveLength(planningAppointments.length);

    const scheduled = scheduleUnreservedDelivery(
      initial, evidence[0].fingerprint, 'warehouse-admin', 'Compatible free slot', true,
      '2026-08-13', '09:00', initialDemoConfiguration.warehouses,
    );
    expect(scheduled.error).toBeNull();
    const created = scheduled.state.appointments.at(-1)!;
    expect(created.bookingOrigin).toBe('ADMIN_ADDED');
    expect(created.deliveryPartKey).toBe('1');
    expect(created.skuLines).toHaveLength(1);
    expect(created.appointmentStatus).toBe('UNSCHEDULED');
  });

  it('fails closed when configuration or capacity evidence is missing', () => {
    const evidence = groups([values({ purchaseOrderNumber: 'PO-UNMATCHED-56' })]);
    const initial = createWeeklyPlanningState(planningAppointments, evidence);
    const result = scheduleUnreservedDelivery(
      initial, evidence[0].fingerprint, 'admin', 'Try schedule', true,
      '2026-08-13', '09:00', [],
    );
    expect(result.error).toContain('configuration is missing');
    expect(result.state).toBe(initial);
  });

  it('requires explicit exact-candidate selection for ambiguous evidence', () => {
    const target = createFridayImportTargets(planningAppointments)[0];
    const evidence = groups([values()], [target, { ...target, appointmentId: 'second-exact-target' }]);
    const duplicateAppointment = { ...planningAppointments[0], id: 'second-exact-target' };
    const initial = createWeeklyPlanningState([...planningAppointments, duplicateAppointment], evidence);

    expect(initial.queue[0].state).toBe('AMBIGUOUS');
    const invalid = resolveAmbiguousTarget(initial, evidence[0].fingerprint, 'not-a-candidate', 'admin', 'Choose target', true);
    expect(invalid.error).toContain('not one of the exact candidates');

    const resolved = resolveAmbiguousTarget(initial, evidence[0].fingerprint, planningAppointments[0].id, 'admin', 'Selected exact target', true);
    expect(resolved.error).toBeNull();
    expect(resolved.state.queue[0].state).toBe('EXACT_READY');
    expect(resolved.state.queue[0].selectedTargetId).toBe(planningAppointments[0].id);
    expect(resolved.state.history[0].action).toBe('RESOLVE_AMBIGUOUS');
  });
});
