import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CalendarClock, Pause, Play, Square } from 'lucide-react';
import { useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  canManageStandingAppointments,
  createSystemInspectionDefinition,
  generateStandingPreview,
  previewOccurrenceAction,
  standingFrequencies,
  standingScopeChoices,
  transitionStandingSeries,
  type OccurrencePreviewAction,
  type StandingOccurrence,
  type StandingSeriesDefinition,
  type StandingSeriesState,
} from './standingAppointmentDomain';

const weekdays = [
  [1, 'Monday'],
  [2, 'Tuesday'],
  [3, 'Wednesday'],
  [4, 'Thursday'],
  [5, 'Friday'],
  [6, 'Saturday'],
  [7, 'Sunday'],
] as const;

function initialDefinition(scopeKey: string): StandingSeriesDefinition {
  return {
    scopeKey,
    weekday: 1,
    time: '08:00',
    frequency: 'WEEKLY',
    startDate: '2026-08-10',
    terminationMode: 'COUNT',
    endDate: '',
    occurrenceCount: 4,
  };
}

function OccurrenceCard({
  occurrence,
  canManage,
  seriesState,
  onAction,
  onReset,
}: {
  occurrence: StandingOccurrence;
  canManage: boolean;
  seriesState: StandingSeriesState;
  onAction: (action: OccurrencePreviewAction) => void;
  onReset: () => void;
}) {
  const controlsDisabled = !canManage || seriesState === 'ENDED';
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Occurrence {occurrence.index}</p>
          <h3 className="mt-1 font-semibold text-gray-900">{occurrence.date} · {occurrence.time}</h3>
          <p className="mt-1 text-sm text-gray-600">Original: {occurrence.originalDate} · {occurrence.originalTime}</p>
        </div>
        <span className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700">{occurrence.status}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded border px-2 py-1 ${occurrence.conflictStatus === 'VISIBLE_APPOINTMENT_CONFLICT' ? 'border-red-300 bg-red-50 text-red-900' : 'border-green-300 bg-green-50 text-green-900'}`}>{occurrence.conflictStatus}</span>
        <span className="rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800">{occurrence.capacityStatus}</span>
        <span className="rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800">{occurrence.approvalStatus}</span>
        <span className="rounded border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800">{occurrence.holdStatus}</span>
      </div>
      {canManage && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          <button type="button" disabled={controlsDisabled} onClick={() => onAction('CANCEL')} className="rounded-md border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50">Preview cancel occurrence</button>
          <button type="button" disabled={controlsDisabled} onClick={() => onAction('RESCHEDULE_NEXT_DAY')} className="rounded-md border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50">Preview reschedule +1 day</button>
          <button type="button" disabled={controlsDisabled} onClick={() => onAction('EDIT_TIME_PLUS_15')} className="rounded-md border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50">Preview edit time +15 minutes</button>
          <button type="button" disabled={controlsDisabled} onClick={onReset} className="rounded-md border border-[#023466] px-3 py-2 text-sm font-semibold text-[#023466] disabled:opacity-50">Reset occurrence preview</button>
        </div>
      )}
    </li>
  );
}

