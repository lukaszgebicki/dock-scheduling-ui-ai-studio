import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CalendarDays, Gauge, ShieldCheck, Smartphone } from 'lucide-react';
import { useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  dashboardFilterLabel,
  deriveDashboardModel,
  filterDashboardRecords,
  isDashboardFilterId,
  type DashboardMetric,
} from './dashboardDomain';

function MetricCard({
  metric,
  actorId,
}: {
  metric: DashboardMetric;
  actorId: string;
}) {
  const content = (
    <>
      <p className="text-sm font-semibold text-gray-700">{metric.label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-950">
        {metric.value === null ? 'Unavailable' : metric.value}
      </p>
      <p className="mt-2 text-sm text-gray-600">{metric.description}</p>
      {metric.unavailableReason && (
        <p className="mt-2 text-sm font-medium text-amber-800">{metric.unavailableReason}</p>
      )}
    </>
  );

  if (metric.filter && metric.value !== null) {
    return (
      <Link
        to={`/dashboard?filter=${metric.filter}&actor=${encodeURIComponent(actorId)}`}
        className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#7FA5D0] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
        aria-label={`Filter dashboard by ${metric.label}: ${metric.value}`}
      >
        {content}
        <p className="mt-3 text-sm font-semibold text-[#023466]">Open matching scoped records →</p>
      </Link>
    );
  }

  return <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">{content}</article>;
}

function AppointmentCards({
  records,
  showSupplier,
  heading,
}: {
  records: ReturnType<typeof filterDashboardRecords>;
  showSupplier: boolean;
  heading: string;
}) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="dashboard-records-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="dashboard-records-title" className="font-semibold text-gray-900">{heading}</h2>
        <p className="text-sm text-gray-600">{records.length} scoped records</p>
      </div>
      {records.length === 0 ? (
        <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-900">No matching appointments</h3>
          <p className="mt-1 text-sm text-gray-600">The selected KPI has no records in the active actor scope.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2" aria-label="Dashboard appointment results">
          {records.map((record) => (
            <li key={record.id} className="rounded-md border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{record.systemReference}</h3>
                  <p className="mt-1 text-sm text-gray-700">PO {record.purchaseOrderNumber}</p>
                </div>
                <span className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700">{record.operationalStatus}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <div><dt className="font-semibold">Planned</dt><dd>{record.plannedDate} · {record.plannedTime}</dd></div>
                <div><dt className="font-semibold">Warehouse</dt><dd>{record.warehouseName}</dd></div>
                {showSupplier && <div><dt className="font-semibold">Supplier</dt><dd>{record.supplierName}</dd></div>}
                <div><dt className="font-semibold">Lifecycle</dt><dd>{record.lifecycleStatus}</dd></div>
                <div className="sm:col-span-2"><dt className="font-semibold">Safe next action</dt><dd>{record.requiredAction}</dd></div>
              </dl>
              <Link to={`/appointments/${record.id}`} className="mt-3 inline-block text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                Open scoped appointment details
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardPage() {
  const { activeActor } = useDemoDomain();
  const { visibleRecords } = useAppointmentWorkspace();
  const [searchParams] = useSearchParams();
  const model = useMemo(
    () => deriveDashboardModel(visibleRecords, activeActor),
    [activeActor, visibleRecords],
  );

  const requestedFilter = searchParams.get('filter');
  const requestedActor = searchParams.get('actor');
  const selectedFilter = requestedActor === activeActor.id && isDashboardFilterId(requestedFilter)
    ? requestedFilter
    : null;
  const filteredRecords = useMemo(
    () => selectedFilter && model.anchorDate
      ? filterDashboardRecords(visibleRecords, selectedFilter, model.anchorDate)
      : model.agenda,
    [model.agenda, model.anchorDate, selectedFilter, visibleRecords],
  );
  const staleFilterIgnored = requestedFilter !== null && selectedFilter === null;
  const showSupplier = model.audience !== 'SUPPLIER';
  const resultHeading = selectedFilter
    ? `${dashboardFilterLabel(selectedFilter)} — filtered appointments`
    : 'Actor-scoped agenda';

  return (
    <div className="mx-auto max-w-7xl" aria-labelledby="dashboard-title">
      <header className="mb-6">
        <Link to="/appointments" className="text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">← Back to appointments</Link>
        <p className="mt-4 text-sm font-medium text-[#023466]">Read-only operational overview</p>
        <h1 id="dashboard-title" className="mt-1 text-2xl font-semibold text-gray-900">Role dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          All values are derived only from appointments visible to {activeActor.role}. The dashboard does not persist filters or change appointment state.
        </p>
      </header>

      <section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4" aria-labelledby="dashboard-context-title">
        <h2 id="dashboard-context-title" className="flex items-center gap-2 font-semibold text-blue-950"><Gauge className="h-5 w-5" aria-hidden="true" />Dashboard context</h2>
        <p className="mt-2 text-sm text-blue-900">Active actor: {activeActor.role} · {activeActor.userId}</p>
        <p className="mt-1 text-sm text-blue-900">Deterministic anchor date: {model.anchorDate ?? 'Unavailable — no scoped appointments'}</p>
        {staleFilterIgnored && (
          <p role="status" className="mt-2 text-sm font-semibold text-blue-950">The KPI filter was cleared because it does not belong to the active actor or is invalid.</p>
        )}
      </section>

      {visibleRecords.length === 0 ? (
        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-semibold text-gray-900">No appointments in the active scope</h2>
          <p className="mt-2 text-sm text-gray-600">No KPI value is claimed. Review the current actor and warehouse assignments.</p>
        </section>
      ) : (
        <>
          <section aria-labelledby="dashboard-kpis-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="dashboard-kpis-title" className="text-xl font-semibold text-gray-900">Role KPIs</h2>
                <p className="mt-1 text-sm text-gray-600">Select an available KPI to open the exact actor-scoped result set.</p>
              </div>
              {selectedFilter && (
                <Link to="/dashboard" className="rounded-md border border-[#023466] px-3 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">Clear KPI filter</Link>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {model.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} actorId={activeActor.id} />)}
            </div>
          </section>

          <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="responsive-role-title">
            <h2 id="responsive-role-title" className="flex items-center gap-2 font-semibold text-gray-900"><Smartphone className="h-5 w-5" aria-hidden="true" />{model.responsiveHeading}</h2>
            <p className="mt-2 text-sm text-gray-600">{model.responsiveDescription}</p>
            {model.desktopRecommendation && <p className="mt-2 text-sm font-semibold text-amber-800">{model.desktopRecommendation}</p>}
            {model.audience === 'SUPPLIER' && model.nextAppointment && (
              <div className="mt-4 rounded-md border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Next Supplier appointment</p>
                <p className="mt-1 font-semibold text-gray-900">{model.nextAppointment.plannedDate} · {model.nextAppointment.plannedTime}</p>
                <p className="mt-1 text-sm text-gray-700">{model.nextAppointment.systemReference} · {model.nextAppointment.warehouseName}</p>
              </div>
            )}
            {model.audience === 'SECURITY' && (
              <Link to="/gate-operations" className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />Open authorized gate operations
              </Link>
            )}
            {(model.audience === 'WAREHOUSE_OPERATOR' || model.audience === 'INTERNAL_ADMIN') && (
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-700"><CalendarDays className="h-4 w-4" aria-hidden="true" />Full dock grids remain a desktop/tablet presentation.</p>
            )}
          </section>

          <div className="mt-6">
            <AppointmentCards records={filteredRecords} showSupplier={showSupplier} heading={resultHeading} />
          </div>
        </>
      )}

      <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-labelledby="dashboard-boundary-title">
        <h2 id="dashboard-boundary-title" className="font-semibold text-gray-900">Demonstration boundaries</h2>
        <p className="mt-2 text-sm text-gray-600">Responsive web only. No native app, camera upload, QR/OCR, plate recognition, geofencing, ETA, network request, browser storage, backend, integration or hidden business action is used.</p>
      </section>
    </div>
  );
}
