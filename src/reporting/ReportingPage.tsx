import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import { buildCsvExport } from './csvExport';
import { downloadLocalReport } from './localDownload';
import {
  applyReportMode,
  availableReportColumns,
  buildReportRows,
  changeReportLevel,
  createInitialReportDefinition,
  reportCellValue,
  reportColumnLabels,
  reportFileStem,
  sanitizeReportDefinition,
  summarizeByMonth,
  summarizeBySupplier,
  validateReportDefinition,
  type ReportColumnId,
  type ReportDefinition,
  type ReportFilters,
  type ReportLevel,
  type ReportMode,
  type ReportSortDirection,
} from './reportingDomain';
import { buildXlsxExport } from './xlsxExport';

function setFilter<K extends keyof ReportFilters>(
  definition: ReportDefinition,
  key: K,
  value: ReportFilters[K],
): ReportDefinition {
  return {
    ...definition,
    filters: { ...definition.filters, [key]: value },
  };
}

function formatCell(value: string | number | null): string {
  if (value === null) return '—';
  return String(value);
}

function SummaryTable({
  title,
  rows,
}: {
  title: string;
  rows: ReturnType<typeof summarizeBySupplier>;
}) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby={`summary-${title}`}>
      <h2 id={`summary-${title}`} className="font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">No summary groups for the active result.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead><tr>{['Group', 'Distinct appointments', 'Units', 'Pallets'].map((heading) => <th key={heading} className="px-3 py-2 text-left font-semibold text-gray-800">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2">{row.appointmentCount}</td>
                  <td className="px-3 py-2">{row.units}</td>
                  <td className="px-3 py-2">{row.pallets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ReportingPage() {
  const { activeActor } = useDemoDomain();
  const { visibleRecords } = useAppointmentWorkspace();
  const firstVisibleDate = visibleRecords[0]?.plannedDate ?? '2026-08-10';
  const [anchorDate, setAnchorDate] = useState(firstVisibleDate);
  const [definition, setDefinition] = useState<ReportDefinition>(() =>
    createInitialReportDefinition(firstVisibleDate));
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextAnchor = visibleRecords[0]?.plannedDate ?? '2026-08-10';
    setAnchorDate(nextAnchor);
    setDefinition(createInitialReportDefinition(nextAnchor));
    setMessage(null);
  }, [activeActor.id]);

  const sanitized = useMemo(() => sanitizeReportDefinition(definition), [definition]);
  const validation = useMemo(() => validateReportDefinition(sanitized), [sanitized]);
  const rows = useMemo(() => validation.valid
    ? buildReportRows(visibleRecords, sanitized)
    : [], [sanitized, validation.valid, visibleRecords]);
  const supplierSummary = useMemo(() => summarizeBySupplier(rows), [rows]);
  const monthSummary = useMemo(() => summarizeByMonth(rows), [rows]);
  const columnCatalog = availableReportColumns(sanitized.level);

  const warehouseOptions = useMemo(() => Array.from(new Map(
    visibleRecords.map((record) => [record.warehouseId, record.warehouseName]),
  )), [visibleRecords]);
  const supplierOptions = useMemo(() => Array.from(new Map(
    visibleRecords.map((record) => [record.supplierOrganizationId, record.supplierName]),
  )), [visibleRecords]);

  const applyPreset = (mode: ReportMode) => {
    setDefinition((current) => applyReportMode(current, mode, anchorDate));
    setMessage(null);
  };

  const changeLevel = (level: ReportLevel) => {
    setDefinition((current) => changeReportLevel({ ...current, mode: 'CUSTOM' }, level));
    setMessage(null);
  };

  const toggleColumn = (column: ReportColumnId) => {
    setDefinition((current) => ({
      ...current,
      columns: current.columns.includes(column)
        ? current.columns.filter((candidate) => candidate !== column)
        : columnCatalog.filter((candidate) =>
          candidate === column || current.columns.includes(candidate)),
    }));
    setMessage(null);
  };

  const exportCsv = () => {
    if (!validation.valid || rows.length === 0) return;
    const csv = buildCsvExport({ definition: sanitized, rows, actor: activeActor });
    downloadLocalReport({
      content: csv,
      mimeType: 'text/csv;charset=utf-8',
      fileName: `${reportFileStem(sanitized)}.csv`,
    });
    setMessage('CSV was generated locally for demonstration. No report data was persisted or sent.');
  };

  const exportXlsx = () => {
    if (!validation.valid || rows.length === 0) return;
    const workbook = buildXlsxExport({ definition: sanitized, rows, actor: activeActor });
    downloadLocalReport({
      content: workbook,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: `${reportFileStem(sanitized)}.xlsx`,
    });
    setMessage('XLSX was generated locally for demonstration. No report data was persisted or sent.');
  };

  const updateDate = (key: 'dateFrom' | 'dateTo', value: string) => {
    setDefinition((current) => ({ ...current, mode: 'CUSTOM', [key]: value }));
    setMessage(null);
  };

  const updateSort = (
    key: 'column' | 'direction',
    value: ReportColumnId | ReportSortDirection,
  ) => {
    setDefinition((current) => ({
      ...current,
      sort: { ...current.sort, [key]: value },
    }));
    setMessage(null);
  };

  const exportsDisabled = !validation.valid || rows.length === 0;

  return (
    <div className="mx-auto max-w-7xl" aria-labelledby="reporting-title">
      <header className="mb-6">
        <Link to="/appointments" className="text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">← Back to appointments</Link>
        <p className="mt-4 text-sm font-medium text-[#023466]">Internal local reporting</p>
        <h1 id="reporting-title" className="mt-1 text-2xl font-semibold text-gray-900">PO and SKU reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          Preview scoped weekly or monthly delivery data and generate local files. Reporting is read-only and does not persist, send or mutate appointment data.
        </p>
      </header>

      {message && <p role="status" className="mb-5 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800">{message}</p>}

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="report-controls-title">
        <h2 id="report-controls-title" className="font-semibold text-gray-900">Report definition</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">Preset anchor date<input aria-label="Preset anchor date" type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
          <div className="flex flex-wrap items-end gap-2 xl:col-span-3">
            <button type="button" onClick={() => applyPreset('WEEKLY_ALL_DELIVERIES')} className="rounded-md border border-[#023466] px-3 py-2 text-sm font-semibold text-[#023466]">Apply full week</button>
            <button type="button" onClick={() => applyPreset('MONTHLY_SLIPSHEET')} className="rounded-md border border-[#023466] px-3 py-2 text-sm font-semibold text-[#023466]">Apply monthly Slipsheet</button>
            <button type="button" onClick={() => applyPreset('CUSTOM')} className="rounded-md border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-800">Use custom mode</button>
          </div>
          <label className="text-sm font-medium text-gray-700">Report mode<input aria-label="Report mode" readOnly value={sanitized.mode} className="mt-1 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Report level<select aria-label="Report level" value={sanitized.level} onChange={(event) => changeLevel(event.target.value as ReportLevel)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="PO">PO — one row per appointment</option><option value="SKU">SKU — one row per product line</option></select></label>
          <label className="text-sm font-medium text-gray-700">Inclusive date from<input aria-label="Inclusive date from" type="date" value={sanitized.dateFrom} onChange={(event) => updateDate('dateFrom', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Inclusive date to<input aria-label="Inclusive date to" type="date" value={sanitized.dateTo} onChange={(event) => updateDate('dateTo', event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Warehouse<select aria-label="Report warehouse" value={sanitized.filters.warehouseId} onChange={(event) => setDefinition(setFilter(sanitized, 'warehouseId', event.target.value as ReportFilters['warehouseId']))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="all">All scoped warehouses</option>{warehouseOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Supplier<select aria-label="Report supplier" value={sanitized.filters.supplierOrganizationId} onChange={(event) => setDefinition(setFilter(sanitized, 'supplierOrganizationId', event.target.value as ReportFilters['supplierOrganizationId']))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="all">All scoped suppliers</option>{supplierOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Booking origin<select aria-label="Report booking origin" value={sanitized.filters.bookingOrigin} onChange={(event) => setDefinition(setFilter(sanitized, 'bookingOrigin', event.target.value as ReportFilters['bookingOrigin']))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="all">All origins</option><option value="SUPPLIER_RESERVED">SUPPLIER_RESERVED</option><option value="ADMIN_ADDED">ADMIN_ADDED</option></select></label>
          <label className="text-sm font-medium text-gray-700">Planning state<select aria-label="Report planning state" value={sanitized.filters.planningState} onChange={(event) => setDefinition(setFilter(sanitized, 'planningState', event.target.value as ReportFilters['planningState']))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="all">All planning states</option>{['AWAITING_DETAILS','DETAILS_ATTACHED','VALIDATION_CONFLICT','READY'].map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Appointment status<select aria-label="Report appointment status" value={sanitized.filters.appointmentStatus} onChange={(event) => setDefinition(setFilter(sanitized, 'appointmentStatus', event.target.value as ReportFilters['appointmentStatus']))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="all">All appointment statuses</option>{['DRAFT','SUBMITTED','PENDING_APPROVAL','CONFIRMED','REJECTED','CANCELLED'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700 xl:col-span-2">Report search<input aria-label="Report search" type="search" value={sanitized.filters.search} onChange={(event) => setDefinition(setFilter(sanitized, 'search', event.target.value))} placeholder="Appointment, PO, SKU, description, Supplier or registration" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Sort column<select aria-label="Report sort column" value={sanitized.sort.column} onChange={(event) => updateSort('column', event.target.value as ReportColumnId)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">{columnCatalog.map((column) => <option key={column} value={column}>{reportColumnLabels[column]}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Sort direction<select aria-label="Report sort direction" value={sanitized.sort.direction} onChange={(event) => updateSort('direction', event.target.value as ReportSortDirection)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="ASC">Ascending</option><option value="DESC">Descending</option></select></label>
        </div>

        <fieldset className="mt-5 border-t border-gray-200 pt-4">
          <legend className="font-semibold text-gray-900">Selected columns</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {columnCatalog.map((column) => <label key={column} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" aria-label={`Report column ${reportColumnLabels[column]}`} checked={sanitized.columns.includes(column)} onChange={() => toggleColumn(column)} />{reportColumnLabels[column]}</label>)}
          </div>
        </fieldset>

        {!validation.valid && (
          <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold">Report definition is blocked.</p>
            <ul className="mt-1 list-disc pl-5">{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
          <p aria-live="polite" className="text-sm text-gray-700">Active result: <strong>{rows.length}</strong> {sanitized.level} rows from {sanitized.dateFrom || '—'} through {sanitized.dateTo || '—'}, inclusive.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportCsv} disabled={exportsDisabled} className="inline-flex items-center gap-2 rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" aria-hidden="true" />Export active CSV</button>
            <button type="button" onClick={exportXlsx} disabled={exportsDisabled} className="inline-flex items-center gap-2 rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" aria-hidden="true" />Export active XLSX</button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SummaryTable title="Summary by Supplier" rows={supplierSummary} />
        <SummaryTable title="Summary by month" rows={monthSummary} />
      </div>

      <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="report-preview-title">
        <h2 id="report-preview-title" className="font-semibold text-gray-900">Active report preview</h2>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No scoped rows match the active report definition. No export is available.</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead><tr>{sanitized.columns.map((column) => <th key={column} scope="col" className="px-3 py-2 text-left font-semibold text-gray-800">{reportColumnLabels[column]}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => <tr key={row.key}>{sanitized.columns.map((column) => <td key={column} className="px-3 py-2 text-gray-700">{formatCell(reportCellValue(row, column))}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-3 md:hidden" aria-label="Responsive report cards">
              {rows.map((row) => (
                <article key={row.key} className="rounded-md border border-gray-200 p-3">
                  {sanitized.columns.map((column) => <p key={column} className="text-sm"><strong>{reportColumnLabels[column]}:</strong> {formatCell(reportCellValue(row, column))}</p>)}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