export function StandingAppointmentsPage() {
  const { activeActor } = useDemoDomain();
  const { visibleRecords } = useAppointmentWorkspace();
  const choices = useMemo(
    () => standingScopeChoices(visibleRecords, activeActor),
    [activeActor, visibleRecords],
  );
  const canManage = canManageStandingAppointments(activeActor.role);
  const [eligibleScopeKeys, setEligibleScopeKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [definition, setDefinition] = useState<StandingSeriesDefinition>(() =>
    initialDefinition(choices[0]?.key ?? ''));
  const [preview, setPreview] = useState<ReturnType<typeof generateStandingPreview>['preview']>(null);
  const [overrides, setOverrides] = useState<ReadonlyMap<string, StandingOccurrence>>(() => new Map());
  const [seriesState, setSeriesState] = useState<StandingSeriesState>('ACTIVE');
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const inspection = useMemo(() => {
    if (activeActor.role !== 'System Administrator') return null;
    const fixed = createSystemInspectionDefinition(choices, visibleRecords);
    return fixed
      ? generateStandingPreview(fixed, choices, new Set(), visibleRecords, false).preview
      : null;
  }, [activeActor.role, choices, visibleRecords]);
  const activePreview = activeActor.role === 'System Administrator' ? inspection : preview;
  const displayedOccurrences = activePreview?.occurrences.map((occurrence) =>
    overrides.get(occurrence.id) ?? occurrence) ?? [];

  const toggleEligibility = (scopeKey: string) => {
    setEligibleScopeKeys((current) => {
      const next = new Set(current);
      if (next.has(scopeKey)) next.delete(scopeKey);
      else next.add(scopeKey);
      return next;
    });
    setPreview(null);
    setOverrides(new Map());
    setSeriesState('ACTIVE');
    setErrors([]);
    setMessage('Standing-series eligibility changed in local memory only. Supplier configuration was not updated.');
  };

  const createPreview = () => {
    const result = generateStandingPreview(
      definition,
      choices,
      eligibleScopeKeys,
      visibleRecords,
    );
    setErrors(result.errors);
    setPreview(result.preview);
    setOverrides(new Map());
    setSeriesState('ACTIVE');
    setMessage(result.preview
      ? 'Standing series was generated as a local preview only. No appointment or capacity hold was created.'
      : null);
  };

  const updateOccurrence = (occurrence: StandingOccurrence, action: OccurrencePreviewAction) => {
    if (!activePreview) return;
    const changed = previewOccurrenceAction(
      occurrence,
      action,
      visibleRecords,
      activePreview.choice.warehouseId,
    );
    setOverrides((current) => new Map(current).set(occurrence.id, changed));
    setMessage('One occurrence preview changed locally. All other occurrences and source appointments remain unchanged.');
  };

  const resetOccurrence = (id: string) => {
    setOverrides((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
    setMessage('The occurrence returned to its generated local preview state.');
  };

  const updateSeriesState = (action: 'PAUSE' | 'RESUME' | 'END') => {
    const result = transitionStandingSeries(seriesState, action);
    setSeriesState(result.state);
    setMessage(result.error ?? `Series preview state changed locally to ${result.state}. No appointment was changed.`);
  };

  return (
    <div className="mx-auto max-w-7xl" aria-labelledby="standing-title">
      <header className="mb-6">
        <Link to="/appointments" className="text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">← Back to appointments</Link>
        <p className="mt-4 text-sm font-medium text-[#023466]">Local recurrence demonstration</p>
        <h1 id="standing-title" className="mt-1 flex items-center gap-2 text-2xl font-semibold text-gray-900"><CalendarClock className="h-6 w-6" aria-hidden="true" />Standing appointment series</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">Every occurrence is an independent preview. No capacity, hold, appointment, recurrence job or notification is created.</p>
      </header>

      {message && <p role="status" className="mb-5 rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800">{message}</p>}

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="eligibility-title">
        <h2 id="eligibility-title" className="font-semibold text-gray-900">Scoped standing eligibility</h2>
        <p className="mt-1 text-sm text-gray-600">Active actor: {activeActor.role} · {activeActor.userId}</p>
        {activeActor.role === 'System Administrator' && <p className="mt-2 text-sm font-semibold text-amber-800">Inspection only. Eligibility decisions belong to Warehouse Administrator or Supplier Administrator.</p>}
        {choices.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No Supplier and warehouse pair is visible in the active scope.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2" aria-label="Scoped standing eligibility choices">
            {choices.map((choice) => (
              <li key={choice.key} className="rounded-md border border-gray-200 p-3">
                <p className="font-semibold text-gray-900">{choice.supplierName}</p>
                <p className="mt-1 text-sm text-gray-600">{choice.warehouseName}</p>
                <label className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input type="checkbox" aria-label={`Standing eligible ${choice.supplierName} at ${choice.warehouseName}`} checked={eligibleScopeKeys.has(choice.key)} disabled={!canManage} onChange={() => toggleEligibility(choice.key)} />
                  {eligibleScopeKeys.has(choice.key) ? 'Locally eligible' : 'Not locally eligible'}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManage && (
        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" aria-labelledby="definition-title">
          <h2 id="definition-title" className="font-semibold text-gray-900">Series definition</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-gray-700 xl:col-span-2">Supplier and warehouse<select aria-label="Standing scope" value={definition.scopeKey} onChange={(event) => setDefinition((current) => ({ ...current, scopeKey: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Select scoped pair</option>{choices.map((choice) => <option key={choice.key} value={choice.key}>{choice.supplierName} · {choice.warehouseName}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700">Weekday<select aria-label="Standing weekday" value={definition.weekday} onChange={(event) => setDefinition((current) => ({ ...current, weekday: Number(event.target.value) }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700">Time<input aria-label="Standing time" type="time" value={definition.time} onChange={(event) => setDefinition((current) => ({ ...current, time: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-gray-700">Frequency<select aria-label="Standing frequency" value={definition.frequency} onChange={(event) => setDefinition((current) => ({ ...current, frequency: event.target.value as StandingSeriesDefinition['frequency'] }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">{standingFrequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700">Start date<input aria-label="Standing start date" type="date" value={definition.startDate} onChange={(event) => setDefinition((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-gray-700">Termination rule<select aria-label="Standing termination rule" value={definition.terminationMode} onChange={(event) => setDefinition((current) => ({ ...current, terminationMode: event.target.value as StandingSeriesDefinition['terminationMode'] }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="COUNT">Occurrence count</option><option value="END_DATE">Inclusive end date</option></select></label>
            {definition.terminationMode === 'COUNT' ? <label className="text-sm font-medium text-gray-700">Occurrence count<input aria-label="Standing occurrence count" type="number" min="1" max="26" value={definition.occurrenceCount} onChange={(event) => setDefinition((current) => ({ ...current, occurrenceCount: Number(event.target.value) }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label> : <label className="text-sm font-medium text-gray-700">Inclusive end date<input aria-label="Standing end date" type="date" value={definition.endDate} onChange={(event) => setDefinition((current) => ({ ...current, endDate: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>}
          </div>
          {errors.length > 0 && <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"><p className="font-semibold">Series preview is blocked.</p><ul className="mt-1 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
          <button type="button" onClick={createPreview} className="mt-4 rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">Create local series preview</button>
        </section>
      )}

      {activePreview && (
        <section className="mt-6" aria-labelledby="preview-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="preview-title" className="text-xl font-semibold text-gray-900">Occurrence preview</h2><p className="mt-1 text-sm text-gray-600">{activePreview.choice.supplierName} · {activePreview.choice.warehouseName} · Series state: <strong>{seriesState}</strong></p></div>
            {canManage && <div className="flex flex-wrap gap-2"><button type="button" disabled={seriesState !== 'ACTIVE'} onClick={() => updateSeriesState('PAUSE')} className="inline-flex items-center gap-2 rounded-md border border-gray-400 px-3 py-2 text-sm font-semibold disabled:opacity-50"><Pause className="h-4 w-4" aria-hidden="true" />Pause preview</button><button type="button" disabled={seriesState !== 'PAUSED'} onClick={() => updateSeriesState('RESUME')} className="inline-flex items-center gap-2 rounded-md border border-gray-400 px-3 py-2 text-sm font-semibold disabled:opacity-50"><Play className="h-4 w-4" aria-hidden="true" />Resume preview</button><button type="button" disabled={seriesState === 'ENDED'} onClick={() => updateSeriesState('END')} className="inline-flex items-center gap-2 rounded-md border border-red-400 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"><Square className="h-4 w-4" aria-hidden="true" />End preview</button></div>}
          </div>
          <ul className="grid gap-4 md:grid-cols-2" aria-label="Standing appointment occurrences">{displayedOccurrences.map((occurrence) => <OccurrenceCard key={occurrence.id} occurrence={occurrence} canManage={canManage} seriesState={seriesState} onAction={(action) => updateOccurrence(occurrence, action)} onReset={() => resetOccurrence(occurrence.id)} />)}</ul>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-labelledby="standing-boundary-title"><h2 id="standing-boundary-title" className="font-semibold text-gray-900">Demonstration boundaries</h2><p className="mt-2 text-sm text-gray-600">No timer, recurrence scheduler, background task, capacity reservation, real hold, network request, browser storage, backend, persistence, integration or source appointment mutation is used.</p></section>
    </div>
  );
}
