import { describe, expect, it } from 'vitest';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  applyReportMode,
  buildReportRows,
  canAccessReporting,
  changeReportLevel,
  createInitialReportDefinition,
  defaultPoColumns,
  reportCellValue,
  resolveMonthRange,
  resolveWeekRange,
  sanitizeReportDefinition,
  summarizeByMonth,
  summarizeBySupplier,
  validateReportDefinition,
  type ReportDefinition,
} from './reportingDomain';

const records = createInitialAppointmentWorkspaceState().records;

function weeklyDefinition(): ReportDefinition {
  return createInitialReportDefinition('2026-08-12');
}

describe('reporting domain', () => {
  it('authorizes only approved internal roles', () => {
    expect(canAccessReporting(getDemoActor('system-administrator').role)).toBe(true);
    expect(canAccessReporting(getDemoActor('warehouse-administrator').role)).toBe(true);
    expect(canAccessReporting(getDemoActor('warehouse-operator').role)).toBe(true);
    expect(canAccessReporting(getDemoActor('security-officer').role)).toBe(false);
    expect(canAccessReporting(getDemoActor('supplier-user').role)).toBe(false);
  });

  it('resolves deterministic inclusive Monday-Sunday and calendar-month ranges', () => {
    expect(resolveWeekRange('2026-08-12')).toEqual({
      dateFrom: '2026-08-10',
      dateTo: '2026-08-16',
    });
    expect(resolveWeekRange('2026-08-16')).toEqual({
      dateFrom: '2026-08-10',
      dateTo: '2026-08-16',
    });
    expect(resolveMonthRange('2024-02-20')).toEqual({
      dateFrom: '2024-02-01',
      dateTo: '2024-02-29',
    });
    expect(resolveWeekRange('2026-02-30')).toBeNull();
    expect(resolveMonthRange('invalid')).toBeNull();
  });

  it('applies weekly and monthly presets with controlled levels and columns', () => {
    const weekly = weeklyDefinition();
    expect(weekly.mode).toBe('WEEKLY_ALL_DELIVERIES');
    expect(weekly.level).toBe('PO');
    expect(weekly.columns).toEqual(defaultPoColumns);

    const monthly = applyReportMode(weekly, 'MONTHLY_SLIPSHEET', '2026-08-12');
    expect(monthly).toMatchObject({
      mode: 'MONTHLY_SLIPSHEET',
      level: 'SKU',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    });
    expect(monthly.columns).toContain('sku');
    expect(monthly.columns).not.toContain('skuSummary');

    const customPo = changeReportLevel(monthly, 'PO');
    expect(customPo.level).toBe('PO');
    expect(customPo.columns.every((column) => column !== 'sku')).toBe(true);
  });

  it('fails closed for invalid ranges, zero columns and wrong-level columns', () => {
    const reversed = { ...weeklyDefinition(), dateFrom: '2026-08-20', dateTo: '2026-08-10' };
    expect(validateReportDefinition(reversed).valid).toBe(false);
    expect(buildReportRows(records, reversed)).toEqual([]);

    const noColumns = { ...weeklyDefinition(), columns: [] };
    expect(validateReportDefinition(noColumns).errors).toContain('Select at least one report column.');

    const invalidColumn = { ...weeklyDefinition(), columns: ['sku'] as const };
    expect(validateReportDefinition(invalidColumn).valid).toBe(false);
    expect(sanitizeReportDefinition(invalidColumn).columns).toEqual([]);
  });

  it('builds exactly one PO row per appointment and preserves no-SKU state', () => {
    const rows = buildReportRows(records, weeklyDefinition());
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((row) => row.appointmentId)).size).toBe(4);
    const northstar = rows.find((row) => row.appointmentId === 'planning-northstar-1001')!;
    expect(reportCellValue(northstar, 'skuSummary')).toBe('Awaiting SKU details');
    expect(reportCellValue(northstar, 'skuCount')).toBeNull();
    expect(reportCellValue(northstar, 'units')).toBeNull();
    const baltic = rows.find((row) => row.appointmentId === 'planning-baltic-2001')!;
    expect(reportCellValue(baltic, 'skuCount')).toBe(3);
    expect(reportCellValue(baltic, 'units')).toBe(2100);
    expect(reportCellValue(baltic, 'pallets')).toBe(4.25);
  });

  it('builds exactly one SKU row per product line without fabricating no-SKU rows', () => {
    const monthly = applyReportMode(weeklyDefinition(), 'MONTHLY_SLIPSHEET', '2026-08-12');
    const rows = buildReportRows(records, monthly);
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.lineId !== null)).toBe(true);
    expect(rows.some((row) => row.appointmentId === 'planning-northstar-1001')).toBe(false);
    expect(rows.some((row) => row.appointmentId === 'appointment-nonweekly-vistula-001')).toBe(false);
    expect(rows.map((row) => reportCellValue(row, 'sku'))).toEqual([
      'SKU-001',
      'SKU-002',
      'SKU-003',
      'SKU-101',
    ]);
  });

  it('applies all filters with deterministic AND semantics', () => {
    const definition: ReportDefinition = {
      ...weeklyDefinition(),
      filters: {
        warehouseId: 'zielona-gora-plant',
        supplierOrganizationId: 'baltic-freight',
        bookingOrigin: 'ADMIN_ADDED',
        planningState: 'READY',
        appointmentStatus: 'CONFIRMED',
        search: 'TR-210',
      },
    };
    const rows = buildReportRows(records, definition);
    expect(rows.map((row) => row.appointmentId)).toEqual(['planning-baltic-2001']);
  });

  it('searches SKU and description at PO level without exposing hidden diagnostics', () => {
    const skuSearch: ReportDefinition = {
      ...weeklyDefinition(),
      filters: { ...weeklyDefinition().filters, search: 'SKU-002' },
    };
    expect(buildReportRows(records, skuSearch).map((row) => row.appointmentId))
      .toEqual(['planning-baltic-2001']);

    const hiddenSearch: ReportDefinition = {
      ...weeklyDefinition(),
      filters: { ...weeklyDefinition().filters, search: 'EXACT_MATCH' },
    };
    expect(buildReportRows(records, hiddenSearch)).toEqual([]);
  });

  it('sorts strings, numbers and ties deterministically', () => {
    const byUnits = {
      ...changeReportLevel(weeklyDefinition(), 'SKU'),
      sort: { column: 'units' as const, direction: 'DESC' as const },
    };
    expect(buildReportRows(records, byUnits).map((row) => reportCellValue(row, 'units')))
      .toEqual([1200, 900, 600, 300]);

    const bySupplier = {
      ...weeklyDefinition(),
      sort: { column: 'supplier' as const, direction: 'ASC' as const },
    };
    expect(buildReportRows(records, bySupplier).map((row) => row.appointmentId))
      .toEqual([
        'planning-baltic-2001',
        'planning-northstar-1001',
        'appointment-nonweekly-vistula-001',
        'planning-vistula-3001',
      ]);
  });

  it('summarizes distinct appointments and line totals exactly once', () => {
    const poRows = buildReportRows(records, weeklyDefinition());
    const supplier = summarizeBySupplier(poRows);
    expect(supplier.find((row) => row.key === 'baltic-freight')).toEqual({
      key: 'baltic-freight',
      label: 'Baltic Freight',
      appointmentCount: 1,
      units: 2100,
      pallets: 4.25,
    });
    expect(supplier.find((row) => row.key === 'vistula-materials')).toEqual({
      key: 'vistula-materials',
      label: 'Vistula Materials',
      appointmentCount: 2,
      units: 900,
      pallets: 3,
    });
    expect(summarizeByMonth(poRows)).toEqual([{
      key: '2026-08',
      label: '2026-08',
      appointmentCount: 4,
      units: 3000,
      pallets: 7.25,
    }]);

    const skuRows = buildReportRows(records, changeReportLevel(weeklyDefinition(), 'SKU'));
    expect(summarizeByMonth(skuRows)[0]).toMatchObject({
      appointmentCount: 2,
      units: 3000,
      pallets: 7.25,
    });
  });

  it('never exposes hidden planning, import, comment or audit fields as columns', () => {
    const definition = weeklyDefinition();
    const serialized = JSON.stringify(buildReportRows(records, definition));
    expect(serialized).not.toContain('EXACT_MATCH');
    expect(serialized).not.toContain('batch-demo-1');
    expect(serialized).not.toContain('Internal-only note');
    expect(serialized).not.toContain('row-2');
    expect(serialized).not.toContain('comments');
    expect(serialized).not.toContain('changeHistory');
  });
});
