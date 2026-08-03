import type { PlanningAppointment } from '../calendar/planningCalendar';

export const fridayImportHeaders = [
  'warehouseCode',
  'supplierCode',
  'purchaseOrderNumber',
  'deliveryWeek',
  'deliveryPartKey',
  'sku',
  'description',
  'units',
  'pallets',
  'loadCarrierType',
  'goodsCategory',
  'handling',
  'tractorRegistration',
  'trailerOrContainerRegistration',
] as const;

export type FridayImportHeader = (typeof fridayImportHeaders)[number];
export type FridayImportOutcome =
  | 'EXACT_MATCH'
  | 'NO_MATCH'
  | 'AMBIGUOUS_MATCH'
  | 'INVALID_GROUP'
  | 'DUPLICATE_IMPORT';

export interface FridayImportTarget {
  appointmentId: string;
  warehouseCode: string;
  supplierCode: string;
  purchaseOrderNumber: string;
  deliveryWeek: string;
  deliveryPartKey: string;
  tractorRegistration: string;
  trailerOrContainerRegistration: string;
}

export interface FridayImportLine {
  rowNumber: number;
  sku: string;
  description: string;
  units: number;
  pallets: number;
  loadCarrierType: string;
  goodsCategory: string;
  handling: string;
}

interface FridayImportIdentity {
  warehouseCode: string;
  supplierCode: string;
  purchaseOrderNumber: string;
  deliveryWeek: string;
  deliveryPartKey: string;
}

interface FridayImportTransport {
  tractorRegistration: string;
  trailerOrContainerRegistration: string;
}

export interface FridayImportGroup {
  identity: FridayImportIdentity;
  rowNumbers: readonly number[];
  lines: readonly FridayImportLine[];
  outcome: FridayImportOutcome;
  diagnostics: readonly string[];
  matchedAppointmentIds: readonly string[];
  transportConflicts: readonly {
    field: 'tractorRegistration' | 'trailerOrContainerRegistration';
    existingValue: string;
    importedValue: string;
  }[];
  fingerprint: string;
}

export interface FridayImportPreview {
  fileName: string;
  groups: readonly FridayImportGroup[];
  errors: readonly string[];
  counts: Readonly<Record<FridayImportOutcome, number>>;
}

interface PreviewInput {
  fileName: string;
  size: number;
  text: string;
  targets: readonly FridayImportTarget[];
  previousFingerprints?: readonly string[];
  maxBytes?: number;
  maxRows?: number;
}

const emptyCounts = (): Record<FridayImportOutcome, number> => ({
  EXACT_MATCH: 0,
  NO_MATCH: 0,
  AMBIGUOUS_MATCH: 0,
  INVALID_GROUP: 0,
  DUPLICATE_IMPORT: 0,
});

