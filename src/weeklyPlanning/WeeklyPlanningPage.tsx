import React, { useMemo, useState } from 'react';
import { planningAppointments } from '../calendar/planningCalendar';
import { buildFridayImportPreview, createFridayImportTargets, fridayImportHeaders } from '../import/fridayImport';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  getAuthorizedWeeklyPlanningWarehouseIds,
  getWeeklyPlanningWarehouseUniverse,
} from './WeeklyPlanningGuard';
import {
  attachExactDetails,
  createWeeklyPlanningState,
  scheduleUnreservedDelivery,
  type WeeklyPlanningState,
} from './weeklyPlanning';

const row = (values: readonly string[]) => values.join(',');
const demoCsv = [
  fridayImportHeaders.join(','),
  row([
    'nowy-kisielin-distribution-center', 'northstar-packaging', 'PO-DEMO-1001', '2026-W33', '1',
    'SKU-N-1', 'Northstar detail', '240', '2', 'EURO_PALLET', 'DRY_GOODS', 'Keep dry', 'TR-100', 'TRL-200',
  ]),
  row([
    'nowy-kisielin-distribution-center', 'northstar-packaging', 'PO-UNMATCHED-77', '2026-W33', '1',
    'SKU-N-2', 'Unmatched detail', '100', '1', 'EURO_PALLET', 'DRY_GOODS', 'Standard', 'TR-777', 'TRL-778',
  ]),
].join('\n');

function initialState(): WeeklyPlanningState {
  const preview = buildFridayImportPreview({
    fileName: 'friday-weekly-planning.csv',
    size: demoCsv.length,
    text: demoCsv,
    targets: createFridayImportTargets(planningAppointments),
  });
  return createWeeklyPlanningState(planningAppointments, preview.groups);
}

export function WeeklyPlanningPage() {
  const {
    activeActor,
    configuration,
    canAccessWorkflowRoute,
    canPerformWorkflowAction,
  } = useDemoDomain();
  const authorizedWarehouseIds = useMemo(() => {
    const universe = getWeeklyPlanningWarehouseUniverse(
      activeActor.role,
      activeActor.warehouseIds,
      configuration.warehouses
        .filter((warehouse) => warehouse.status === 'published')
        .map((warehouse) => warehouse.id),
    );
    return getAuthorizedWeeklyPlanningWarehouseIds(universe, canAccessWorkflowRoute);
  }, [activeActor.role, activeActor.warehouseIds, configuration.warehouses, canAccessWorkflowRoute]);
  const [state, setState] = useState(initialState);
  const [reason, setReason] = useState('Reviewed local planning evidence');
  const [plannedDate, setPlannedDate] = useState('2026-08-13');
  const [plannedTime, setPlannedTime] = useState('09:00');
  const [message, setMessage] = useState<string | null>(null);

  const visibleQueue = state.queue.filter((item) =>
    authorizedWarehouseIds.includes(item.group.identity.warehouseCode.toLowerCase() as typeof authorizedWarehouseIds[number]));

  const applyExact = (fingerprint: string, warehouseCode: string) => {
    const authorized = canPerformWorkflowAction({
      step: 'ADMIN_RESOLVE_PLANNING_CONFLICT',
      capability: 'RESOLVE_PLANNING_CONFLICT',
      scope: { warehouseId: warehouseCode.toLowerCase() as typeof authorizedWarehouseIds[number] },
    });
    const result = attachExactDetails(state, fingerprint, activeActor.userId, reason, authorized);
    setState(result.state);
    setMessage(result.error ?? 'SKU details attached locally. Slot, booking origin, transport and lifecycle status were preserved.');
  };

  const schedule = (fingerprint: string, warehouseCode: string) => {
    const authorized = canPerformWorkflowAction({
      step: 'ADMIN_SCHEDULE_UNRESERVED',
      capability: 'SCHEDULE_UNRESERVED_DELIVERY',
      scope: { warehouseId: warehouseCode.toLowerCase() as typeof authorizedWarehouseIds[number] },
    });
    const result = scheduleUnreservedDelivery(
      state,
      fingerprint,
      activeActor.userId,
      reason,
      authorized,
      plannedDate,
      plannedTime,
      configuration.warehouses,
    );
    setState(result.state);
    setMessage(result.error ?? 'One local ADMIN_ADDED PO header was scheduled without lifecycle or integration effects.');
  };

  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="weekly-planning-title">
      <header className="mb-6">
        <p className="text-sm font-medium text-[#023466]">Administrator workflow · local memory only</p>
        <h1 id="weekly-planning-title" className="mt-1 text-2xl font-semibold text-gray-900">Weekly planning queue</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Exact enrichment and unmatched scheduling require explicit actions. No slot, Supplier transport value,
          appointment lifecycle status or external system is changed silently.
        </p>
      </header>

      <div className="mb-6 grid gap-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 md:grid-cols-3">
        <label className="text-sm font-semibold text-gray-800">
          Resolution reason
          <input aria-label="Resolution reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Planned date
          <input aria-label="Planned date" type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Planned time
          <input aria-label="Planned time" type="time" value={plannedTime} onChange={(event) => setPlannedTime(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
      </div>

      {message && <p role="status" tabIndex={-1} className="mb-5 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800">{message}</p>}

      <div className="space-y-4">
        {visibleQueue.map((item) => (
          <article key={item.group.fingerprint} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{item.group.identity.purchaseOrderNumber}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {item.group.identity.warehouseCode} · {item.group.identity.supplierCode} · {item.group.identity.deliveryWeek}
                </p>
              </div>
              <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold">{item.state}</span>
            </div>
            <p className="mt-3 text-sm text-gray-700">{item.group.lines.length} SKU line(s). Planning status is independent of appointment lifecycle.</p>
            {item.group.diagnostics.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {item.group.diagnostics.map((diagnostic) => <li key={diagnostic}>{diagnostic}</li>)}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {item.state === 'EXACT_READY' && !item.appliedAppointmentId && (
                <button type="button" onClick={() => applyExact(item.group.fingerprint, item.group.identity.warehouseCode)} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                  Attach exact SKU details
                </button>
              )}
              {item.state === 'UNSCHEDULED' && !item.appliedAppointmentId && (
                <button type="button" onClick={() => schedule(item.group.fingerprint, item.group.identity.warehouseCode)} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                  Schedule unreserved delivery
                </button>
              )}
              {item.appliedAppointmentId && <span className="text-sm font-semibold text-gray-700">Local result: {item.appliedAppointmentId}</span>}
            </div>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200" aria-labelledby="planning-history-title">
        <h2 id="planning-history-title" className="font-semibold text-gray-900">Immutable local history evidence</h2>
        {state.history.length === 0 ? <p className="mt-2 text-sm text-gray-600">No planning action has been applied.</p> : (
          <ol className="mt-3 space-y-2 text-sm text-gray-700">
            {state.history.map((entry) => <li key={entry.id}>{entry.action} · {entry.targetAppointmentId} · {entry.reason}</li>)}
          </ol>
        )}
      </section>
    </section>
  );
}
