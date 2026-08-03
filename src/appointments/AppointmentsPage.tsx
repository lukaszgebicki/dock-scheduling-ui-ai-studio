import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Search, X } from 'lucide-react';
import { Link } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  canSelectColumns,
  columnsForActor,
  emptyWorkspaceFilters,
  filterWorkspaceRecords,
  isSupplierActor,
  skuTotals,
  workspaceColumnIds,
  type AppointmentWorkspaceRecord,
  type WorkspaceColumnId,
  type WorkspaceFilters,
} from './appointmentWorkspace';
import { useAppointmentWorkspace } from './AppointmentWorkspaceProvider';

const columnLabels: Readonly<Record<WorkspaceColumnId, string>> = {
  appointment: 'Appointment',
  plannedArrival: 'Planned arrival',
  warehouse: 'Warehouse',
  supplier: 'Supplier',
  deliveryType: 'Delivery type',
  externalReference: 'External reference',
  purchaseOrder: 'Purchase order',
  planningState: 'Planning state',
  bookingOrigin: 'Booking origin',
  lifecycleStatus: 'Lifecycle status',
  operationalStatus: 'Operational status',
  skuSummary: 'SKU summary',
  transport: 'Transport',
  requiredAction: 'Required action',
  lastChanged: 'Last change',
};

function setFilter<K extends keyof WorkspaceFilters>(
  filters: WorkspaceFilters,
  key: K,
  value: WorkspaceFilters[K],
): WorkspaceFilters {
  return { ...filters, [key]: value };
}

function formatPlannedDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function cellValue(
  record: AppointmentWorkspaceRecord,
  column: WorkspaceColumnId,
): React.ReactNode {
  if (column === 'appointment') {
    return <span className="font-semibold text-gray-900">{record.systemReference}</span>;
  }
  if (column === 'plannedArrival') {
    return <><span>{formatPlannedDate(record.plannedDate)}</span><span className="block text-xs text-gray-500">{record.plannedTime} · {record.timeZone}</span></>;
  }
  if (column === 'warehouse') return record.warehouseName;
  if (column === 'supplier') return record.supplierName;
  if (column === 'deliveryType') return record.deliveryType;
  if (column === 'externalReference') return record.externalReference;
  if (column === 'purchaseOrder') return record.purchaseOrderNumber;
  if (column === 'planningState') return record.planningState;
  if (column === 'bookingOrigin') return record.bookingOrigin;
  if (column === 'lifecycleStatus') return record.lifecycleStatus;
  if (column === 'operationalStatus') return record.operationalStatus;
  if (column === 'skuSummary') {
    const totals = skuTotals(record);
    return totals
      ? `${totals.lineCount} lines · ${totals.units} units · ${totals.pallets} pallets`
      : 'Awaiting SKU details';
  }
  if (column === 'transport') {
    return <>{record.supplierTransportDetails.tractorRegistration}<span className="block text-xs text-gray-500">{record.supplierTransportDetails.trailerOrContainerRegistration}</span></>;
  }
  if (column === 'requiredAction') return record.requiredAction;
  return record.lastChangedAt;
}

