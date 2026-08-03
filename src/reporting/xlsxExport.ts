import type { DemoActor } from '../demoDomain/demoDomain';
import {
  reportCellValue,
  reportColumnLabels,
  reportMetadata,
  type ReportCellValue,
  type ReportDefinition,
  type ReportRow,
} from './reportingDomain';

interface ZipFile {
  name: string;
  data: Uint8Array;
}

const encoder = new TextEncoder();

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function columnName(index: number): string {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function cellXml(value: ReportCellValue, columnIndex: number, rowIndex: number): string {
  const reference = `${columnName(columnIndex)}${rowIndex}`;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  const text = value === null ? '' : String(value);
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function worksheetXml(rows: readonly (readonly ReportCellValue[])[]): string {
  const body = rows.map((row, rowOffset) => {
    const rowIndex = rowOffset + 1;
    const cells = row.map((value, columnIndex) =>
      cellXml(value, columnIndex, rowIndex)).join('');
    return `<row r="${rowIndex}">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function reportRows(
  definition: ReportDefinition,
  rows: readonly ReportRow[],
): readonly (readonly ReportCellValue[])[] {
  return [
    definition.columns.map((column) => reportColumnLabels[column]),
    ...rows.map((row) => definition.columns.map((column) =>
      reportCellValue(row, column))),
  ];
}

function metadataRows(
  definition: ReportDefinition,
  actor: Pick<DemoActor, 'role' | 'userId'>,
): readonly (readonly ReportCellValue[])[] {
  return [
    ['Metadata key', 'Metadata value'],
    ...reportMetadata(definition, actor),
  ];
}

function createCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0
        ? 0xEDB88320 ^ (value >>> 1)
        : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pushU16(target: number[], value: number): void {
  target.push(value & 0xFF, (value >>> 8) & 0xFF);
}

function pushU32(target: number[], value: number): void {
  target.push(
    value & 0xFF,
    (value >>> 8) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 24) & 0xFF,
  );
}

function append(target: number[], value: Uint8Array): void {
  for (const byte of value) target.push(byte);
}

function buildStoredZip(files: readonly ZipFile[]): Uint8Array {
  const output: number[] = [];
  const centralEntries: number[][] = [];

  for (const file of files) {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.data);
    const localOffset = output.length;

    pushU32(output, 0x04034B50);
    pushU16(output, 20);
    pushU16(output, 0x0800);
    pushU16(output, 0);
    pushU16(output, 0);
    pushU16(output, 0);
    pushU32(output, checksum);
    pushU32(output, file.data.length);
    pushU32(output, file.data.length);
    pushU16(output, name.length);
    pushU16(output, 0);
    append(output, name);
    append(output, file.data);

    const central: number[] = [];
    pushU32(central, 0x02014B50);
    pushU16(central, 20);
    pushU16(central, 20);
    pushU16(central, 0x0800);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, checksum);
    pushU32(central, file.data.length);
    pushU32(central, file.data.length);
    pushU16(central, name.length);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, 0);
    pushU32(central, localOffset);
    append(central, name);
    centralEntries.push(central);
  }

  const centralOffset = output.length;
  for (const entry of centralEntries) output.push(...entry);
  const centralSize = output.length - centralOffset;

  pushU32(output, 0x06054B50);
  pushU16(output, 0);
  pushU16(output, 0);
  pushU16(output, files.length);
  pushU16(output, files.length);
  pushU32(output, centralSize);
  pushU32(output, centralOffset);
  pushU16(output, 0);

  return Uint8Array.from(output);
}

function textFile(name: string, content: string): ZipFile {
  return { name, data: encoder.encode(content) };
}

export interface XlsxExportInput {
  definition: ReportDefinition;
  rows: readonly ReportRow[];
  actor: Pick<DemoActor, 'role' | 'userId'>;
}

export function buildXlsxExport({
  definition,
  rows,
  actor,
}: XlsxExportInput): Uint8Array {
  const files: readonly ZipFile[] = [
    textFile('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
    textFile('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    textFile('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/><sheet name="Metadata" sheetId="2" r:id="rId2"/></sheets></workbook>'),
    textFile('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    textFile('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'),
    textFile('xl/worksheets/sheet1.xml', worksheetXml(reportRows(definition, rows))),
    textFile('xl/worksheets/sheet2.xml', worksheetXml(metadataRows(definition, actor))),
  ];
  return buildStoredZip(files);
}

export const xlsxExportInternals = {
  xmlEscape,
  columnName,
  crc32,
  buildStoredZip,
};
