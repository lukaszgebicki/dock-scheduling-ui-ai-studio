import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  buildNonWeeklySlotModel,
  configuredNonWeeklyFields,
  confirmNonWeeklyBooking,
  deriveNonWeeklyDurationMinutes,
  emptyNonWeeklyBookingInput,
  nonWeeklyBookingOptions,
  nonWeeklyBookingSteps,
  previewNonWeeklyApproval,
  validateDeliveryData,
  validateTransportDocuments,
  validateWarehouseFlow,
  type NonWeeklyBookingInput,
} from './nonWeeklyBookingDomain';

const stepLabels = [
  'Warehouse and flow',
  'Delivery data',
  'Available slots',
  'Transport, documents and comments',
  'Summary and confirmation',
] as const;

function initialInput(
  options: ReturnType<typeof nonWeeklyBookingOptions>,
): NonWeeklyBookingInput {
  const option = options[0];
  return {
    ...emptyNonWeeklyBookingInput,
    warehouseId: option?.warehouseId ?? '',
    flow: option?.flows[0] ?? '',
  };
}

function TextInput({
  id,
  label,
  value,
  onChange,
  required = false,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'number' | 'tel';
}) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-gray-800">
      {label}{required ? ' *' : ''}
      <input
        id={id}
        type={type}
        value={value}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
      />
    </label>
  );
}

