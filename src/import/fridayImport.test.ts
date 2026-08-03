import { describe, expect, it } from 'vitest';
import { planningAppointments } from '../calendar/planningCalendar';
import {
  buildFridayImportPreview,
  createFridayImportTargets,
  fridayImportHeaders,
} from './fridayImport';

const header = fridayImportHeaders.join(',');
const targets = createFridayImportTargets(planningAppointments);

function row(overrides: Partial<Record<(typeof fridayImportHeaders)[number], string>> = {}): string {
  const values: Record<(typeof fridayImportHeaders)[number], string> = {
    warehouseCode: 'zielona-gora-plant',
    supplierCode: 'baltic-freight',
    purchaseOrderNumber: 'PO-DEMO-2001',
    deliveryWeek: '2026-W33',
    deliveryPartKey: '1',
    sku: 'SKU-900',
    description: 'Imported product',
    units: '100',
    pallets: '2',
    loadCarrierType: 'EURO_PALLET',
    goodsCategory: 'DRY_GOODS',
    handling: 'Standard',
    tractorRegistration: 'TR-210',
    trailerOrContainerRegistration: 'TRL-220',
    ...overrides,
  };
  return fridayImportHeaders.map((name) => values[name]).join(',');
}

function preview(text: string, options: Partial<Parameters<typeof buildFridayImportPreview>[0]> = {}) {
  return buildFridayImportPreview({
    fileName: 'friday.csv',
    size: text.length,
    text,
    targets,
    ...options,
  });
}

describe('Friday import preview domain', () => {
  it('groups multiple SKU rows under one exact PO identity and preserves source appointments', () => {
    const before = JSON.stringify(planningAppointments);
    const result = preview(`${header}\n${row()}\n${row({ sku: 'SKU-901', units: '50', pallets: '1' })}`);

    expect(result.errors).toEqual([]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].outcome).toBe('EXACT_MATCH');
    expect(result.groups[0].lines).toHaveLength(2);
    expect(result.groups[0].matchedAppointmentIds).toEqual(['planning-baltic-2001']);
    expect(JSON.stringify(planningAppointments)).toBe(before);
  });

  it('supports quoted multiline business content without splitting the PO group', () => {
    const multiline = row({ description: '"Product line 1\nProduct line 2"' });
    const result = preview(`${header}\n${multiline}`);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].outcome).toBe('EXACT_MATCH');
    expect(result.groups[0].lines[0].description).toBe('Product line 1\nProduct line 2');
  });

  it('uses only the normalized five-field identity and never fuzzy-matches labels', () => {
    const result = preview(`${header}\n${row({ supplierCode: 'Baltic Freight' })}`);
    expect(result.groups[0].outcome).toBe('NO_MATCH');
    expect(result.groups[0].matchedAppointmentIds).toEqual([]);
  });

  it('fails closed for malformed, missing, duplicate and unsupported headers', () => {
    expect(preview(`${header}\n"unterminated`).errors).toContain('Malformed CSV quoting.');

    const missing = fridayImportHeaders.filter((name) => name !== 'deliveryWeek').join(',');
    expect(preview(`${missing}\n`).errors[0]).toContain('Missing headers: deliveryWeek');

    const duplicate = `${header},warehouseCode`;
    expect(preview(`${duplicate}\n`).errors.some((error) => error.includes('Duplicate headers'))).toBe(true);

    expect(preview(`${header},secretColumn\n`).errors.some((error) => error.includes('Unsupported headers'))).toBe(true);
  });

  it('rejects empty, unsupported and over-limit files before parsing rows', () => {
    expect(buildFridayImportPreview({ fileName: 'friday.txt', size: 1, text: 'x', targets }).errors)
      .toContain('Only .csv files are supported.');
    expect(buildFridayImportPreview({ fileName: 'friday.csv', size: 0, text: '', targets }).errors)
      .toContain('The selected CSV file is empty.');
    expect(buildFridayImportPreview({ fileName: 'friday.csv', size: 11, text: header, targets, maxBytes: 10 }).errors[0])
      .toContain('File exceeds');
  });

  it('classifies invalid groups and fixed delivery part violations deterministically', () => {
    const result = preview(`${header}\n${row({ purchaseOrderNumber: '', deliveryPartKey: '2' })}`);
    expect(result.groups[0].outcome).toBe('INVALID_GROUP');
    expect(result.groups[0].diagnostics).toContain('Every reconciliation identity field is required.');
    expect(result.groups[0].diagnostics).toContain('deliveryPartKey must remain "1".');
  });

  it('classifies duplicate rows and known fingerprints without summing them', () => {
    const duplicated = preview(`${header}\n${row()}\n${row()}`);
    expect(duplicated.groups[0].outcome).toBe('DUPLICATE_IMPORT');
    expect(duplicated.groups[0].diagnostics).toContain('The group repeats an identical SKU row.');

    const first = preview(`${header}\n${row()}`);
    const repeated = preview(`${header}\n${row()}`, {
      previousFingerprints: [first.groups[0].fingerprint],
    });
    expect(repeated.groups[0].outcome).toBe('DUPLICATE_IMPORT');
  });

  it('classifies ambiguous exact identity when more than one target exists', () => {
    const duplicateTarget = { ...targets[1], appointmentId: 'duplicate-target' };
    const result = preview(`${header}\n${row()}`, { targets: [...targets, duplicateTarget] });

    expect(result.groups[0].outcome).toBe('AMBIGUOUS_MATCH');
    expect(result.groups[0].matchedAppointmentIds).toEqual(['duplicate-target', 'planning-baltic-2001']);
  });

  it('keeps no-match groups as preview evidence only', () => {
    const result = preview(`${header}\n${row({ purchaseOrderNumber: 'PO-NOT-BOOKED' })}`);
    expect(result.groups[0].outcome).toBe('NO_MATCH');
    expect(result.groups[0].diagnostics).toContain('No booking matches all five identity fields.');
  });

  it('reports transport differences without overwriting booking registrations', () => {
    const before = planningAppointments[1];
    const result = preview(`${header}\n${row({
      tractorRegistration: 'NEW-TRACTOR',
      trailerOrContainerRegistration: 'NEW-TRAILER',
    })}`);

    expect(result.groups[0].outcome).toBe('EXACT_MATCH');
    expect(result.groups[0].transportConflicts).toEqual([
      { field: 'tractorRegistration', existingValue: 'TR-210', importedValue: 'NEW-TRACTOR' },
      { field: 'trailerOrContainerRegistration', existingValue: 'TRL-220', importedValue: 'NEW-TRAILER' },
    ]);
    expect(planningAppointments[1]).toBe(before);
  });
});
