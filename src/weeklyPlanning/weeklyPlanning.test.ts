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
  resolveTransportConflictKeepingSupplierValues,
  scheduleUnreservedDelivery,
} from './weeklyPlanning';

const header = fridayImportHeaders.join(',');
const values = (overrides: Record<string, string> = {}) => {
  const record: Record<string, string> = {
    warehouseCode: 'nowy-kisielin-distribution-center', supplierCode: 'northstar-packaging',
    purchaseOrderNumber: 'PO-DEMO-1001', deliveryWeek: '2026-W33', deliveryPartKey: '1',
    sku: 'SKU-W-1', description: 'Weekly detail', units: '100', pallets: '1',
    loadCarrierType: 'EURO_PALLET', goodsCategory: 'DRY_GOODS', handling: 'Standard',
    tractorRegistration: 'TR-100', trailerOrContainerRegistration: 'TRL-200', ...overrides,
  };
  return fridayImportHeaders.map((name) => record[name]).join(',');
};

function groups(rows: readonly string[], targets = createFridayImportTargets(planningAppointments)) {
  return buildFridayImportPreview({
    fileName: 'weekly.csv', size: rows.join('\n').length,
    text: [header, ...rows].join('\n'), targets,
  }).groups;
}

describe('weekly planning domain', () => {
  it('attaches zero-to-many exact lines while preserving slot, origin, transport and lifecycle status', () => {
    const evidence = groups([values(), values({ sku: 'SKU-W-2', units: '50', pallets: '0.5' })]);
    const before = planningAppointments[0];
    const result = attachExactDetails(createWeeklyPlanningState(planningAppointments, evidence), evidence[0].fingerprint, 'warehouse-admin', 'Checked exact evidence', true);
    expect(result.error).toBeNull();
    const updated = result.state.appointments.find((appointment) => appointment.id === before.id)!;
    expect(updated.skuLines).toHaveLength(2);
    expect([updated.plannedDate, updated.plannedTime, updated.bookingOrigin, updated.tractorRegistration, updated.trailerOrContainerRegistration, updated.appointmentStatus])
      .toEqual([before.plannedDate, before.plannedTime, before.bookingOrigin, before.tractorRegistration, before.trailerOrContainerRegistration, before.appointmentStatus]);
    expect(result.state.history[0].before).toContain('AWAITING_DETAILS');
    expect(result.state.history[0].after).toContain('DETAILS_ATTACHED');
  });

  it('blocks transport conflicts until an authorized reasoned decision retains Supplier values', () => {
    const evidence = groups([values({ tractorRegistration: 'OTHER-TRACTOR' })]);
    const initial = createWeeklyPlanningState(planningAppointments, evidence);
    expect(initial.queue[0].state).toBe('TRANSPORT_CONFLICT');
    expect(evidence[0].transport.tractorRegistration).toBe('OTHER-TRACTOR');
    expect(attachExactDetails(initial, evidence[0].fingerprint, 'x', 'Reason', true).error).toContain('not ready');
    expect(resolveTransportConflictKeepingSupplierValues(initial, evidence[0].fingerprint, 'x', 'Reason', false).error).toContain('not authorized');
    const resolved = resolveTransportConflictKeepingSupplierValues(initial, evidence[0].fingerprint, 'warehouse-admin', 'Keep Supplier authority', true);
    expect(resolved.error).toBeNull();
    expect(resolved.state.queue[0].state).toBe('EXACT_READY');
    expect(resolved.state.history[0].action).toBe('RESOLVE_TRANSPORT');
    expect(resolved.state.history[0].before).toContain('OTHER-TRACTOR');
    expect(resolved.state.history[0].after).toContain('KEEP_SUPPLIER_VALUES');
    expect(resolved.state.appointments[0].tractorRegistration).toBe('TR-100');
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

  it('keeps no-match evidence unscheduled until compatible-slot authorization succeeds and uses typed transport', () => {
    const evidence = groups([values({ purchaseOrderNumber: 'PO-UNMATCHED-55', tractorRegistration: 'TR-TYPED', trailerOrContainerRegistration: 'TRL-TYPED' })]);
    const initial = createWeeklyPlanningState(planningAppointments, evidence);
    expect(initial.queue[0].state).toBe('UNSCHEDULED');
    expect(scheduleUnreservedDelivery(initial, evidence[0].fingerprint, 'supplier', 'No access', false, '2026-08-13', '09:00', initialDemoConfiguration.warehouses).error)
      .toContain('not authorized');
    const scheduled = scheduleUnreservedDelivery(initial, evidence[0].fingerprint, 'warehouse-admin', 'Compatible free slot', true, '2026-08-13', '09:00', initialDemoConfiguration.warehouses);
    expect(scheduled.error).toBeNull();
    const created = scheduled.state.appointments.at(-1)!;
    expect([created.bookingOrigin, created.deliveryPartKey, created.appointmentStatus, created.tractorRegistration, created.trailerOrContainerRegistration])
      .toEqual(['ADMIN_ADDED', '1', 'UNSCHEDULED', 'TR-TYPED', 'TRL-TYPED']);
    expect(created.skuLines).toHaveLength(1);
    expect(scheduleUnreservedDelivery(scheduled.state, evidence[0].fingerprint, 'warehouse-admin', 'Again', true, '2026-08-13', '09:00', initialDemoConfiguration.warehouses).error)
      .toContain('already scheduled');
  });

  it('fails closed when configuration or capacity evidence is missing', () => {
    const evidence = groups([values({ purchaseOrderNumber: 'PO-UNMATCHED-56' })]);
    const initial = createWeeklyPlanningState(planningAppointments, evidence);
    const result = scheduleUnreservedDelivery(initial, evidence[0].fingerprint, 'admin', 'Try schedule', true, '2026-08-13', '09:00', []);
    expect(result.error).toContain('configuration is missing');
    expect(result.state).toBe(initial);
  });

  it('requires explicit exact-candidate selection and records candidates, target and resulting state', () => {
    const target = createFridayImportTargets(planningAppointments)[0];
    const evidence = groups([values()], [target, { ...target, appointmentId: 'second-exact-target' }]);
    const initial = createWeeklyPlanningState([...planningAppointments, { ...planningAppointments[0], id: 'second-exact-target' }], evidence);
    expect(initial.queue[0].state).toBe('AMBIGUOUS');
    expect(resolveAmbiguousTarget(initial, evidence[0].fingerprint, 'not-a-candidate', 'admin', 'Choose target', true).error).toContain('not one of the exact candidates');
    const resolved = resolveAmbiguousTarget(initial, evidence[0].fingerprint, planningAppointments[0].id, 'admin', 'Selected exact target', true);
    expect(resolved.error).toBeNull();
    expect(resolved.state.queue[0].state).toBe('EXACT_READY');
    expect(resolved.state.queue[0].selectedTargetId).toBe(planningAppointments[0].id);
    expect(resolved.state.history[0].action).toBe('RESOLVE_AMBIGUOUS');
    expect(resolved.state.history[0].before).toContain('candidates');
    expect(resolved.state.history[0].after).toContain('selectedTargetId');
  });
});