export function NonWeeklyBookingPage() {
  const { activeActor, configuration } = useDemoDomain();
  const { records, addRecord } = useAppointmentWorkspace();
  const options = useMemo(() => nonWeeklyBookingOptions(
    activeActor,
    configuration,
  ), [activeActor, configuration]);
  const [input, setInput] = useState<NonWeeklyBookingInput>(() => initialInput(options));
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [conflictAlternatives, setConflictAlternatives] = useState<readonly { date: string; time: string }[]>([]);

  useEffect(() => {
    setInput(initialInput(options));
    setStepIndex(0);
    setErrors([]);
    setStatus(null);
    setSuccessId(null);
    setConflictAlternatives([]);
  }, [activeActor.id, options]);

  const selectedOption = options.find((option) =>
    option.warehouseId === input.warehouseId) ?? null;
  const configuredFields = configuredNonWeeklyFields(configuration, input);
  const durationMinutes = deriveNonWeeklyDurationMinutes(input);
  const slotModel = useMemo(() => buildNonWeeklySlotModel(
    configuration,
    records,
    input,
  ), [configuration, input, records]);
  const approval = previewNonWeeklyApproval(activeActor, configuration, input);

  const setField = <Key extends keyof NonWeeklyBookingInput>(
    key: Key,
    value: NonWeeklyBookingInput[Key],
  ) => {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors([]);
    setStatus(null);
    setConflictAlternatives([]);
  };

  const validateCurrentStep = (): readonly string[] => {
    if (stepIndex === 0) return validateWarehouseFlow(activeActor, configuration, input).errors;
    if (stepIndex === 1) return validateDeliveryData(configuration, input).errors;
    if (stepIndex === 2) {
      const selected = slotModel.slots.find((slot) => slot.id === input.selectedSlotId);
      return selected?.available ? [] : ['Select an available compatible slot.'];
    }
    if (stepIndex === 3) return validateTransportDocuments(configuration, input).errors;
    return [];
  };

  const next = () => {
    const nextErrors = validateCurrentStep();
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors([]);
    setStatus(null);
    setStepIndex((current) => Math.min(nonWeeklyBookingSteps.length - 1, current + 1));
  };

  const previous = () => {
    setErrors([]);
    setStatus(null);
    setConflictAlternatives([]);
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const saveDraftPreview = () => {
    setStatus('Draft preview retained only on this page. No workspace record or capacity reservation was created.');
  };

  const confirm = () => {
    const result = confirmNonWeeklyBooking(
      activeActor,
      configuration,
      records,
      input,
    );
    if (!result.record) {
      setErrors(result.error ? [result.error] : ['The appointment could not be confirmed.']);
      setConflictAlternatives(result.alternatives);
      return;
    }
    const workspaceError = addRecord(result.record);
    if (workspaceError) {
      setErrors([workspaceError]);
      return;
    }
    setErrors([]);
    setConflictAlternatives([]);
    setSuccessId(result.record.id);
    setStatus(`Appointment ${result.record.systemReference} was added to the local workspace. No external system or message was used.`);
  };

  if (successId) {
    return (
      <section className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200" aria-labelledby="nonweekly-success-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Local confirmation complete</p>
        <h1 id="nonweekly-success-title" className="mt-2 text-2xl font-semibold text-gray-900">
          Standard appointment created
        </h1>
        <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          {status}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/appointments/${successId}`} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">
            Open appointment details
          </Link>
          <Link to="/appointments" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466]">
            Return to appointments
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl" aria-labelledby="nonweekly-booking-title">
      <header>
        <p className="text-sm font-medium text-[#023466]">Standard flow · outside weekly planning</p>
        <h1 id="nonweekly-booking-title" className="mt-1 text-2xl font-semibold text-gray-900">
          Create standard Supplier appointment
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Five local steps use published warehouse rules and composite capacity. No backend, storage, ERP validation or real reservation lock is used.
        </p>
      </header>

      <ol className="mt-6 grid gap-2 sm:grid-cols-5" aria-label="Standard booking steps">
        {stepLabels.map((label, index) => (
          <li
            key={label}
            aria-current={index === stepIndex ? 'step' : undefined}
            className={`rounded-md border p-3 text-sm ${index === stepIndex ? 'border-[#023466] bg-blue-50 font-semibold text-[#023466]' : 'border-gray-200 bg-white text-gray-600'}`}
          >
            <span className="block text-xs uppercase tracking-wide">Step {index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {errors.length > 0 && (
        <div role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <ul className="list-disc pl-5">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}
      {status && !successId && (
        <p role="status" className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {status}
        </p>
      )}

      <div className="mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {stepIndex === 0 && (
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">Warehouse and delivery flow</legend>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label htmlFor="nonweekly-warehouse" className="block text-sm font-medium text-gray-800">
                Warehouse *
                <select
                  id="nonweekly-warehouse"
                  value={input.warehouseId}
                  onChange={(event) => {
                    const option = options.find((candidate) => candidate.warehouseId === event.target.value);
                    setInput((current) => ({
                      ...current,
                      warehouseId: option?.warehouseId ?? '',
                      flow: option?.flows[0] ?? '',
                      selectedSlotId: '',
                    }));
                    setErrors([]);
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select warehouse</option>
                  {options.map((option) => (
                    <option key={option.warehouseId} value={option.warehouseId}>{option.warehouseName}</option>
                  ))}
                </select>
              </label>
              <label htmlFor="nonweekly-flow" className="block text-sm font-medium text-gray-800">
                Delivery flow *
                <select
                  id="nonweekly-flow"
                  value={input.flow}
                  onChange={(event) => setField('flow', event.target.value as NonWeeklyBookingInput['flow'])}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select flow</option>
                  {(selectedOption?.flows ?? []).map((flow) => <option key={flow} value={flow}>{flow}</option>)}
                </select>
              </label>
            </div>
            {selectedOption && (
              <p className="mt-4 text-sm text-gray-600">
                Published timezone: <strong>{selectedOption.timezone}</strong>. Supplier scope: <strong>{activeActor.supplierOrganizationId}</strong>.
              </p>
            )}
          </fieldset>
        )}

        {stepIndex === 1 && (
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">Delivery data</legend>
            <p className="mt-2 text-sm text-gray-600">
              These configured fields affect the form: {configuredFields.join(', ') || 'no additional configured fields'}.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextInput id="nonweekly-reference" label="Reference number" required value={input.referenceNumber} onChange={(value) => setField('referenceNumber', value)} />
              {configuredFields.includes('purchase-order') && (
                <TextInput id="nonweekly-po" label="Purchase order number" required value={input.purchaseOrderNumber} onChange={(value) => setField('purchaseOrderNumber', value)} />
              )}
              {configuredFields.includes('asn') && (
                <TextInput id="nonweekly-asn" label="ASN" required value={input.asnNumber} onChange={(value) => setField('asnNumber', value)} />
              )}
              <TextInput id="nonweekly-pallets" label="Pallet count" type="number" value={input.palletCount} onChange={(value) => setField('palletCount', value)} />
              <TextInput id="nonweekly-units" label="Unit count" type="number" value={input.unitCount} onChange={(value) => setField('unitCount', value)} />
              <TextInput id="nonweekly-weight" label="Gross weight (kg)" type="number" value={input.grossWeight} onChange={(value) => setField('grossWeight', value)} />
              <TextInput id="nonweekly-volume" label="Volume (m3)" type="number" value={input.volume} onChange={(value) => setField('volume', value)} />
              <TextInput id="nonweekly-vehicle-type" label="Vehicle type" required value={input.vehicleType} onChange={(value) => setField('vehicleType', value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" checked={input.isAdr} onChange={(event) => setField('isAdr', event.target.checked)} /> ADR
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" checked={input.isControlledTemperature} onChange={(event) => setField('isControlledTemperature', event.target.checked)} /> Controlled temperature
              </label>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-800">Derived visit duration: {durationMinutes} minutes</p>
            <button type="button" onClick={saveDraftPreview} className="mt-4 rounded-md border border-gray-400 px-3 py-2 text-sm font-semibold text-gray-700">
              Save local Draft preview
            </button>
          </fieldset>
        )}

        {stepIndex === 2 && (
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">Available slots</legend>
            <p className="mt-2 text-sm text-gray-600">
              Duration {slotModel.durationMinutes} minutes · timezone {slotModel.timezone}. Nearest available: {slotModel.nearest ? `${slotModel.nearest.date} ${slotModel.nearest.time}` : 'none'}.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slotModel.slots.map((slot) => (
                <label
                  key={slot.id}
                  className={`rounded-md border p-3 text-sm ${slot.available ? 'cursor-pointer border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 text-gray-500'}`}
                >
                  <span className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="nonweekly-slot"
                      value={slot.id}
                      disabled={!slot.available}
                      checked={input.selectedSlotId === slot.id}
                      onChange={() => setField('selectedSlotId', slot.id)}
                    />
                    <span>
                      <strong>{slot.date} · {slot.time}</strong>
                      <span className="mt-1 block">{slot.available ? 'Available' : slot.message}</span>
                      {slot.recommended && <span className="mt-1 block font-semibold text-[#023466]">Recommended</span>}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {slotModel.slots.length === 0 && (
              <p className="mt-4 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">No compatible slots are available in the deterministic search window.</p>
            )}
          </fieldset>
        )}

        {stepIndex === 3 && (
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">Transport, documents and comments</legend>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextInput id="nonweekly-contact" label="Contact person" required value={input.contactName} onChange={(value) => setField('contactName', value)} />
              <TextInput id="nonweekly-driver" label="Driver name" required={configuredFields.includes('driver-name')} value={input.driverName} onChange={(value) => setField('driverName', value)} />
              <TextInput id="nonweekly-phone" label="Driver phone" type="tel" value={input.driverPhone} onChange={(value) => setField('driverPhone', value)} />
              <TextInput id="nonweekly-tractor" label="Vehicle registration" required={configuredFields.includes('vehicle-registration')} value={input.tractorRegistration} onChange={(value) => setField('tractorRegistration', value)} />
              <TextInput id="nonweekly-trailer" label="Trailer or container registration" value={input.trailerOrContainerRegistration} onChange={(value) => setField('trailerOrContainerRegistration', value)} />
              <TextInput id="nonweekly-document" label="Document name metadata" required={configuredFields.includes('document-reference')} value={input.documentName} onChange={(value) => setField('documentName', value)} />
            </div>
            <label htmlFor="nonweekly-comment" className="mt-4 block text-sm font-medium text-gray-800">
              Shared Comment
              <textarea
                id="nonweekly-comment"
                value={input.sharedComment}
                onChange={(event) => setField('sharedComment', event.target.value)}
                className="mt-1 min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 flex items-start gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={input.consentConfirmed} onChange={(event) => setField('consentConfirmed', event.target.checked)} />
              <span>I confirm the required booking consent and the accuracy of the locally demonstrated data.</span>
            </label>
            <p className="mt-3 text-xs text-gray-500">Only document name/status metadata is retained. No file bytes are uploaded or stored.</p>
          </fieldset>
        )}

        {stepIndex === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Summary and confirmation</h2>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div><dt className="text-gray-500">Supplier organization</dt><dd className="font-medium text-gray-900">{activeActor.supplierOrganizationId}</dd></div>
              <div><dt className="text-gray-500">Warehouse</dt><dd className="font-medium text-gray-900">{selectedOption?.warehouseName}</dd></div>
              <div><dt className="text-gray-500">Flow</dt><dd className="font-medium text-gray-900">{input.flow}</dd></div>
              <div><dt className="text-gray-500">Duration</dt><dd className="font-medium text-gray-900">{durationMinutes} minutes</dd></div>
              <div><dt className="text-gray-500">Selected slot</dt><dd className="font-medium text-gray-900">{input.selectedSlotId.replace('T', ' · ')}</dd></div>
              <div><dt className="text-gray-500">Timezone</dt><dd className="font-medium text-gray-900">{selectedOption?.timezone}</dd></div>
              <div><dt className="text-gray-500">Reference / PO / ASN</dt><dd className="font-medium text-gray-900">{input.referenceNumber} · {input.purchaseOrderNumber || '—'} · {input.asnNumber || '—'}</dd></div>
              <div><dt className="text-gray-500">Volume evidence</dt><dd className="font-medium text-gray-900">{input.palletCount || '—'} pallets · {input.unitCount || '—'} units · {input.grossWeight || '—'} kg · {input.volume || '—'} m3</dd></div>
              <div><dt className="text-gray-500">Vehicle</dt><dd className="font-medium text-gray-900">{input.vehicleType} · {input.tractorRegistration} · {input.trailerOrContainerRegistration || '—'}</dd></div>
              <div><dt className="text-gray-500">Contact / document</dt><dd className="font-medium text-gray-900">{input.contactName} · {input.documentName || 'No metadata'}</dd></div>
              <div className="md:col-span-2"><dt className="text-gray-500">Expected approval outcome</dt><dd className="font-medium text-gray-900">{approval.outcome} — {approval.explanation}</dd></div>
            </dl>
            <button type="button" onClick={confirm} className="mt-6 rounded-md bg-[#023466] px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
              Confirm local standard appointment
            </button>
          </div>
        )}
      </div>

      {conflictAlternatives.length > 0 && (
        <section className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4" aria-labelledby="nonweekly-conflict-alternatives">
          <h2 id="nonweekly-conflict-alternatives" className="font-semibold text-amber-950">Compatible alternatives</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {conflictAlternatives.map((alternative) => (
              <button
                key={`${alternative.date}-${alternative.time}`}
                type="button"
                onClick={() => {
                  setField('selectedSlotId', `${alternative.date}T${alternative.time}`);
                  setStepIndex(2);
                }}
                className="rounded-md border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-900"
              >
                {alternative.date} · {alternative.time}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={previous} disabled={stepIndex === 0} className="rounded-md border border-gray-400 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50">
          Previous step
        </button>
        {stepIndex < nonWeeklyBookingSteps.length - 1 && (
          <button type="button" onClick={next} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">
            Next step
          </button>
        )}
      </div>
    </section>
  );
}