function parseCsv(text: string): { rows: string[][]; error?: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let justClosedQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          justClosedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (justClosedQuote && character !== ',' && character !== '\n' && character !== '\r') {
      return { rows: [], error: 'Malformed CSV quoting.' };
    }
    if (character === '"') {
      if (field.length > 0 || justClosedQuote) return { rows: [], error: 'Malformed CSV quoting.' };
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
      justClosedQuote = false;
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      justClosedQuote = false;
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (quoted) return { rows: [], error: 'Malformed CSV quoting.' };
  row.push(field);
  if (row.some((value) => value.length > 0) || rows.length === 0) rows.push(row);
  return { rows };
}

function normalizeIdentity(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function groupKey(identity: FridayImportIdentity): string {
  return JSON.stringify([
    identity.warehouseCode,
    identity.supplierCode,
    identity.purchaseOrderNumber,
    identity.deliveryWeek,
    identity.deliveryPartKey,
  ]);
}

function fingerprint(
  identity: FridayImportIdentity,
  transport: FridayImportTransport,
  lines: readonly FridayImportLine[],
): string {
  return JSON.stringify({
    identity,
    transport,
    lines: [...lines]
      .sort((left, right) => left.sku.localeCompare(right.sku)
        || left.description.localeCompare(right.description)
        || left.rowNumber - right.rowNumber)
      .map(({ rowNumber: _rowNumber, ...line }) => line),
  });
}

function isoWeek(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  const day = parsed.getUTCDay() || 7;
  parsed.setUTCDate(parsed.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(parsed.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((parsed.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${parsed.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function createFridayImportTargets(
  appointments: readonly PlanningAppointment[],
): readonly FridayImportTarget[] {
  return appointments.map((appointment) => ({
    appointmentId: appointment.id,
    warehouseCode: normalizeIdentity(appointment.warehouseId),
    supplierCode: normalizeIdentity(appointment.supplierOrganizationId),
    purchaseOrderNumber: normalizeIdentity(appointment.purchaseOrderNumber),
    deliveryWeek: normalizeIdentity(isoWeek(appointment.plannedDate)),
    deliveryPartKey: appointment.deliveryPartKey,
    tractorRegistration: appointment.tractorRegistration,
    trailerOrContainerRegistration: appointment.trailerOrContainerRegistration,
  }));
}

export function buildFridayImportPreview(input: PreviewInput): FridayImportPreview {
  const errors: string[] = [];
  const counts = emptyCounts();
  const maxBytes = input.maxBytes ?? 512 * 1024;
  const maxRows = input.maxRows ?? 5000;

  if (!input.fileName.toLowerCase().endsWith('.csv')) errors.push('Only .csv files are supported.');
  if (input.size > maxBytes) errors.push(`File exceeds the ${maxBytes} byte limit.`);
  if (input.text.trim().length === 0) errors.push('The selected CSV file is empty.');
  if (errors.length > 0) return { fileName: input.fileName, groups: [], errors, counts };

  const parsed = parseCsv(input.text);
  if (parsed.error) return { fileName: input.fileName, groups: [], errors: [parsed.error], counts };
  const [headerRow, ...rawDataRows] = parsed.rows;
  if (!headerRow) return { fileName: input.fileName, groups: [], errors: ['Missing CSV header.'], counts };

  const dataRows = rawDataRows.filter((values) => !(values.length === 1 && values[0].trim() === ''));
  if (dataRows.length === 0) return { fileName: input.fileName, groups: [], errors: ['CSV contains no data rows.'], counts };
  if (dataRows.length > maxRows) return { fileName: input.fileName, groups: [], errors: [`CSV exceeds the ${maxRows} row limit.`], counts };

  const normalizedHeaders = headerRow.map((header) => header.trim());
  const duplicateHeaders = normalizedHeaders.filter((header, index) => normalizedHeaders.indexOf(header) !== index);
  const missingHeaders = fridayImportHeaders.filter((header) => !normalizedHeaders.includes(header));
  const unknownHeaders = normalizedHeaders.filter((header) => !fridayImportHeaders.includes(header as FridayImportHeader));
  if (duplicateHeaders.length > 0) errors.push(`Duplicate headers: ${[...new Set(duplicateHeaders)].join(', ')}.`);
  if (missingHeaders.length > 0) errors.push(`Missing headers: ${missingHeaders.join(', ')}.`);
  if (unknownHeaders.length > 0) errors.push(`Unsupported headers: ${unknownHeaders.join(', ')}.`);

  dataRows.forEach((values, index) => {
    if (values.length !== normalizedHeaders.length) {
      errors.push(`Row ${index + 2} has ${values.length} columns; expected ${normalizedHeaders.length}.`);
    }
  });
  if (errors.length > 0) return { fileName: input.fileName, groups: [], errors, counts };

  const indexes = Object.fromEntries(
    fridayImportHeaders.map((header) => [header, normalizedHeaders.indexOf(header)]),
  ) as Record<FridayImportHeader, number>;
  const grouped = new Map<string, {
    identity: FridayImportIdentity;
    rows: { values: Record<FridayImportHeader, string>; rowNumber: number }[];
  }>();

  dataRows.forEach((values, dataIndex) => {
    const record = Object.fromEntries(fridayImportHeaders.map((header) =>
      [header, values[indexes[header]].trim()])) as Record<FridayImportHeader, string>;
    const identity = {
      warehouseCode: normalizeIdentity(record.warehouseCode),
      supplierCode: normalizeIdentity(record.supplierCode),
      purchaseOrderNumber: normalizeIdentity(record.purchaseOrderNumber),
      deliveryWeek: normalizeIdentity(record.deliveryWeek),
      deliveryPartKey: record.deliveryPartKey.trim(),
    };
    const key = groupKey(identity);
    const group = grouped.get(key) ?? { identity, rows: [] };
    group.rows.push({ values: record, rowNumber: dataIndex + 2 });
    grouped.set(key, group);
  });

  const previousFingerprints = new Set(input.previousFingerprints ?? []);
  const groups = [...grouped.values()].map(({ identity, rows }): FridayImportGroup => {
    const diagnostics: string[] = [];
    const lines: FridayImportLine[] = [];
    const seenLineSignatures = new Set<string>();
    let duplicateLine = false;

    if (Object.values(identity).some((value) => value.length === 0)) diagnostics.push('Every reconciliation identity field is required.');
    if (identity.deliveryPartKey !== '1') diagnostics.push('deliveryPartKey must remain "1".');

    const tractorValues = [...new Set(rows.map(({ values }) => normalizeIdentity(values.tractorRegistration)).filter(Boolean))];
    const trailerValues = [...new Set(rows.map(({ values }) => normalizeIdentity(values.trailerOrContainerRegistration)).filter(Boolean))];
    if (tractorValues.length > 1) diagnostics.push('Rows in one PO group contain inconsistent tractorRegistration values.');
    if (trailerValues.length > 1) diagnostics.push('Rows in one PO group contain inconsistent trailerOrContainerRegistration values.');
    const transport: FridayImportTransport = {
      tractorRegistration: tractorValues[0] ?? '',
      trailerOrContainerRegistration: trailerValues[0] ?? '',
    };

    rows.forEach(({ values, rowNumber }) => {
      const skuFields = [values.sku, values.description, values.units, values.pallets, values.loadCarrierType, values.goodsCategory, values.handling];
      const hasAnySkuValue = skuFields.some((value) => value.length > 0);
      const hasAllSkuValues = skuFields.every((value) => value.length > 0);
      if (!hasAnySkuValue) return;
      if (!hasAllSkuValues) {
        diagnostics.push(`Row ${rowNumber} contains an incomplete SKU line.`);
        return;
      }
      const units = Number(values.units);
      const pallets = Number(values.pallets);
      if (!Number.isFinite(units) || units < 0 || !Number.isFinite(pallets) || pallets < 0) {
        diagnostics.push(`Row ${rowNumber} contains invalid units or pallets.`);
        return;
      }
      const line = {
        rowNumber,
        sku: values.sku,
        description: values.description,
        units,
        pallets,
        loadCarrierType: values.loadCarrierType,
        goodsCategory: values.goodsCategory,
        handling: values.handling,
      };
      const signature = JSON.stringify({ ...line, rowNumber: undefined });
      if (seenLineSignatures.has(signature)) duplicateLine = true;
      seenLineSignatures.add(signature);
      lines.push(line);
    });

    const groupFingerprint = fingerprint(identity, transport, lines);
    const matchingTargets = input.targets.filter((target) =>
      target.warehouseCode === identity.warehouseCode
      && target.supplierCode === identity.supplierCode
      && target.purchaseOrderNumber === identity.purchaseOrderNumber
      && target.deliveryWeek === identity.deliveryWeek
      && target.deliveryPartKey === identity.deliveryPartKey);

    let outcome: FridayImportOutcome;
    if (diagnostics.length > 0) outcome = 'INVALID_GROUP';
    else if (duplicateLine || previousFingerprints.has(groupFingerprint)) outcome = 'DUPLICATE_IMPORT';
    else if (matchingTargets.length === 0) outcome = 'NO_MATCH';
    else if (matchingTargets.length > 1) outcome = 'AMBIGUOUS_MATCH';
    else outcome = 'EXACT_MATCH';

    if (duplicateLine) diagnostics.push('The group repeats an identical SKU row.');
    if (previousFingerprints.has(groupFingerprint)) diagnostics.push('The same normalized import group was previewed previously.');
    if (outcome === 'NO_MATCH') diagnostics.push('No booking matches all five identity fields.');
    if (outcome === 'AMBIGUOUS_MATCH') diagnostics.push('More than one booking matches all five identity fields.');

    const target = matchingTargets.length === 1 ? matchingTargets[0] : undefined;
    const transportConflicts = target ? ([
      ['tractorRegistration', target.tractorRegistration, transport.tractorRegistration],
      ['trailerOrContainerRegistration', target.trailerOrContainerRegistration, transport.trailerOrContainerRegistration],
    ] as const).filter(([, existingValue, importedValue]) =>
      importedValue.length > 0 && normalizeIdentity(importedValue) !== normalizeIdentity(existingValue))
      .map(([field, existingValue, importedValue]) => ({ field, existingValue, importedValue })) : [];
    if (transportConflicts.length > 0) diagnostics.push('Transport differences require explicit reconciliation; no value was overwritten.');

    counts[outcome] += 1;
    return {
      identity,
      rowNumbers: rows.map((row) => row.rowNumber),
      lines,
      outcome,
      diagnostics,
      matchedAppointmentIds: matchingTargets.map((targetItem) => targetItem.appointmentId).sort(),
      transportConflicts,
      fingerprint: groupFingerprint,
    };
  }).sort((left, right) => groupKey(left.identity).localeCompare(groupKey(right.identity)));

  return { fileName: input.fileName, groups, errors, counts };
}
