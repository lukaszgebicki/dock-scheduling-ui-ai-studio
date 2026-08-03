import type { DemoActor } from '../demoDomain/demoDomain';
import {
  reportCellValue,
  reportColumnLabels,
  reportMetadata,
  type ReportDefinition,
  type ReportRow,
} from './reportingDomain';

function protectSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | null): string {
  const text = protectSpreadsheetFormula(value === null ? '' : String(value));
  return /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function csvRow(values: readonly (string | number | null)[]): string {
  return values.map(csvCell).join(',');
}

export interface CsvExportInput {
  definition: ReportDefinition;
  rows: readonly ReportRow[];
  actor: Pick<DemoActor, 'role' | 'userId'>;
}

export function buildCsvExport({
  definition,
  rows,
  actor,
}: CsvExportInput): string {
  const lines = reportMetadata(definition, actor)
    .map(([key, value]) => csvRow([key, value]));
  lines.push('');
  lines.push(csvRow(definition.columns.map((column) => reportColumnLabels[column])));
  for (const row of rows) {
    lines.push(csvRow(definition.columns.map((column) =>
      reportCellValue(row, column))));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export const csvExportInternals = {
  protectSpreadsheetFormula,
  csvCell,
};
