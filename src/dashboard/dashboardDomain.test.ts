import { describe, expect, it } from 'vitest';
import {
  createInitialAppointmentWorkspaceState,
  type AppointmentWorkspaceRecord,
} from '../appointments/appointmentWorkspace';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  dashboardAnchorDate,
  dashboardAudience,
  dashboardFilterIds,
  deriveDashboardModel,
  filterDashboardRecords,
  isDashboardFilterId,
} from './dashboardDomain';

const records = createInitialAppointmentWorkspaceState().records;

function withOperationalEvidence(): readonly AppointmentWorkspaceRecord[] {
  return records.map((record, index) => {
    if (index === 0) return { ...record, operationalStatus: 'CHECKED_IN' };
    if (index === 1) return { ...record, operationalStatus: 'AT_DOCK', assignedDockId: 'dock-1' };
    if (index === 2) return { ...record, operationalStatus: 'WAITING_FOR_DOCK' };
    return { ...record, operationalStatus: 'NO_SHOW' };
  });
}

describe('dashboard domain', () => {
  it('uses the earliest actor-visible date as deterministic anchor', () => {
    expect(dashboardAnchorDate(records)).toBe('2026-08-10');
    expect(dashboardAnchorDate(records.slice().reverse())).toBe('2026-08-10');
    expect(dashboardAnchorDate([])).toBeNull();
  });

  it('recognizes only typed dashboard filters', () => {
    for (const filter of dashboardFilterIds) expect(isDashboardFilterId(filter)).toBe(true);
    expect(isDashboardFilterId('UNKNOWN')).toBe(false);
    expect(isDashboardFilterId(null)).toBe(false);
  });

  it('maps all six roles to the approved dashboard audiences', () => {
    expect(dashboardAudience(getDemoActor('system-administrator').role)).toBe('INTERNAL_ADMIN');
    expect(dashboardAudience(getDemoActor('warehouse-administrator').role)).toBe('INTERNAL_ADMIN');
    expect(dashboardAudience(getDemoActor('warehouse-operator').role)).toBe('WAREHOUSE_OPERATOR');
    expect(dashboardAudience(getDemoActor('supplier-administrator').role)).toBe('SUPPLIER');
    expect(dashboardAudience(getDemoActor('supplier-user').role)).toBe('SUPPLIER');
    expect(dashboardAudience(getDemoActor('security-officer').role)).toBe('SECURITY');
  });

  it('derives today, next-hour and inclusive active-week records deterministically', () => {
    expect(filterDashboardRecords(records, 'TODAY', '2026-08-10').map((record) => record.id))
      .toEqual(['planning-northstar-1001']);
    expect(filterDashboardRecords(records, 'NEXT_HOUR', '2026-08-10').map((record) => record.id))
      .toEqual(['planning-northstar-1001']);
    expect(filterDashboardRecords(records, 'ACTIVE_WEEK', '2026-08-10')).toHaveLength(4);
  });

  it('derives operational and action filters exactly from visible record evidence', () => {
    const operational = withOperationalEvidence();
    expect(filterDashboardRecords(operational, 'ON_SITE', '2026-08-10').map((record) => record.operationalStatus))
      .toEqual(['CHECKED_IN', 'AT_DOCK', 'WAITING_FOR_DOCK']);
    expect(filterDashboardRecords(operational, 'AT_DOCK', '2026-08-10').map((record) => record.id))
      .toEqual(['planning-baltic-2001']);
    expect(filterDashboardRecords(operational, 'NO_SHOW', '2026-08-10').map((record) => record.id))
      .toEqual(['appointment-nonweekly-vistula-001']);
    expect(filterDashboardRecords(records, 'REQUIRED_ACTION', '2026-08-10').map((record) => record.id))
      .toEqual([
        'planning-northstar-1001',
        'planning-vistula-3001',
        'appointment-nonweekly-vistula-001',
      ]);
  });

  it('keeps every actionable metric count in exact parity with its filter', () => {
    const model = deriveDashboardModel(withOperationalEvidence(), getDemoActor('warehouse-operator'));
    expect(model.anchorDate).toBe('2026-08-10');
    for (const metric of model.metrics) {
      if (metric.filter && metric.value !== null) {
        expect(metric.value).toBe(
          filterDashboardRecords(withOperationalEvidence(), metric.filter, model.anchorDate!).length,
        );
      }
    }
  });

  it('renders Administrator-only evidence gaps as unavailable rather than fabricated zeroes', () => {
    const model = deriveDashboardModel(records, getDemoActor('warehouse-administrator'));
    for (const id of [
      'slot-utilization',
      'dock-utilization',
      'manual-overrides',
      'average-service-time',
      'average-waiting-time',
    ]) {
      const metric = model.metrics.find((candidate) => candidate.id === id)!;
      expect(metric.value).toBeNull();
      expect(metric.unavailableReason).toMatch(/^Unavailable:/);
      expect(metric.filter).toBeUndefined();
    }
  });

  it('derives Supplier metrics only from supplied organization-scoped records', () => {
    const actor = getDemoActor('supplier-user');
    const supplierRecords = records.filter((record) =>
      record.supplierOrganizationId === actor.supplierOrganizationId);
    const model = deriveDashboardModel(supplierRecords, actor);
    expect(model.audience).toBe('SUPPLIER');
    expect(model.agenda).toHaveLength(2);
    expect(model.agenda.every((record) => record.supplierName === 'Vistula Materials')).toBe(true);
    expect(model.nextAppointment?.id).toBe('planning-vistula-3001');
    expect(model.metrics.find((metric) => metric.id === 'upcoming')?.value).toBe(2);
    expect(JSON.stringify(model.metrics)).not.toContain('Baltic Freight');
  });

  it('creates Security and Operator models without Administrator-only metrics', () => {
    const security = deriveDashboardModel(records, getDemoActor('security-officer'));
    const operator = deriveDashboardModel(records, getDemoActor('warehouse-operator'));
    expect(security.responsiveHeading).toBe('Gate-responsive cards');
    expect(operator.responsiveHeading).toBe('Responsive day agenda');
    expect(security.metrics.some((metric) => metric.id === 'slot-utilization')).toBe(false);
    expect(operator.metrics.some((metric) => metric.id === 'average-service-time')).toBe(false);
  });

  it('returns no metrics or KPI claims for an empty actor scope', () => {
    const model = deriveDashboardModel([], getDemoActor('supplier-user'));
    expect(model.anchorDate).toBeNull();
    expect(model.metrics).toEqual([]);
    expect(model.agenda).toEqual([]);
    expect(model.nextAppointment).toBeNull();
  });
});
