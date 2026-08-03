import React, { useMemo, useState } from 'react';
import {
  planningAppointments,
  type PlanningAppointment,
} from '../calendar/planningCalendar';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  approveAppointment,
  cancelAppointment,
  createLifecycleState,
  evaluateSubmittedAppointment,
  rejectAppointment,
  requestAppointmentData,
  rescheduleAppointment,
  restoreCancelledAppointment,
  submitDraftAppointment,
  type LifecycleActionResult,
  type LifecycleAppointment,
  type LifecycleState,
} from './lifecycle';

const internalRoles = new Set([
  'System Administrator',
  'Warehouse Administrator',
  'Warehouse Operator',
]);

function routingRequest(
  appointment: LifecycleAppointment,
  kind: 'approve' | 'reject' | 'request-data',
) {
  if (kind === 'approve') {
    return {
      step: 'MANUAL_APPROVAL' as const,
      capability: 'APPROVE_APPOINTMENT' as const,
      scope: { warehouseId: appointment.warehouseId },
    };
  }
  if (kind === 'reject') {
    return {
      step: 'MANUAL_REJECTION' as const,
      capability: 'REJECT_APPOINTMENT' as const,
      scope: { warehouseId: appointment.warehouseId },
    };
  }
  return {
    step: 'REQUEST_APPOINTMENT_DATA' as const,
    capability: 'REQUEST_APPOINTMENT_DATA' as const,
    scope: { warehouseId: appointment.warehouseId },
  };
}

