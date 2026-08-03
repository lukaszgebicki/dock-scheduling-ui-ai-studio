import { describe, expect, it } from 'vitest';
import { createInitialAppointmentWorkspaceState } from '../appointments/appointmentWorkspace';
import { getDemoActor } from '../demoDomain/demoDomain';
import {
  buildReportRows,
  createInitialReportDefinition,
  type ReportDefinition,
} from './reportingDomain';
import { buildXlsxExport, xlsxExportInternals } from './xlsxExport';

const records = createInitialAppointmentWorkspaceState().records;
const actor = getDemoActor('system-administrator');

function definition(): ReportDefinition {
  return {
    ...createInitialReportDefinition('2026-08-12'),
    columns: ['appointmentReference', 'purchaseOrder', 'supplier', 'units', 'pallets'],
    sort: { column: 'supplier', direction: 'ASC' },
  };
}

describe('XLSX export', () => {
  it('creates a deterministic stored ZIP workbook with Report and Metadata sheets', () => {
    const active = definition();
    const rows = buildReportRows(records, active);
    const first = buildXlsxExport({ definition: active, rows, actor });
    const second = buildXlsxExport({ definition: active, rows, actor });
    expect(Array.from(first)).toEqual(Array.from(second));
    expect(Array.from(first.slice(0, 4))).toEqual([0x50, 0x4B, 0x03, 0x04]);
    expect(Array.from(first.slice(-22, -18))).toEqual([0x50, 0x4B, 0x05, 0x06]);

    const decoded = new TextDecoder().decode(first);
    for (const name of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]) {
      expect(decoded).toContain(name);
    }
    expect(decoded).toContain('sheet name="Report"');
    expect(decoded).toContain('sheet name="Metadata"');
  });

  it('preserves selected headers, sorted active rows and numeric cells', () => {
    const active = definition();
    const rows = buildReportRows(records, active);
    const decoded = new TextDecoder().decode(
      buildXlsxExport({ definition: active, rows, actor }),
    );
    expect(decoded).toContain('Appointment');
    expect(decoded).toContain('Purchase order');
    expect(decoded).toContain('Supplier');
    expect(decoded.indexOf('APT-WPL-002')).toBeLessThan(decoded.indexOf('APT-WPL-001'));
    expect(decoded.indexOf('APT-WPL-001')).toBeLessThan(decoded.indexOf('APT-NW-2026-001'));
    expect(decoded).toContain('<c r="D2"><v>2100</v></c>');
    expect(decoded).toContain('<c r="E2"><v>4.25</v></c>');
  });

  it('preserves report metadata and excludes hidden evidence', () => {
    const active = definition();
    const rows = buildReportRows(records, active);
    const decoded = new TextDecoder().decode(
      buildXlsxExport({ definition: active, rows, actor }),
    );
    expect(decoded).toContain('WEEKLY_ALL_DELIVERIES');
    expect(decoded).toContain('2026-08-10');
    expect(decoded).toContain('2026-08-16');
    expect(decoded).toContain('appointmentReference|purchaseOrder|supplier|units|pallets');
    expect(decoded).toContain('supplier:ASC');
    expect(decoded).toContain('System Administrator');
    expect(decoded).toContain('Generated locally for demonstration');
    expect(decoded).not.toContain('EXACT_MATCH');
    expect(decoded).not.toContain('batch-demo-1');
    expect(decoded).not.toContain('Internal-only note');
    expect(decoded).not.toContain('row-2');
  });

  it('escapes XML and uses a standard CRC32 implementation', () => {
    expect(xlsxExportInternals.xmlEscape('<tag a="1">A&B\'s</tag>'))
      .toBe('&lt;tag a=&quot;1&quot;&gt;A&amp;B&apos;s&lt;/tag&gt;');
    expect(xlsxExportInternals.columnName(0)).toBe('A');
    expect(xlsxExportInternals.columnName(25)).toBe('Z');
    expect(xlsxExportInternals.columnName(26)).toBe('AA');
    expect(xlsxExportInternals.crc32(new TextEncoder().encode('123456789')))
      .toBe(0xCBF43926);
  });
});
