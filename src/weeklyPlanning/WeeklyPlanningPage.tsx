import React, { useMemo, useState } from 'react';
import { planningAppointments, type PlanningAppointment } from '../calendar/planningCalendar';
import { buildFridayImportPreview, createFridayImportTargets, fridayImportHeaders } from '../import/fridayImport';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  getAuthorizedWeeklyPlanningWarehouseIds,
  getWeeklyPlanningWarehouseUniverse,
} from './WeeklyPlanningGuard';
import {
  attachExactDetails,
  createWeeklyPlanningState,
  resolveAmbiguousTarget,
  resolveTransportConflictKeepingSupplierValues,
  scheduleUnreservedDelivery,
  type WeeklyPlanningState,
} from './weeklyPlanning';

const row = (values: readonly string[]) => values.join(',');
const ambiguousAppointments: readonly PlanningAppointment[] = [
  ...planningAppointments,
  { ...planningAppointments[0], id: 'planning-ambiguous-a', purchaseOrderNumber: 'PO-AMBIG-1' },
  { ...planningAppointments[0], id: 'planning-ambiguous-b', purchaseOrderNumber: 'PO-AMBIG-1' },
];
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
  row([
    'nowy-kisielin-distribution-center', 'northstar-packaging', 'PO-AMBIG-1', '2026-W33', '1',
    'SKU-N-3', 'Ambiguous detail', '80', '1', 'EURO_PALLET', 'DRY_GOODS', 'Standard', 'TR-100', 'TRL-200',
  ]),
  row([
    'nowy-kisielin-distribution-center', 'vistula-materials', 'PO-DEMO-3001', '2026-W33', '1',
    'SKU-N-4', 'Transport conflict detail', '60', '1', 'EURO_PALLET', 'PACKAGING', 'Fragile', 'IMPORTED-TR', 'IMPORTED-CONT',
  ]),
].join('\n');

function initialState(): WeeklyPlanningState {
  const preview = buildFridayImportPreview({
    fileName: 'friday-weekly-planning.csv',
    size: demoCsv.length,
    text: demoCsv,
    targets: createFridayImportTargets(ambiguousAppointments),
  });
  return createWeeklyPlanningState(ambiguousAppointments, preview.groups);
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
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const visibleQueue = state.queue.filter((item) =>
    authorizedWarehouseIds.includes(item.group.identity.warehouseCode.toLowerCase() as typeof authorizedWarehouseIds[number]));

  const conflictAuthorized = (warehouseCode: string) => canPerformWorkflowAction({
    step: 'ADMIN_RESOLVE_PLANNING_CONFLICT',
    capability: 'RESOLVE_PLANNING_CONFLICT',
    scope: { warehouseId: warehouseCode.toLowerCase() as typeof authorizedWarehouseIds[number] },
  });

  const applyExact = (fingerprint: string, warehouseCode: string) => {
    const result = attachExactDetails(state, fingerprint, activeActor.userId, reason, conflictAuthorized(warehouseCode));
    setState(result.state);
    setMessage(result.error ?? 'SKU details attached locally. Slot, booking origin, transport and lifecycle status were preserved.');
  };

  const resolveAmbiguous = (fingerprint: string, warehouseCode: string, candidates: readonly string[]) => {
    const selected = selectedTargets[fingerprint] ?? candidates[0] ?? '';
    const result = resolveAmbiguousTarget(
      state,
      fingerprint,
      selected,
      activeActor.userId,
      reason,
      conflictAuthorized(warehouseCode),
    );
    setState(result.state);
    setMessage(result.error ?? `Exact target ${selected} selected locally. No SKU details were attached automatically.`);
  };

  const keepSupplierTransport = (fingerprint: string, warehouseCode: string) => {
    const result = resolveTransportConflictKeepingSupplierValues(
      state,
      fingerprint,
      activeActor.userId,
      reason,
      conflictAuthorized(warehouseCode),
    );
    setState(result.state);
    setMessage(result.error ?? 'Supplier transport values were retained. Imported transport was not applied; SKU enrichment is now separately available.');
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
                {item.group.diagnostics.map((diagnostic, index) => <li key={`${diagnostic}-${index}`}>{diagnostic}</li>)}
              </ul>
            )}

            {item.state === 'AMBIGUOUS' && (
              <div className="mt-4 rounded-md border border-gray-300 p-4">
                <p className="text-sm font-semibold text-gray-900">Exact candidates</p>
                <label className="mt-2 block text-sm text-gray-700">
                  Select exact target for {item.group.identity.purchaseOrderNumber}
                  <select
                    aria-label={`Exact target for ${item.group.identity.purchaseOrderNumber}`}
                    value={selectedTargets[item.group.fingerprint] ?? item.group.matchedAppointmentIds[0] ?? ''}
                    onChange={(event) => setSelectedTargets((current) => ({ ...current, [item.group.fingerprint]: event.target.value }))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    {item.group.matchedAppointmentIds.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => resolveAmbiguous(item.group.fingerprint, item.group.identity.warehouseCode, item.group.matchedAppointmentIds)} className="mt-3 rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                  Confirm exact target
                </button>
              </div>
            )}

            {item.state === 'TRANSPORT_CONFLICT' && (
              <div className="mt-4 rounded-md border border-gray-300 p-4">
                <p className="text-sm font-semibold text-gray-900">Transport differences</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                  {item.group.transportConflicts.map((conflict) => (
                    <li key={conflict.field}>{conflict.field}: Supplier {conflict.existingValue}; imported {conflict.importedValue}</li>
                  ))}
                </ul>
                <button type="button" onClick={() => keepSupplierTransport(item.group.fingerprint, item.group.identity.warehouseCode)} className="mt-3 rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                  Keep Supplier transport values
                </button>
              </div>
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
          <ol className="mt-3 space-y-3 text-sm text-gray-700">
            {state.history.map((entry) => (
              <li key={entry.id} className="rounded-md border border-gray-200 p-3">
                <p className="font-semibold">{entry.action} · {entry.targetAppointmentId} · {entry.reason}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Before and after evidence</summary>
                  <p className="mt-2 font-semibold">Before</p>
                  <pre className="mt-1 overflow-auto whitespace-pre-wrap text-xs">{entry.before}</pre>
                  <p className="mt-2 font-semibold">After</p>
                  <pre className="mt-1 overflow-auto whitespace-pre-wrap text-xs">{entry.after}</pre>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
