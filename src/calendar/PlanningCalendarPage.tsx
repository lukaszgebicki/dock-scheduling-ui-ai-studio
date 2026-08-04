import React, { useEffect, useMemo, useState } from 'react';
import { useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import type { AppointmentWorkspaceRecord } from '../appointments/appointmentWorkspace';
import { CapacityDemonstration } from '../capacity/CapacityDemonstration';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { defaultResponsiveCalendarView } from '../responsive/ResponsivePrimitives';
import {
  buildWorkspaceCalendarProjection,
  calendarFilterOptions,
  calendarViewIds,
  calendarViewLabels,
  emptyCalendarFilters,
  groupCalendarProjection,
  validateCalendarFilters,
  type CalendarFilters,
  type CalendarProjectionGroup,
  type CalendarProjectionRecord,
  type CalendarViewId,
} from './calendarViews';

function DeliveryContents({
  record,
  supplierView,
}: {
  record: AppointmentWorkspaceRecord;
  supplierView: boolean;
}) {
  if (record.skuLines.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        Awaiting SKU details
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto" data-responsive-overflow="delivery-contents">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 font-semibold text-gray-700">SKU</th>
            <th className="px-3 py-2 font-semibold text-gray-700">Description</th>
            <th className="px-3 py-2 font-semibold text-gray-700">Units</th>
            <th className="px-3 py-2 font-semibold text-gray-700">Pallets</th>
            <th className="px-3 py-2 font-semibold text-gray-700">Load carrier</th>
            <th className="px-3 py-2 font-semibold text-gray-700">Goods category</th>
            <th className="px-3 py-2 font-semibold text-gray-700">Handling</th>
            <th className="px-3 py-2 font-semibold text-gray-700">Warnings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {record.skuLines.map((line) => (
            <tr key={line.id}>
              <td className="px-3 py-2 text-gray-900">{line.sku}</td>
              <td className="px-3 py-2 text-gray-900">{line.description}</td>
              <td className="px-3 py-2 text-gray-900">{line.units}</td>
              <td className="px-3 py-2 text-gray-900">{line.pallets}</td>
              <td className="px-3 py-2 text-gray-900">{line.loadCarrierType}</td>
              <td className="px-3 py-2 text-gray-900">{line.goodsCategory}</td>
              <td className="px-3 py-2 text-gray-900">{line.handling}</td>
              <td className="px-3 py-2 text-gray-900">{line.warning ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!supplierView && (
        <p className="mt-3 text-xs text-gray-500">
          Calendar contents are limited to approved operational delivery fields. Import lineage and internal planning evidence are not displayed.
        </p>
      )}
    </div>
  );
}

function primaryReference(record: AppointmentWorkspaceRecord): string {
  return record.purchaseOrderNumber || record.systemReference;
}

function contentsSummary(item: CalendarProjectionRecord): string {
  return item.totals
    ? `${item.totals.lineCount} SKU · ${item.totals.units} units · ${item.totals.pallets} pallets`
    : 'Awaiting SKU details';
}

function CalendarCard({
  item,
  expanded,
  supplierView,
  onToggle,
}: {
  item: CalendarProjectionRecord;
  expanded: boolean;
  supplierView: boolean;
  onToggle: () => void;
}) {
  const { record, card } = item;
  const titleId = `${record.id}-calendar-title`;
  const contentsId = `${record.id}-calendar-contents`;

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {record.plannedDate} · {record.plannedTime}
          </p>
          <h3 id={titleId} className="mt-1 break-words text-lg font-semibold text-gray-900">
            {primaryReference(record)}
          </h3>
          <p className="mt-1 break-words text-sm text-gray-600">
            {record.supplierName} · {record.warehouseName}
          </p>
        </div>
        <div className="text-right text-xs">
          <span className="block rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800">
            {record.planningState}
          </span>
          <span className="mt-1 block text-gray-500">{record.bookingOrigin}</span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <dt className="text-gray-500">Lifecycle</dt>
          <dd className="break-words font-medium text-gray-900">{record.lifecycleStatus}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Operational</dt>
          <dd className="break-words font-medium text-gray-900">{record.operationalStatus}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Load type</dt>
          <dd className="break-words font-medium text-gray-900">{item.loadTypeLabel}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Dock</dt>
          <dd className="break-words font-medium text-gray-900">{item.dockLabel}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Tractor</dt>
          <dd className="break-words font-medium text-gray-900">
            {record.supplierTransportDetails.tractorRegistration || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Delivery contents</dt>
          <dd className="font-medium text-gray-900">{contentsSummary(item)}</dd>
        </div>
      </dl>

      {card.conflict && (
        <div role="status" className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>{card.conflict.kind}</strong>: {card.conflict.message}
        </div>
      )}

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentsId}
        onClick={onToggle}
        className="mt-5 min-h-11 w-full rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] sm:w-auto"
      >
        Pokaż zawartość dostawy
      </button>

      {expanded && (
        <div id={contentsId}>
          <DeliveryContents record={record} supplierView={supplierView} />
        </div>
      )}
    </article>
  );
}

function GroupedCalendarView({
  groups,
  expandedId,
  supplierView,
  onToggle,
}: {
  groups: readonly CalendarProjectionGroup[];
  expandedId: string | null;
  supplierView: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-7">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`calendar-group-${group.id}`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`calendar-group-${group.id}`} className="break-words text-lg font-semibold text-gray-900">
              {group.label}
            </h2>
            <span className="text-sm text-gray-500">
              {group.records.length} appointment{group.records.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {group.records.map((item) => (
              <CalendarCard
                key={item.record.id}
                item={item}
                expanded={expandedId === item.record.id}
                supplierView={supplierView}
                onToggle={() => onToggle(item.record.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CalendarListView({
  records,
  expandedId,
  supplierView,
  onToggle,
}: {
  records: readonly CalendarProjectionRecord[];
  expandedId: string | null;
  supplierView: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
      data-responsive-overflow="calendar-list"
    >
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <caption className="sr-only">Visible appointment calendar list</caption>
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-semibold text-gray-700">Planned arrival</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Appointment / PO</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Warehouse</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Supplier</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Load type</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Planning</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Lifecycle</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Operational</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Contents</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((item) => {
            const expanded = expandedId === item.record.id;
            const contentsId = `${item.record.id}-list-contents`;
            return (
              <React.Fragment key={item.record.id}>
                <tr>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                    {item.record.plannedDate} · {item.record.plannedTime}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {primaryReference(item.record)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.record.warehouseName}</td>
                  <td className="px-4 py-3 text-gray-700">{item.record.supplierName}</td>
                  <td className="px-4 py-3 text-gray-700">{item.loadTypeLabel}</td>
                  <td className="px-4 py-3 text-gray-700">{item.record.planningState}</td>
                  <td className="px-4 py-3 text-gray-700">{item.record.lifecycleStatus}</td>
                  <td className="px-4 py-3 text-gray-700">{item.record.operationalStatus}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={contentsId}
                      onClick={() => onToggle(item.record.id)}
                      className="min-h-11 whitespace-nowrap rounded-md border border-[#023466] px-3 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
                    >
                      Pokaż zawartość dostawy
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td id={contentsId} colSpan={9} className="bg-gray-50 px-4 pb-4">
                      <DeliveryContents record={item.record} supplierView={supplierView} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PlanningCalendarPage() {
  const { activeActor, configuration } = useDemoDomain();
  const { visibleRecords } = useAppointmentWorkspace();
  const [view, setView] = useState<CalendarViewId>(() =>
    defaultResponsiveCalendarView(activeActor.role));
  const [filters, setFilters] = useState<CalendarFilters>(emptyCalendarFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supplierView = Boolean(activeActor.supplierOrganizationId);

  useEffect(() => {
    setView(defaultResponsiveCalendarView(activeActor.role));
    setFilters(emptyCalendarFilters);
    setExpandedId(null);
  }, [activeActor.id, activeActor.role]);

  const options = useMemo(() => calendarFilterOptions(visibleRecords), [visibleRecords]);
  const projection = useMemo(() => buildWorkspaceCalendarProjection(
    visibleRecords,
    configuration.warehouses,
    filters,
  ), [configuration.warehouses, filters, visibleRecords]);
  const groups = useMemo(() => view === 'list'
    ? []
    : groupCalendarProjection(projection, view), [projection, view]);
  const filterError = validateCalendarFilters(filters);

  useEffect(() => {
    if (expandedId && !projection.some((item) => item.record.id === expandedId)) {
      setExpandedId(null);
    }
  }, [expandedId, projection]);

  const setFilter = <Key extends keyof CalendarFilters>(
    key: Key,
    value: CalendarFilters[Key],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((current) => current === id ? null : id);
  };

  return (
    <section
      aria-labelledby="planning-calendar-title"
      className="mx-auto max-w-7xl"
      data-responsive-screen="role-calendar"
      data-responsive-default-view={defaultResponsiveCalendarView(activeActor.role)}
    >
      <header className="mb-6">
        <p className="text-sm font-medium text-[#023466]">Scoped appointment workspace · local demonstration</p>
        <h1 id="planning-calendar-title" className="mt-1 text-2xl font-semibold text-gray-900">
          PO planning calendar
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Day, Week, Dock, Load Type, List and Workflow are read-only projections of the same visible appointment records. One card or row represents one appointment and PO header.
        </p>
        {(supplierView || activeActor.role === 'Warehouse Operator') && (
          <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 sm:hidden">
            Narrow-screen agenda starts in Day view. All six read-only views remain available below.
          </p>
        )}
      </header>

      <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div
          role="group"
          aria-label="Calendar view"
          className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0"
        >
          {calendarViewIds.map((viewId) => (
            <button
              key={viewId}
              type="button"
              aria-pressed={view === viewId}
              onClick={() => {
                setView(viewId);
                setExpandedId(null);
              }}
              className={`min-h-11 flex-none whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] ${view === viewId ? 'bg-[#023466] text-white' : 'border border-[#023466] text-[#023466]'}`}
            >
              {calendarViewLabels[viewId]} view
            </button>
          ))}
        </div>

        <fieldset className="mt-5 border-t border-gray-200 pt-4">
          <legend className="text-sm font-semibold text-gray-900">Calendar filters</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label htmlFor="calendar-date-from" className="text-sm font-medium text-gray-800">
              Planned date from
              <input
                id="calendar-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilter('dateFrom', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label htmlFor="calendar-date-to" className="text-sm font-medium text-gray-800">
              Planned date to
              <input
                id="calendar-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilter('dateTo', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label htmlFor="calendar-warehouse" className="text-sm font-medium text-gray-800">
              Warehouse
              <select
                id="calendar-warehouse"
                value={filters.warehouseId}
                onChange={(event) => setFilter(
                  'warehouseId',
                  event.target.value as CalendarFilters['warehouseId'],
                )}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All visible warehouses</option>
                {options.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </label>
            <label htmlFor="calendar-delivery-type" className="text-sm font-medium text-gray-800">
              Delivery type
              <select
                id="calendar-delivery-type"
                value={filters.deliveryType}
                onChange={(event) => setFilter('deliveryType', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">All visible delivery types</option>
                {options.deliveryTypes.map((deliveryType) => (
                  <option key={deliveryType} value={deliveryType}>{deliveryType}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setFilters(emptyCalendarFilters);
                setExpandedId(null);
              }}
              className="min-h-11 w-full rounded-md border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-700 sm:w-auto"
            >
              Clear calendar filters
            </button>
            <p role="status" className="text-sm text-gray-600">
              {projection.length} visible appointment{projection.length === 1 ? '' : 's'}
            </p>
          </div>
        </fieldset>
      </div>

      {filterError && (
        <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {filterError}
        </p>
      )}

      <div className="mt-6">
        {!filterError && projection.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <h2 className="font-semibold text-gray-900">No visible calendar appointments</h2>
            <p className="mt-2 text-sm text-gray-600">
              Change the demo access context, warehouse assignment or calendar filters.
            </p>
          </div>
        ) : !filterError && view === 'list' ? (
          <CalendarListView
            records={projection}
            expandedId={expandedId}
            supplierView={supplierView}
            onToggle={toggleExpanded}
          />
        ) : !filterError ? (
          <GroupedCalendarView
            groups={groups}
            expandedId={expandedId}
            supplierView={supplierView}
            onToggle={toggleExpanded}
          />
        ) : null}
      </div>

      <CapacityDemonstration actor={activeActor} warehouses={configuration.warehouses} />
    </section>
  );
}
