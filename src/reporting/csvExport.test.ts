import { describe, expect, it } from 'vitest';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { getDemoActor } from '../demoDomain/demoDomain';
import { buildCsvExport, csvExportInternals } from './csvExport';
import {
  buildReportRows,
  createInitialReportDefinition,
  type ReportDefinition,
} from './reportingDomain';

const records = createInitialAppointmentWorkspaceState().records;
const actor = getDemoActor('system-administrator');

function definition(): ReportDefinition {
  return {
    ...createInitialReportDefinition('2026-08-12'),
    columns: ['appointmentReference', 'purchaseOrder', 'supplier', 'units'],
    sort: { column: 'supplier', direction: 'ASC' },
  };
}

describe('CSV export', () => {
  it('preserves report metadata, selected column order and active row order', () => {
    const active = definition();
    const rows = buildReportRows(records, active);
    const csv = buildCsvExport({ definition: active, rows, actor });
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Report mode,WEEKLY_ALL_DELIVERIES');
    expect(csv).toContain('Report level,PO');
    expect(csv).toContain('Inclusive date from,2026-08-10');
    expect(csv).toContain('Inclusive date to,2026-08-16');
    expect(csv).toContain('Selected columns,appointmentReference|purchaseOrder|supplier|units');
    expect(csv).toContain('Sort,supplier:ASC');
    expect(csv).toContain('Active role,System Administrator');
    expect(csv).toContain('Generated locally for demonstration');

    const lines = csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n');
    const headerIndex = lines.indexOf('Appointment,Purchase order,Supplier,Units');
    expect(headerIndex).toBeGreaterThan(0);
    expect(lines.slice(headerIndex + 1).map((line) => line.split(',')[0])).toEqual([
      'APT-WPL-002',
      'APT-WPL-001',
      'APT-NW-2026-001',
      'APT-WPL-003',
    ]);
  });

  it('escapes commas, quotes and newlines using CSV rules', () => {
    expect(csvExportInternals.csvCell('simple')).toBe('simple');
    expect(csvExportInternals.csvCell('a,b')).toBe('"a,b"');
    expect(csvExportInternals.csvCell('a"b')).toBe('"a""b"');
    expect(csvExportInternals.csvCell('a\nb')).toBe('"a\nb"');
  });

  it('protects spreadsheet-formula prefixes without altering normal text', () => {
    expect(csvExportInternals.protectSpreadsheetFormula('=1+1')).toBe("'=1+1");
    expect(csvExportInternals.protectSpreadsheetFormula('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(csvExportInternals.protectSpreadsheetFormula('-1')).toBe("'-1");
    expect(csvExportInternals.protectSpreadsheetFormula('@command')).toBe("'@command");
    expect(csvExportInternals.protectSpreadsheetFormula('PO-100')).toBe('PO-100');
  });

  it('exports only active filtered rows', () => {
    const active: ReportDefinition = {
      ...definition(),
      filters: {
        ...definition().filters,
        supplierOrganizationId: 'baltic-freight',
      },
    };
    const rows = buildReportRows(records, active);
    const csv = buildCsvExport({ definition: active, rows, actor });
    expect(csv).toContain('APT-WPL-002');
    expect(csv).not.toContain('APT-WPL-001');
    expect(csv).not.toContain('APT-WPL-003');
    expect(csv).not.toContain('APT-NW-2026-001');
    expect(csv).not.toContain('EXACT_MATCH');
    expect(csv).not.toContain('batch-demo-1');
  });
});
