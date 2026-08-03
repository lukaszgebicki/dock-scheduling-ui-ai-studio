import { describe, expect, it } from 'vitest';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  canAccessStandingAppointments,
  canManageStandingAppointments,
  createSystemInspectionDefinition,
  firstOccurrenceDate,
  generateStandingPreview,
  previewOccurrenceAction,
  standingScopeChoices,
  transitionStandingSeries,
  validateStandingDefinition,
  type StandingSeriesDefinition,
} from './standingAppointmentDomain';

const records = createInitialAppointmentWorkspaceState().records;
const systemChoices = standingScopeChoices(records, getDemoActor('system-administrator'));

function definition(overrides: Partial<StandingSeriesDefinition> = {}): StandingSeriesDefinition {
  return {
    scopeKey: systemChoices[0].key,
    weekday: 1,
    time: '08:00',
    frequency: 'WEEKLY',
    startDate: '2026-08-10',
    terminationMode: 'COUNT',
    endDate: '',
    occurrenceCount: 4,
    ...overrides,
  };
}

describe('standing appointment domain', () => {
  it('allows only System, Warehouse Administrator and Supplier Administrator routes', () => {
    expect(canAccessStandingAppointments(getDemoActor('system-administrator').role)).toBe(true);
    expect(canAccessStandingAppointments(getDemoActor('warehouse-administrator').role)).toBe(true);
    expect(canAccessStandingAppointments(getDemoActor('supplier-administrator').role)).toBe(true);
    expect(canAccessStandingAppointments(getDemoActor('warehouse-operator').role)).toBe(false);
    expect(canAccessStandingAppointments(getDemoActor('supplier-user').role)).toBe(false);
    expect(canAccessStandingAppointments(getDemoActor('security-officer').role)).toBe(false);
    expect(canManageStandingAppointments(getDemoActor('system-administrator').role)).toBe(false);
    expect(canManageStandingAppointments(getDemoActor('warehouse-administrator').role)).toBe(true);
    expect(canManageStandingAppointments(getDemoActor('supplier-administrator').role)).toBe(true);
  });

  it('derives unique scope choices only from supplied visible records', () => {
    expect(systemChoices.map((choice) => choice.key)).toEqual([
      'baltic-freight:zielona-gora-plant',
      'northstar-logistics:nowy-kisielin-dc',
      'vistula-materials:nowy-kisielin-dc',
    ]);
    const supplierActor = getDemoActor('supplier-administrator');
    const supplierVisible = records.filter((record) =>
      record.supplierOrganizationId === supplierActor.supplierOrganizationId);
    const supplierChoices = standingScopeChoices(supplierVisible, supplierActor);
    expect(supplierChoices).toEqual([expect.objectContaining({
      supplierOrganizationId: 'vistula-materials',
      warehouseId: 'nowy-kisielin-dc',
      supplierName: 'Vistula Materials',
    })]);
    expect(JSON.stringify(supplierChoices)).not.toContain('Baltic Freight');
  });

  it('finds the first selected weekday on or after the start date', () => {
    expect(firstOccurrenceDate('2026-08-10', 1)).toBe('2026-08-10');
    expect(firstOccurrenceDate('2026-08-12', 1)).toBe('2026-08-17');
    expect(firstOccurrenceDate('2026-08-16', 7)).toBe('2026-08-16');
    expect(firstOccurrenceDate('invalid', 1)).toBeNull();
  });

  it('validates scoped eligibility, dates, count, time and termination', () => {
    const eligible = new Set([systemChoices[0].key]);
    expect(validateStandingDefinition(definition(), systemChoices, eligible).valid).toBe(true);
    expect(validateStandingDefinition(definition(), systemChoices, new Set()).errors)
      .toContain('The selected Supplier and warehouse pair is not locally eligible for a standing series.');
    expect(validateStandingDefinition(definition({ occurrenceCount: 27 }), systemChoices, eligible).valid).toBe(false);
    expect(validateStandingDefinition(definition({ time: '25:00' }), systemChoices, eligible).valid).toBe(false);
    expect(validateStandingDefinition(definition({
      terminationMode: 'END_DATE',
      endDate: '2026-08-01',
    }), systemChoices, eligible).errors)
      .toContain('The inclusive end date cannot be before the start date.');
  });

  it('generates weekly count recurrence with deterministic IDs and visible conflict evidence', () => {
    const eligible = new Set([systemChoices[0].key]);
    const result = generateStandingPreview(definition(), systemChoices, eligible, records);
    expect(result.errors).toEqual([]);
    expect(result.preview?.occurrences.map((occurrence) => occurrence.date)).toEqual([
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
      '2026-08-31',
    ]);
    expect(result.preview?.occurrences[0]).toMatchObject({
      index: 1,
      time: '08:00',
      conflictStatus: 'NO_VISIBLE_CONFLICT',
      capacityStatus: 'CAPACITY_NOT_RESERVED',
      approvalStatus: 'STANDARD_APPROVAL_PENDING',
      holdStatus: 'ILLUSTRATIVE_HOLD_NOT_STARTED',
    });
    expect(result.preview?.occurrences[0].id).toContain(systemChoices[0].key);
  });

  it('uses inclusive end dates and biweekly increments', () => {
    const northstar = systemChoices.find((choice) =>
      choice.supplierOrganizationId === 'northstar-logistics')!;
    const eligible = new Set([northstar.key]);
    const result = generateStandingPreview(definition({
      scopeKey: northstar.key,
      frequency: 'BIWEEKLY',
      terminationMode: 'END_DATE',
      endDate: '2026-09-07',
      occurrenceCount: 0,
    }), systemChoices, eligible, records);
    expect(result.preview?.occurrences.map((occurrence) => occurrence.date)).toEqual([
      '2026-08-10',
      '2026-08-24',
      '2026-09-07',
    ]);
    expect(result.preview?.occurrences[0].conflictStatus).toBe('VISIBLE_APPOINTMENT_CONFLICT');
  });

  it('fails closed when an end-date series would exceed the 26-occurrence cap', () => {
    const eligible = new Set([systemChoices[0].key]);
    const result = generateStandingPreview(definition({
      terminationMode: 'END_DATE',
      endDate: '2027-12-31',
      occurrenceCount: 0,
    }), systemChoices, eligible, records);
    expect(result.preview).toBeNull();
    expect(result.errors).toContain('The preview exceeds the maximum of 26 occurrences. Narrow the range.');
  });

  it('changes one occurrence preview independently and can derive a new conflict', () => {
    const northstar = systemChoices.find((choice) =>
      choice.supplierOrganizationId === 'northstar-logistics')!;
    const eligible = new Set([northstar.key]);
    const preview = generateStandingPreview(definition({
      scopeKey: northstar.key,
      occurrenceCount: 2,
    }), systemChoices, eligible, records).preview!;
    const original = preview.occurrences[0];
    const cancelled = previewOccurrenceAction(original, 'CANCEL', records, northstar.warehouseId);
    const moved = previewOccurrenceAction(original, 'RESCHEDULE_NEXT_DAY', records, northstar.warehouseId);
    const edited = previewOccurrenceAction(original, 'EDIT_TIME_PLUS_15', records, northstar.warehouseId);
    expect(cancelled.status).toBe('CANCELLED_PREVIEW');
    expect(moved).toMatchObject({ date: '2026-08-11', time: '08:00', status: 'RESCHEDULED_PREVIEW' });
    expect(edited).toMatchObject({ date: '2026-08-10', time: '08:15', status: 'EDITED_TIME_PREVIEW' });
    expect(preview.occurrences[0]).toEqual(original);
    expect(preview.occurrences[1].status).toBe('ACTIVE_PREVIEW');
  });

  it('supports pause/resume/end with terminal ended state', () => {
    expect(transitionStandingSeries('ACTIVE', 'PAUSE')).toEqual({ state: 'PAUSED', error: null });
    expect(transitionStandingSeries('PAUSED', 'RESUME')).toEqual({ state: 'ACTIVE', error: null });
    expect(transitionStandingSeries('ACTIVE', 'END')).toEqual({ state: 'ENDED', error: null });
    expect(transitionStandingSeries('ENDED', 'RESUME')).toEqual({
      state: 'ENDED',
      error: 'An ended local series preview is terminal.',
    });
  });

  it('builds a deterministic three-occurrence System inspection definition', () => {
    const fixed = createSystemInspectionDefinition(systemChoices, records)!;
    expect(fixed).toMatchObject({
      scopeKey: systemChoices[0].key,
      frequency: 'WEEKLY',
      terminationMode: 'COUNT',
      occurrenceCount: 3,
    });
    const preview = generateStandingPreview(fixed, systemChoices, new Set(), records, false).preview!;
    expect(preview.occurrences).toHaveLength(3);
  });
});
