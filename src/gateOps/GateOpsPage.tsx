import React, { useMemo, useState } from 'react';
import { planningAppointments } from '../calendar/planningCalendar';
import type { DockId } from '../demoDomain/configuration';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { SupplierOrganizationId, WarehouseId } from '../demoDomain/demoDomain';
import {
  addGateNote,
  assignDock,
  changeDock,
  checkInAppointment,
  checkOutAppointment,
  confirmNoShow,
  correctGateRegistration,
  createGateOpsState,
  createUnannouncedVisit,
  gateSafeAppointments,
  isPotentialNoShow,
  operatorAppointmentCreationBoundary,
  progressOperation,
  routedActions,
  searchGateAppointments,
  type GateActionResult,
  type GateAppointment,
  type GateAppointmentSeed,
  type GateOpsState,
} from './gateOps';
import { getAuthorizedGateWarehouseIds } from './GateOpsGuard';

export const gateOpsAppointmentSeeds: readonly GateAppointmentSeed[] = planningAppointments.map((appointment) => ({
  ...appointment,
  appointmentStatus: 'CONFIRMED',
  changeStatus: 'NO_CHANGE_REQUEST',
  operationalStatus: 'EXPECTED',
  flow: 'Material Delivery',
  isAdr: appointment.id === 'planning-northstar-1001',
}));

function requestFor(
  appointment: GateAppointment,
  action: keyof typeof routedActions,
) {
  return {
    ...routedActions[action],
    scope: { warehouseId: appointment.warehouseId },
  };
}