export function AppointmentsPage() {
  const { activeActor } = useDemoDomain();
  const {
    visibleRecords,
    savedViews,
    saveView,
    setDefaultView,
  } = useAppointmentWorkspace();
  const allowedColumns = columnsForActor(activeActor);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<WorkspaceFilters>(emptyWorkspaceFilters);
  const [selectedColumns, setSelectedColumns] = useState<readonly WorkspaceColumnId[]>(allowedColumns);
  const [savedViewName, setSavedViewName] = useState('');
  const [selectedSavedViewId, setSelectedSavedViewId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const renderedColumns = selectedColumns.filter((column) =>
    allowedColumns.includes(column));
  const effectiveColumns = renderedColumns.length > 0
    ? renderedColumns
    : allowedColumns;

  useEffect(() => {
    setSearchTerm('');
    setFilters(emptyWorkspaceFilters);
    setSelectedColumns(columnsForActor(activeActor));
    setSavedViewName('');
    setSelectedSavedViewId('');
    setMessage(null);
  }, [activeActor.id]);

  const filteredRecords = useMemo(() => filterWorkspaceRecords(
    visibleRecords,
    activeActor,
    filters,
    searchTerm,
  ), [activeActor, filters, searchTerm, visibleRecords]);

  const warehouseOptions = useMemo(() => Array.from(new Map(
    visibleRecords.map((record) => [record.warehouseId, record.warehouseName]),
  )), [visibleRecords]);
  const supplierOptions = useMemo(() => Array.from(new Map(
    visibleRecords.map((record) => [record.supplierOrganizationId, record.supplierName]),
  )), [visibleRecords]);
  const deliveryTypes = useMemo(() => Array.from(new Set(
    visibleRecords.map((record) => record.deliveryType),
  )).sort(), [visibleRecords]);

  const hasActiveFilters = searchTerm.trim().length > 0
    || JSON.stringify(filters) !== JSON.stringify(emptyWorkspaceFilters);

  const clearFilters = () => {
    setSearchTerm('');
    setFilters(emptyWorkspaceFilters);
    setMessage(null);
  };

  const toggleColumn = (column: WorkspaceColumnId) => {
    setSelectedColumns((current) => current.includes(column)
      ? current.filter((candidate) => candidate !== column)
      : workspaceColumnIds.filter((candidate) =>
        allowedColumns.includes(candidate)
        && (candidate === column || current.includes(candidate))));
  };

  const saveCurrentView = () => {
    const result = saveView(savedViewName, filters, effectiveColumns);
    setMessage(result.error ?? 'Saved view created in local memory only. Nothing was persisted.');
    if (result.savedView) {
      setSelectedSavedViewId(result.savedView.id);
      setSavedViewName('');
    }
  };

  const applySelectedView = () => {
    const view = savedViews.find((candidate) => candidate.id === selectedSavedViewId);
    if (!view) {
      setMessage('Select a saved view available to the active actor.');
      return;
    }
    setFilters({ ...view.filters });
    setSearchTerm('');
    const permitted = view.columns.filter((column) => allowedColumns.includes(column));
    setSelectedColumns(permitted.length > 0 ? permitted : allowedColumns);
    setMessage('Saved view applied from local memory. No durable preference exists.');
  };

  const makeDefault = () => {
    const error = setDefaultView(selectedSavedViewId);
    setMessage(error ?? 'Default saved view selected in local memory only.');
  };

  return (
    <div className="mx-auto min-w-0 max-w-7xl">
      <header className="mb-8">
        <p className="text-sm font-medium text-[#023466]">Planning-aware local workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Appointments</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review role-scoped PO headers, planning readiness and approved operational evidence. No list action changes lifecycle, gate, dock, slot or capacity.
        </p>
      </header>

      {message && <p role="status" tabIndex={-1} className="mb-5 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800">{message}</p>}

      <section className="mb-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="workspace-filters-title">
        <h2 id="workspace-filters-title" className="font-semibold text-gray-900">Search and filters</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-gray-700 xl:col-span-2">
            Global search
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" aria-hidden="true" />
              <input aria-label="Global search" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Appointment, reference, PO, ASN, registration or visible party" className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm" />
            </span>
          </label>
          <label className="text-sm font-medium text-gray-700">Lifecycle status<select aria-label="Lifecycle status" value={filters.lifecycleStatus} onChange={(event) => setFilters(setFilter(filters, 'lifecycleStatus', event.target.value as WorkspaceFilters['lifecycleStatus']))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">All lifecycle statuses</option>{['DRAFT','SUBMITTED','PENDING_APPROVAL','CONFIRMED','REJECTED','CANCELLED'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Completion<select aria-label="Completion" value={filters.completion} onChange={(event) => setFilters(setFilter(filters, 'completion', event.target.value as WorkspaceFilters['completion']))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">All records</option><option value="active">Active</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></label>
          <label className="text-sm font-medium text-gray-700">Planned date from<input aria-label="Planned date from" type="date" value={filters.plannedDateFrom} onChange={(event) => setFilters(setFilter(filters, 'plannedDateFrom', event.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></label>
          <label className="text-sm font-medium text-gray-700">Planned date to<input aria-label="Planned date to" type="date" value={filters.plannedDateTo} onChange={(event) => setFilters(setFilter(filters, 'plannedDateTo', event.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></label>
          <label className="text-sm font-medium text-gray-700">Warehouse<select aria-label="Warehouse" value={filters.warehouseId} onChange={(event) => setFilters(setFilter(filters, 'warehouseId', event.target.value as WorkspaceFilters['warehouseId']))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">All warehouses</option>{warehouseOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          {!isSupplierActor(activeActor) && <label className="text-sm font-medium text-gray-700">Supplier<select aria-label="Supplier" value={filters.supplierOrganizationId} onChange={(event) => setFilters(setFilter(filters, 'supplierOrganizationId', event.target.value as WorkspaceFilters['supplierOrganizationId']))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">All suppliers</option>{supplierOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
          <label className="text-sm font-medium text-gray-700">Delivery type<select aria-label="Delivery type" value={filters.deliveryType} onChange={(event) => setFilters(setFilter(filters, 'deliveryType', event.target.value))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">All delivery types</option>{deliveryTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          {!isSupplierActor(activeActor) && activeActor.role !== 'Security Officer' && <label className="text-sm font-medium text-gray-700">Planning state<select aria-label="Planning state" value={filters.planningState} onChange={(event) => setFilters(setFilter(filters, 'planningState', event.target.value as WorkspaceFilters['planningState']))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">All planning states</option>{['AWAITING_DETAILS','DETAILS_ATTACHED','VALIDATION_CONFLICT','READY'].map((state) => <option key={state} value={state}>{state}</option>)}</select></label>}
          {!isSupplierActor(activeActor) && activeActor.role !== 'Security Officer' && <label className="text-sm font-medium text-gray-700">Booking origin<select aria-label="Booking origin" value={filters.bookingOrigin} onChange={(event) => setFilters(setFilter(filters, 'bookingOrigin', event.target.value as WorkspaceFilters['bookingOrigin']))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">All origins</option><option value="SUPPLIER_RESERVED">SUPPLIER_RESERVED</option><option value="ADMIN_ADDED">ADMIN_ADDED</option></select></label>}
          <label className="text-sm font-medium text-gray-700">Required action<select aria-label="Required action" value={filters.actionRequired} onChange={(event) => setFilters(setFilter(filters, 'actionRequired', event.target.value as WorkspaceFilters['actionRequired']))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="all">All action states</option><option value="required">Action required</option><option value="none">No action required</option></select></label>
          <label className="flex items-center gap-2 self-end rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"><input aria-label="Missing details only" type="checkbox" checked={filters.missingDetailsOnly} onChange={(event) => setFilters(setFilter(filters, 'missingDetailsOnly', event.target.checked))} />Missing SKU details only</label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600" aria-live="polite">Showing <span className="font-semibold text-gray-900">{filteredRecords.length}</span> of {visibleRecords.length} appointments</p>
          {hasActiveFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-[#023466]"><X className="h-4 w-4" aria-hidden="true" />Clear filters</button>}
        </div>
      </section>

      <section className="mb-6 grid gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 lg:grid-cols-2" aria-labelledby="saved-views-title">
        <div>
          <h2 id="saved-views-title" className="font-semibold text-gray-900">Local saved views</h2>
          <p className="mt-1 text-xs text-gray-500">Views exist only in component/provider memory and are never persisted.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="min-w-56 flex-1 text-sm font-medium text-gray-700">Saved view name<input aria-label="Saved view name" value={savedViewName} onChange={(event) => setSavedViewName(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <button type="button" onClick={saveCurrentView} className="self-end rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">Save local view</button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-56 flex-1 text-sm font-medium text-gray-700">Available saved views<select aria-label="Available saved views" value={selectedSavedViewId} onChange={(event) => setSelectedSavedViewId(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Select saved view</option>{savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}{view.isDefault ? ' · Default' : ''}</option>)}</select></label>
          <button type="button" onClick={applySelectedView} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466]">Apply view</button>
          <button type="button" onClick={makeDefault} className="rounded-md border border-gray-400 px-4 py-2 text-sm font-semibold text-gray-800">Set local default</button>
        </div>
      </section>

      {canSelectColumns(activeActor) && (
        <details className="mb-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <summary className="cursor-pointer font-semibold text-gray-900">Column selector</summary>
          <div className="mt-3 flex flex-wrap gap-3">
            {workspaceColumnIds.filter((column) => allowedColumns.includes(column)).map((column) => <label key={column} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" aria-label={`Column ${columnLabels[column]}`} checked={effectiveColumns.includes(column)} onChange={() => toggleColumn(column)} />{columnLabels[column]}</label>)}
          </div>
        </details>
      )}

      {filteredRecords.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:block md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50"><tr>{effectiveColumns.map((column) => <th key={column} scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{columnLabels[column]}</th>)}<th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Action</th></tr></thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRecords.map((record) => <tr key={record.id}>{effectiveColumns.map((column) => <td key={column} className="px-4 py-4 text-sm text-gray-700">{cellValue(record, column)}</td>)}<td className="whitespace-nowrap px-4 py-4 text-sm"><Link to={`/appointments/${record.id}`} aria-label={`Open appointment details ${record.systemReference}`} className="font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">Open appointment details</Link></td></tr>)}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {filteredRecords.map((record) => (
              <article key={record.id} className="rounded-lg bg-white p-4 shadow ring-1 ring-gray-200">
                <div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-gray-900">{record.systemReference}</h2><span className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold">{record.lifecycleStatus}</span></div>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div><dt className="font-semibold text-gray-600">Planned arrival</dt><dd>{formatPlannedDate(record.plannedDate)}, {record.plannedTime}</dd></div>
                  <div><dt className="font-semibold text-gray-600">Warehouse</dt><dd>{record.warehouseName}</dd></div>
                  {!isSupplierActor(activeActor) && <div><dt className="font-semibold text-gray-600">Supplier</dt><dd>{record.supplierName}</dd></div>}
                  <div><dt className="font-semibold text-gray-600">Purchase order</dt><dd>{record.purchaseOrderNumber}</dd></div>
                  <div><dt className="font-semibold text-gray-600">Required action</dt><dd>{record.requiredAction}</dd></div>
                </dl>
                <Link to={`/appointments/${record.id}`} aria-label={`Open appointment details ${record.systemReference}`} className="mt-4 inline-flex font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">Open appointment details</Link>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <CalendarClock className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
          <h2 className="mt-2 text-sm font-semibold text-gray-900">No appointments found</h2>
          <p className="mt-1 text-sm text-gray-500">No appointment matches the actor-safe search and filter selection.</p>
          <button type="button" onClick={clearFilters} className="mt-6 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">Clear filters</button>
        </div>
      )}
    </div>
  );
}