export function LifecyclePage({
  initialAppointments = planningAppointments,
}: {
  initialAppointments?: readonly PlanningAppointment[];
}) {
  const {
    activeActor,
    configuration,
    canViewAppointment,
    resolveWorkflow,
    canPerformWorkflowAction,
  } = useDemoDomain();
  const [state, setState] = useState<LifecycleState>(() =>
    createLifecycleState(initialAppointments));
  const [reason, setReason] = useState('Reviewed lifecycle evidence');
  const [plannedDate, setPlannedDate] = useState('2026-08-13');
  const [plannedTime, setPlannedTime] = useState('09:00');
  const [referenceDateTime, setReferenceDateTime] = useState('2026-08-09T12:00');
  const [message, setMessage] = useState<string | null>(null);

  const visibleAppointments = useMemo(() => state.appointments.filter((appointment) =>
    canViewAppointment(appointment)), [canViewAppointment, state.appointments]);
  const showRoutingEvidence = internalRoles.has(activeActor.role);

  const applyResult = (result: LifecycleActionResult, success: string) => {
    setState(result.state);
    setMessage(result.error ?? success);
  };

  const submit = (appointment: LifecycleAppointment) => {
    applyResult(
      submitDraftAppointment(state, appointment.id, activeActor, reason, configuration),
      'Draft submitted locally after slot and scope validation. No approval or gate action was inferred.',
    );
  };

  const evaluate = (appointment: LifecycleAppointment) => {
    const decision = resolveWorkflow(routingRequest(appointment, 'approve'));
    applyResult(
      evaluateSubmittedAppointment(
        state,
        appointment.id,
        activeActor,
        reason,
        configuration,
        decision,
      ),
      'Approval mode was evaluated locally. No notification, persistence or gate action occurred.',
    );
  };

  const approve = (appointment: LifecycleAppointment) => {
    const decision = resolveWorkflow(routingRequest(appointment, 'approve'));
    applyResult(
      approveAppointment(state, appointment.id, activeActor.userId, reason, decision),
      'Appointment approved locally. Planning and operational states were not changed.',
    );
  };

  const reject = (appointment: LifecycleAppointment) => {
    const decision = resolveWorkflow(routingRequest(appointment, 'reject'));
    applyResult(
      rejectAppointment(state, appointment.id, activeActor.userId, reason, decision),
      'Appointment rejected locally and removed from projected capacity without deletion.',
    );
  };

  const requestData = (appointment: LifecycleAppointment) => {
    const decision = resolveWorkflow(routingRequest(appointment, 'request-data'));
    applyResult(
      requestAppointmentData(state, appointment.id, activeActor.userId, reason, decision),
      'Supplier action is required. Lifecycle status and slot remain unchanged.',
    );
  };

  const reschedule = (appointment: LifecycleAppointment) => {
    applyResult(
      rescheduleAppointment(
        state,
        appointment.id,
        activeActor,
        reason,
        plannedDate,
        plannedTime,
        referenceDateTime,
        configuration,
      ),
      'Reschedule was applied or requested locally after cut-off evaluation. The old slot was preserved until validation succeeded.',
    );
  };

  const cancel = (appointment: LifecycleAppointment) => {
    applyResult(
      cancelAppointment(
        state,
        appointment.id,
        activeActor,
        reason,
        referenceDateTime,
        configuration,
      ),
      'Appointment cancelled locally. The visible record remains and projected capacity was released.',
    );
  };

  const restore = (appointment: LifecycleAppointment) => {
    applyResult(
      restoreCancelledAppointment(state, appointment.id, activeActor, reason, configuration),
      'Cancelled appointment restored locally after revalidating its original slot.',
    );
  };

  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="lifecycle-title">
      <header className="mb-6">
        <p className="text-sm font-medium text-[#023466]">Lifecycle consumer · demonstrational memory only</p>
        <h1 id="lifecycle-title" className="mt-1 text-2xl font-semibold text-gray-900">
          Appointment lifecycle
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-gray-600">
          Planning readiness, appointment lifecycle, requested changes and operational evidence remain independent.
          This page does not check in, check out, assign docks, send notifications or persist data.
        </p>
      </header>

      <div className="mb-6 grid gap-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 md:grid-cols-4">
        <label className="text-sm font-semibold text-gray-800">
          Action reason
          <input
            aria-label="Action reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Replacement date
          <input
            aria-label="Replacement date"
            type="date"
            value={plannedDate}
            onChange={(event) => setPlannedDate(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Replacement time
          <input
            aria-label="Replacement time"
            type="time"
            value={plannedTime}
            onChange={(event) => setPlannedTime(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Cut-off reference
          <input
            aria-label="Cut-off reference"
            type="datetime-local"
            value={referenceDateTime}
            onChange={(event) => setReferenceDateTime(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
      </div>

      {message && (
        <p role="status" tabIndex={-1} className="mb-5 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800">
          {message}
        </p>
      )}

      <div className="space-y-4">
        {visibleAppointments.map((appointment) => {
          const approveRequest = routingRequest(appointment, 'approve');
          const rejectRequest = routingRequest(appointment, 'reject');
          const requestDataRequest = routingRequest(appointment, 'request-data');
          const approveDecision = resolveWorkflow(approveRequest);
          const rejectDecision = resolveWorkflow(rejectRequest);
          const requestDataDecision = resolveWorkflow(requestDataRequest);
          const canApprove = canPerformWorkflowAction(approveRequest);
          const canReject = canPerformWorkflowAction(rejectRequest);
          const canRequestData = canPerformWorkflowAction(requestDataRequest);
          const supplierOwnsAppointment = Boolean(
            activeActor.supplierOrganizationId
            && activeActor.supplierOrganizationId === appointment.supplierOrganizationId,
          );
          const internalCanChange = activeActor.role === 'System Administrator'
            || (activeActor.role === 'Warehouse Administrator'
              && activeActor.warehouseIds.includes(appointment.warehouseId));
          const canChange = supplierOwnsAppointment || internalCanChange;

          return (
            <article key={appointment.id} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{appointment.purchaseOrderNumber}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {appointment.supplierName} · {appointment.warehouseId} · {appointment.plannedDate} {appointment.plannedTime}
                  </p>
                </div>
                <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold">
                  Lifecycle: {appointment.appointmentStatus}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
                <div><dt className="font-semibold text-gray-700">Planning readiness</dt><dd>{appointment.planningState}</dd></div>
                <div><dt className="font-semibold text-gray-700">Change state</dt><dd>{appointment.changeStatus}</dd></div>
                <div><dt className="font-semibold text-gray-700">Operational evidence</dt><dd>{appointment.operationalStatus}</dd></div>
                <div><dt className="font-semibold text-gray-700">Booking origin</dt><dd>{appointment.bookingOrigin}</dd></div>
                <div><dt className="font-semibold text-gray-700">Late cancellation</dt><dd>{appointment.lateCancellation ? 'Yes' : 'No'}</dd></div>
              </dl>

              {showRoutingEvidence && appointment.appointmentStatus === 'PENDING_APPROVAL' && (
                <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <p><strong>Approve route:</strong> {approveDecision.outcome} · {approveDecision.selectedActor?.fullName ?? 'no actor'}</p>
                  <p><strong>Reject route:</strong> {rejectDecision.outcome} · {rejectDecision.selectedActor?.fullName ?? 'no actor'}</p>
                  <p><strong>Request-data route:</strong> {requestDataDecision.outcome} · {requestDataDecision.selectedActor?.fullName ?? 'no actor'}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {appointment.appointmentStatus === 'DRAFT' && canChange && (
                  <button type="button" onClick={() => submit(appointment)} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                    Submit draft appointment
                  </button>
                )}
                {appointment.appointmentStatus === 'SUBMITTED'
                  && (activeActor.role === 'System Administrator' || activeActor.role === 'Warehouse Administrator') && (
                  <button type="button" onClick={() => evaluate(appointment)} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                    Evaluate approval mode
                  </button>
                )}
                {appointment.appointmentStatus === 'PENDING_APPROVAL' && canApprove && (
                  <button type="button" onClick={() => approve(appointment)} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                    Approve appointment
                  </button>
                )}
                {appointment.appointmentStatus === 'PENDING_APPROVAL' && canReject && (
                  <button type="button" onClick={() => reject(appointment)} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                    Reject appointment
                  </button>
                )}
                {appointment.appointmentStatus === 'PENDING_APPROVAL' && canRequestData && (
                  <button type="button" onClick={() => requestData(appointment)} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                    Request appointment data
                  </button>
                )}
                {canChange && ['SUBMITTED', 'PENDING_APPROVAL', 'CONFIRMED'].includes(appointment.appointmentStatus) && (
                  <>
                    <button type="button" onClick={() => reschedule(appointment)} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                      Reschedule appointment
                    </button>
                    <button type="button" onClick={() => cancel(appointment)} className="rounded-md border border-gray-500 px-4 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400">
                      Cancel appointment
                    </button>
                  </>
                )}
                {appointment.appointmentStatus === 'CANCELLED' && activeActor.role === 'System Administrator' && (
                  <button type="button" onClick={() => restore(appointment)} className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
                    Restore cancelled appointment
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200" aria-labelledby="lifecycle-history-title">
        <h2 id="lifecycle-history-title" className="font-semibold text-gray-900">Immutable local lifecycle history</h2>
        {state.history.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No lifecycle action has been applied.</p>
        ) : (
          <ol className="mt-3 space-y-2 text-sm text-gray-700">
            {state.history.map((entry) => (
              <li key={entry.id}>
                {entry.sequence}. {entry.action} · {entry.appointmentId} · {entry.sourceStatus} → {entry.targetStatus} · {entry.reason}
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