export function GateOpsPage({
  initialSeeds = gateOpsAppointmentSeeds,
}: {
  initialSeeds?: readonly GateAppointmentSeed[];
}) {
  const {
    activeActor,
    configuration,
    resolveWorkflow,
    canPerformWorkflowAction,
  } = useDemoDomain();
  const [state, setState] = useState<GateOpsState>(() => createGateOpsState(initialSeeds));
  const [query, setQuery] = useState('');
  const [referenceDate, setReferenceDate] = useState('2026-08-10');
  const [referenceAt, setReferenceAt] = useState('2026-08-11T12:00');
  const [arrivalAt, setArrivalAt] = useState('2026-08-10T08:00');
  const [driverIdentification, setDriverIdentification] = useState('Driver ID DEMO-1');
  const [gateTractorRegistration, setGateTractorRegistration] = useState('TR-100');
  const [gateTrailerRegistration, setGateTrailerRegistration] = useState('TRL-200');
  const [reason, setReason] = useState('Verified local gate evidence');
  const [selectedDockId, setSelectedDockId] = useState('');
  const [gateNote, setGateNote] = useState('Gate observation recorded locally');
  const [unannouncedSupplierId, setUnannouncedSupplierId] = useState<SupplierOrganizationId>('northstar-packaging');
  const [unannouncedPo, setUnannouncedPo] = useState('PO-UNANNOUNCED-1');
  const [unannouncedWarehouseId, setUnannouncedWarehouseId] = useState<WarehouseId>(
    activeActor.warehouseIds[0] ?? 'nowy-kisielin-distribution-center',
  );
  const [message, setMessage] = useState<string | null>(null);

  const authorizedWarehouseIds = useMemo(() => getAuthorizedGateWarehouseIds(
    activeActor.userId,
    activeActor.warehouseIds,
    resolveWorkflow,
  ), [activeActor.userId, activeActor.warehouseIds, resolveWorkflow]);

  const visibleAppointments = useMemo(() => {
    const safe = gateSafeAppointments(state, activeActor, referenceDate)
      .filter((appointment) => authorizedWarehouseIds.includes(appointment.warehouseId));
    if (!query.trim()) return safe;
    const exactIds = new Set(searchGateAppointments(state, activeActor, referenceDate, query)
      .map((appointment) => appointment.id));
    return safe.filter((appointment) => exactIds.has(appointment.id));
  }, [activeActor, authorizedWarehouseIds, query, referenceDate, state]);

  const apply = (result: GateActionResult, successMessage: string) => {
    setState(result.state);
    setMessage(result.error ?? successMessage);
  };

  const performCheckIn = (appointment: GateAppointment) => {
    const request = requestFor(appointment, 'checkIn');
    apply(
      checkInAppointment(
        state,
        appointment.id,
        activeActor.userId,
        resolveWorkflow(request),
        driverIdentification,
        gateTractorRegistration,
        gateTrailerRegistration,
        arrivalAt,
        reason,
      ),
      'Check-in recorded locally. Lifecycle, slot and Supplier-origin registrations were preserved.',
    );
  };

  const performDockAction = (appointment: GateAppointment, change: boolean) => {
    const action = change ? 'changeDock' : 'assignDock';
    const request = requestFor(appointment, action);
    const dockId = selectedDockId as DockId;
    apply(
      change
        ? changeDock(state, appointment.id, activeActor.userId, resolveWorkflow(request), dockId, reason, configuration)
        : assignDock(state, appointment.id, activeActor.userId, resolveWorkflow(request), dockId, reason, configuration),
      change
        ? 'Dock changed locally with before/after evidence and no automatic status transition.'
        : 'Dock assigned locally with before/after evidence and no automatic status transition.',
    );
  };

  const progress = (
    appointment: GateAppointment,
    target: 'WAITING_FOR_DOCK' | 'AT_DOCK' | 'UNLOADING' | 'COMPLETED',
  ) => {
    const request = requestFor(appointment, 'progress');
    apply(
      progressOperation(
        state,
        appointment.id,
        activeActor.userId,
        resolveWorkflow(request),
        target,
        reason,
      ),
      `Operational status progressed locally to ${target}. Lifecycle state was not changed.`,
    );
  };

  const performCheckOut = (appointment: GateAppointment) => {
    const request = requestFor(appointment, 'checkOut');
    apply(
      checkOutAppointment(
        state,
        appointment.id,
        activeActor.userId,
        resolveWorkflow(request),
        reason,
      ),
      'Check-out recorded locally after completion.',
    );
  };

  const performNoShow = (appointment: GateAppointment) => {
    const request = requestFor(appointment, 'noShow');
    apply(
      confirmNoShow(
        state,
        appointment.id,
        activeActor.userId,
        resolveWorkflow(request),
        reason,
        referenceAt,
        configuration,
      ),
      'No Show confirmed by the routed human actor. The record remains visible and projected capacity was released.',
    );
  };

  const correctRegistration = (appointment: GateAppointment) => {
    apply(
      correctGateRegistration(
        state,
        appointment.id,
        activeActor,
        gateTractorRegistration,
        gateTrailerRegistration,
        reason,
      ),
      'Gate-observed registration evidence was corrected. Supplier-origin values remain immutable.',
    );
  };

  const addNote = (appointment: GateAppointment) => {
    apply(
      addGateNote(state, appointment.id, activeActor, gateNote),
      'Internal gate note added locally.',
    );
  };

  const addUnannounced = () => {
    apply(
      createUnannouncedVisit(
        state,
        activeActor,
        {
          warehouseId: unannouncedWarehouseId,
          supplierOrganizationId: unannouncedSupplierId,
          purchaseOrderNumber: unannouncedPo,
          tractorRegistration: gateTractorRegistration,
          trailerOrContainerRegistration: gateTrailerRegistration,
          driverIdentification,
          reason,
        },
        configuration,
      ),
      'Unannounced visit recorded as PENDING_DECISION with no slot, dock, capacity or lifecycle status.',
    );
  };

  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="gate-ops-title">
      <header className="mb-6">
        <p className="text-sm font-medium text-[#023466]">Gate and warehouse operations · local memory only</p>
        <h1 id="gate-ops-title" className="mt-1 text-2xl font-semibold text-gray-900">Gate operations</h1>
        <p className="mt-2 max-w-4xl text-sm text-gray-600">
          Search, arrival, dock and operational evidence are demonstrational. No lifecycle approval, cancellation,
          persistence, notification, gate hardware, OCR or integration action occurs.
        </p>
      </header>

      <div className="mb-6 grid gap-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 md:grid-cols-3">
        <label className="text-sm font-semibold text-gray-800">
          Exact gate search
          <input aria-label="Exact gate search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Security workweek reference
          <input aria-label="Security workweek reference" type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Operational reference time
          <input aria-label="Operational reference time" type="datetime-local" value={referenceAt} onChange={(event) => setReferenceAt(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Arrival timestamp
          <input aria-label="Arrival timestamp" type="datetime-local" value={arrivalAt} onChange={(event) => setArrivalAt(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Driver identification
          <input aria-label="Driver identification" value={driverIdentification} onChange={(event) => setDriverIdentification(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Action reason
          <input aria-label="Action reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Gate tractor registration
          <input aria-label="Gate tractor registration" value={gateTractorRegistration} onChange={(event) => setGateTractorRegistration(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Gate trailer or container registration
          <input aria-label="Gate trailer or container registration" value={gateTrailerRegistration} onChange={(event) => setGateTrailerRegistration(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Explicit dock
          <select aria-label="Explicit dock" value={selectedDockId} onChange={(event) => setSelectedDockId(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal">
            <option value="">Select a dock</option>
            {configuration.warehouses
              .filter((warehouse) => authorizedWarehouseIds.includes(warehouse.id))
              .flatMap((warehouse) => warehouse.docks.map((dock) => (
                <option key={dock.id} value={dock.id}>{warehouse.displayName} · {dock.name} · {dock.active ? 'Active' : 'Inactive'}</option>
              )))}
          </select>
        </label>
      </div>

      {message && <p role="status" tabIndex={-1} className="mb-5 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800">{message}</p>}
      <p aria-live="polite" className="mb-4 text-sm font-semibold text-gray-700">Search result count: {visibleAppointments.length}</p>

      <div className="space-y-4">
        {visibleAppointments.map((appointment) => {
          const checkInRequest = requestFor(appointment, 'checkIn');
          const checkOutRequest = requestFor(appointment, 'checkOut');
          const assignRequest = requestFor(appointment, 'assignDock');
          const changeRequest = requestFor(appointment, 'changeDock');
          const progressRequest = requestFor(appointment, 'progress');
          const noShowRequest = requestFor(appointment, 'noShow');
          const checkInDecision = resolveWorkflow(checkInRequest);
          const checkOutDecision = resolveWorkflow(checkOutRequest);
          const progressDecision = resolveWorkflow(progressRequest);
          const canCheckIn = canPerformWorkflowAction(checkInRequest);
          const canCheckOut = canPerformWorkflowAction(checkOutRequest);
          const canAssignDock = canPerformWorkflowAction(assignRequest);
          const canChangeDock = canPerformWorkflowAction(changeRequest);
          const canProgress = canPerformWorkflowAction(progressRequest);
          const canConfirmNoShow = canPerformWorkflowAction(noShowRequest)
            && isPotentialNoShow(appointment, referenceAt, configuration);

          return (
            <article key={appointment.id} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{appointment.purchaseOrderNumber}</h2>
                  <p className="mt-1 text-sm text-gray-600">{appointment.id} · {appointment.supplierName} · {appointment.plannedDate} {appointment.plannedTime}</p>
                </div>
                <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold">Operational: {appointment.operationalStatus}</span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div><dt className="font-semibold text-gray-700">Lifecycle</dt><dd>{appointment.lifecycleStatus}</dd></div>
                <div><dt className="font-semibold text-gray-700">Planning readiness</dt><dd>{appointment.planningState}</dd></div>
                <div><dt className="font-semibold text-gray-700">Arrival</dt><dd>{appointment.arrivalClassification ?? 'Not checked in'}</dd></div>
                <div><dt className="font-semibold text-gray-700">Dock</dt><dd>{appointment.assignedDockId ?? 'Not assigned'}</dd></div>
                <div><dt className="font-semibold text-gray-700">Supplier tractor</dt><dd>{appointment.supplierTractorRegistration}</dd></div>
                <div><dt className="font-semibold text-gray-700">Gate tractor</dt><dd>{appointment.gateTractorRegistration}</dd></div>
                <div><dt className="font-semibold text-gray-700">Supplier trailer/container</dt><dd>{appointment.supplierTrailerOrContainerRegistration}</dd></div>
                <div><dt className="font-semibold text-gray-700">Gate trailer/container</dt><dd>{appointment.gateTrailerOrContainerRegistration}</dd></div>
              </dl>
              <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p><strong>Check-in route:</strong> {checkInDecision.outcome} · {checkInDecision.selectedActor?.fullName ?? 'no actor'}</p>
                <p><strong>Operation route:</strong> {progressDecision.outcome} · {progressDecision.selectedActor?.fullName ?? 'no actor'}</p>
                <p><strong>Check-out route:</strong> {checkOutDecision.outcome} · {checkOutDecision.selectedActor?.fullName ?? 'no actor'}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {appointment.operationalStatus === 'EXPECTED' && canCheckIn && <button type="button" onClick={() => performCheckIn(appointment)} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">Check in appointment</button>}
                {appointment.operationalStatus === 'CHECKED_IN' && canProgress && <button type="button" onClick={() => progress(appointment, 'WAITING_FOR_DOCK')} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466]">Move to waiting for dock</button>}
                {appointment.assignedDockId === null && canAssignDock && <button type="button" onClick={() => performDockAction(appointment, false)} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466]">Assign selected dock</button>}
                {appointment.assignedDockId !== null && canChangeDock && <button type="button" onClick={() => performDockAction(appointment, true)} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466]">Change to selected dock</button>}
                {(appointment.operationalStatus === 'CHECKED_IN' || appointment.operationalStatus === 'WAITING_FOR_DOCK') && canProgress && <button type="button" onClick={() => progress(appointment, 'AT_DOCK')} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466]">Move to assigned dock</button>}
                {appointment.operationalStatus === 'AT_DOCK' && canProgress && <button type="button" onClick={() => progress(appointment, 'UNLOADING')} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466]">Start unloading</button>}
                {appointment.operationalStatus === 'UNLOADING' && canProgress && <button type="button" onClick={() => progress(appointment, 'COMPLETED')} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466]">Complete operation</button>}
                {appointment.operationalStatus === 'COMPLETED' && canCheckOut && <button type="button" onClick={() => performCheckOut(appointment)} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">Check out appointment</button>}
                {canConfirmNoShow && <button type="button" onClick={() => performNoShow(appointment)} className="rounded-md border border-gray-500 px-4 py-2 text-sm font-semibold text-gray-800">Confirm No Show</button>}
                {activeActor.role === 'Security Officer' && <button type="button" onClick={() => correctRegistration(appointment)} className="rounded-md border border-gray-500 px-4 py-2 text-sm font-semibold text-gray-800">Correct gate registration</button>}
              </div>
              {activeActor.role === 'Security Officer' && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="min-w-64 flex-1 text-sm font-semibold text-gray-800">Gate note<input aria-label={`Gate note for ${appointment.purchaseOrderNumber}`} value={gateNote} onChange={(event) => setGateNote(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
                  <button type="button" onClick={() => addNote(appointment)} className="self-end rounded-md border border-gray-500 px-4 py-2 text-sm font-semibold text-gray-800">Add gate note</button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {activeActor.role === 'Security Officer' && (
        <section className="mt-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200" aria-labelledby="unannounced-title">
          <h2 id="unannounced-title" className="font-semibold text-gray-900">Unannounced visit pending decision</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-gray-800">Warehouse<select aria-label="Unannounced warehouse" value={unannouncedWarehouseId} onChange={(event) => setUnannouncedWarehouseId(event.target.value as WarehouseId)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal">{activeActor.warehouseIds.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
            <label className="text-sm font-semibold text-gray-800">Supplier<select aria-label="Unannounced Supplier" value={unannouncedSupplierId} onChange={(event) => setUnannouncedSupplierId(event.target.value as SupplierOrganizationId)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal">{configuration.suppliers.filter((supplier) => supplier.status === 'active' && supplier.warehouseIds.includes(unannouncedWarehouseId)).map((supplier) => <option key={supplier.organizationId} value={supplier.organizationId}>{supplier.organizationId}</option>)}</select></label>
            <label className="text-sm font-semibold text-gray-800">Purchase order number<input aria-label="Unannounced purchase order" value={unannouncedPo} onChange={(event) => setUnannouncedPo(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal" /></label>
          </div>
          <button type="button" onClick={addUnannounced} className="mt-4 rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">Create pending-decision visit</button>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">{state.unannouncedVisits.map((visit) => <li key={visit.id}>{visit.id} · {visit.purchaseOrderNumber} · {visit.state} · no slot/dock/capacity/lifecycle</li>)}</ul>
        </section>
      )}

      <section className="mt-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200" aria-labelledby="gate-history-title">
        <h2 id="gate-history-title" className="font-semibold text-gray-900">Immutable local gate history</h2>
        {state.history.length === 0 ? <p className="mt-2 text-sm text-gray-600">No gate action has been applied.</p> : <ol className="mt-3 space-y-2 text-sm text-gray-700">{state.history.map((entry) => <li key={entry.id}>{entry.sequence}. {entry.action} · {entry.appointmentId} · {entry.sourceOperationalStatus} → {entry.targetOperationalStatus} · {entry.routedOutcome} · {entry.reason}</li>)}</ol>}
      </section>

      <aside className="mt-6 rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-gray-700">
        <strong>Operator-created appointment boundary:</strong> {operatorAppointmentCreationBoundary()}
      </aside>
    </section>
  );
}
