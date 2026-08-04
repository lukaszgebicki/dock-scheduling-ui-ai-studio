import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAppointmentWorkspace } from '../appointments/AppointmentWorkspaceProvider';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  buildOperatorManualSlotModel,
  configuredOperatorManualFields,
  confirmOperatorManualBooking,
  deriveOperatorManualDurationMinutes,
  emptyOperatorManualBookingInput,
  operatorManualBookingOptions,
  operatorManualBookingSteps,
  previewOperatorManualApproval,
  validateOperatorManualDeliveryData,
  validateOperatorManualScope,
  validateOperatorManualTransport,
  type OperatorManualBookingInput,
} from './operatorManualBookingDomain';

const stepLabels = [
  'Warehouse, Supplier and flow',
  'Delivery data',
  'Available slots',
  'Transport, documents and comments',
  'Summary and confirmation',
] as const;

function initialInput(
  options: ReturnType<typeof operatorManualBookingOptions>,
): OperatorManualBookingInput {
  const warehouse = options[0];
  const supplier = warehouse?.suppliers[0];
  return {
    ...emptyOperatorManualBookingInput,
    warehouseId: warehouse?.warehouseId ?? '',
    supplierOrganizationId: supplier?.supplierOrganizationId ?? '',
    flow: supplier?.flows[0] ?? '',
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

export function OperatorManualBookingPage() {
  const { activeActor, configuration } = useDemoDomain();
  const { records, addRecord } = useAppointmentWorkspace();
  const options = useMemo(() => operatorManualBookingOptions(
    activeActor,
    configuration,
  ), [activeActor, configuration]);
  const [input, setInput] = useState<OperatorManualBookingInput>(() =>
    initialInput(options));
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [conflictAlternatives, setConflictAlternatives] = useState<readonly {
    date: string;
    time: string;
  }[]>([]);

  useEffect(() => {
    setInput(initialInput(options));
    setStepIndex(0);
    setErrors([]);
    setStatus(null);
    setSuccessId(null);
    setConflictAlternatives([]);
  }, [activeActor.id, options]);

  const selectedWarehouse = options.find((option) =>
    option.warehouseId === input.warehouseId) ?? null;
  const selectedSupplier = selectedWarehouse?.suppliers.find((supplier) =>
    supplier.supplierOrganizationId === input.supplierOrganizationId) ?? null;
  const configuredFields = configuredOperatorManualFields(configuration, input);
  const durationMinutes = deriveOperatorManualDurationMinutes(input);
  const slotModel = useMemo(() => buildOperatorManualSlotModel(
    configuration,
    records,
    input,
  ), [configuration, input, records]);
  const approval = previewOperatorManualApproval(configuration, input);

  const setField = <Key extends keyof OperatorManualBookingInput>(
    key: Key,
    value: OperatorManualBookingInput[Key],
  ) => {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors([]);
    setStatus(null);
    setConflictAlternatives([]);
  };

  const validateCurrentStep = (): readonly string[] => {
    if (stepIndex === 0) {
      return validateOperatorManualScope(activeActor, configuration, input).errors;
    }
    if (stepIndex === 1) {
      return validateOperatorManualDeliveryData(configuration, input).errors;
    }
    if (stepIndex === 2) {
      const selected = slotModel.slots.find((slot) => slot.id === input.selectedSlotId);
      return selected?.available ? [] : ['Select an available compatible slot.'];
    }
    if (stepIndex === 3) {
      return validateOperatorManualTransport(configuration, input).errors;
    }
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
    setStepIndex((current) => Math.min(
      operatorManualBookingSteps.length - 1,
      current + 1,
    ));
  };

  const previous = () => {
    setErrors([]);
    setStatus(null);
    setConflictAlternatives([]);
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const confirm = () => {
    const result = confirmOperatorManualBooking(
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
    setStatus(`Appointment ${result.record.systemReference} was added to the local workspace by ${activeActor.displayName}. No external system or message was used.`);
  };

  if (successId) {
    return (
      <section className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200" aria-labelledby="operator-booking-success-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Local Operator confirmation complete
        </p>
        <h1 id="operator-booking-success-title" className="mt-2 text-2xl font-semibold text-gray-900">
          Manual appointment created
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
    <section className="mx-auto max-w-5xl" aria-labelledby="operator-booking-title">
      <header>
        <p className="text-sm font-medium text-[#023466]">
          Warehouse Operator · manual booking on behalf of Supplier
        </p>
        <h1 id="operator-booking-title" className="mt-1 text-2xl font-semibold text-gray-900">
          Create manual Supplier appointment
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Five local steps use assigned published warehouses, active Supplier configuration, shared capacity and existing approval rules. No override, backend or persistence is used.
        </p>
      </header>

      <ol className="mt-6 grid gap-2 sm:grid-cols-5" aria-label="Operator manual booking steps">
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

      <div className="mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {stepIndex === 0 && (
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">
              Warehouse, Supplier and delivery flow
            </legend>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label htmlFor="operator-warehouse" className="block text-sm font-medium text-gray-800">
                Warehouse *
                <select
                  id="operator-warehouse"
                  value={input.warehouseId}
                  onChange={(event) => {
                    const warehouse = options.find((candidate) =>
                      candidate.warehouseId === event.target.value);
                    const supplier = warehouse?.suppliers[0];
                    setInput((current) => ({
                      ...current,
                      warehouseId: warehouse?.warehouseId ?? '',
                      supplierOrganizationId: supplier?.supplierOrganizationId ?? '',
                      flow: supplier?.flows[0] ?? '',
                      selectedSlotId: '',
                    }));
                    setErrors([]);
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select warehouse</option>
                  {options.map((option) => (
                    <option key={option.warehouseId} value={option.warehouseId}>
                      {option.warehouseName}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="operator-supplier" className="block text-sm font-medium text-gray-800">
                Supplier *
                <select
                  id="operator-supplier"
                  value={input.supplierOrganizationId}
                  onChange={(event) => {
                    const supplier = selectedWarehouse?.suppliers.find((candidate) =>
                      candidate.supplierOrganizationId === event.target.value);
                    setInput((current) => ({
                      ...current,
                      supplierOrganizationId: supplier?.supplierOrganizationId ?? '',
                      flow: supplier?.flows[0] ?? '',
                      selectedSlotId: '',
                    }));
                    setErrors([]);
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select Supplier</option>
                  {(selectedWarehouse?.suppliers ?? []).map((supplier) => (
                    <option key={supplier.supplierOrganizationId} value={supplier.supplierOrganizationId}>
                      {supplier.supplierName}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="operator-flow" className="block text-sm font-medium text-gray-800">
                Delivery flow *
                <select
                  id="operator-flow"
                  value={input.flow}
                  onChange={(event) => setField(
                    'flow',
                    event.target.value as OperatorManualBookingInput['flow'],
                  )}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select flow</option>
                  {(selectedSupplier?.flows ?? []).map((flow) => (
                    <option key={flow} value={flow}>{flow}</option>
                  ))}
                </select>
              </label>
            </div>
            {selectedWarehouse && selectedSupplier && (
              <p className="mt-4 text-sm text-gray-600">
                Operator scope: <strong>{selectedWarehouse.warehouseName}</strong>. Acting for: <strong>{selectedSupplier.supplierName}</strong>. Timezone: <strong>{selectedWarehouse.timezone}</strong>.
              </p>
            )}
          </fieldset>
        )}

        {stepIndex === 1 && (
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">Delivery data</legend>
            <p className="mt-2 text-sm text-gray-600">
              Published configured fields affect this form: {configuredFields.join(', ') || 'no additional configured fields'}.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextInput id="operator-reference" label="Reference number" required value={input.referenceNumber} onChange={(value) => setField('referenceNumber', value)} />
              {configuredFields.includes('purchase-order') && (
                <TextInput id="operator-po" label="Purchase order number" required value={input.purchaseOrderNumber} onChange={(value) => setField('purchaseOrderNumber', value)} />
              )}
              {configuredFields.includes('asn') && (
                <TextInput id="operator-asn" label="ASN" required value={input.asnNumber} onChange={(value) => setField('asnNumber', value)} />
              )}
              <TextInput id="operator-pallets" label="Pallet count" type="number" value={input.palletCount} onChange={(value) => setField('palletCount', value)} />
              <TextInput id="operator-units" label="Unit count" type="number" value={input.unitCount} onChange={(value) => setField('unitCount', value)} />
              <TextInput id="operator-weight" label="Gross weight (kg)" type="number" value={input.grossWeight} onChange={(value) => setField('grossWeight', value)} />
              <TextInput id="operator-volume" label="Volume (m3)" type="number" value={input.volume} onChange={(value) => setField('volume', value)} />
              <TextInput id="operator-vehicle-type" label="Vehicle type" required value={input.vehicleType} onChange={(value) => setField('vehicleType', value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" checked={input.isAdr} onChange={(event) => setField('isAdr', event.target.checked)} /> ADR
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" checked={input.isControlledTemperature} onChange={(event) => setField('isControlledTemperature', event.target.checked)} /> Controlled temperature
              </label>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-800">
              Derived visit duration: {durationMinutes} minutes
            </p>
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
                      name="operator-slot"
                      value={slot.id}
                      disabled={!slot.available}
                      checked={input.selectedSlotId === slot.id}
                      onChange={() => setField('selectedSlotId', slot.id)}
                    />
                    <span>
                      <strong>{slot.date} · {slot.time}</strong>
                      <span className="mt-1 block">{slot.available ? 'Available' : slot.message}</span>
                      {slot.recommended && (
                        <span className="mt-1 block font-semibold text-[#023466]">Recommended</span>
                      )}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {stepIndex === 3 && (
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900">
              Transport, documents and comments
            </legend>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextInput id="operator-contact" label="Contact person" required value={input.contactName} onChange={(value) => setField('contactName', value)} />
              <TextInput id="operator-driver" label="Driver name" required={configuredFields.includes('driver-name')} value={input.driverName} onChange={(value) => setField('driverName', value)} />
              <TextInput id="operator-phone" label="Driver phone" type="tel" value={input.driverPhone} onChange={(value) => setField('driverPhone', value)} />
              <TextInput id="operator-tractor" label="Vehicle registration" required={configuredFields.includes('vehicle-registration')} value={input.tractorRegistration} onChange={(value) => setField('tractorRegistration', value)} />
              <TextInput id="operator-trailer" label="Trailer or container registration" value={input.trailerOrContainerRegistration} onChange={(value) => setField('trailerOrContainerRegistration', value)} />
              <TextInput id="operator-document" label="Document name metadata" required={configuredFields.includes('document-reference')} value={input.documentName} onChange={(value) => setField('documentName', value)} />
            </div>
            <label htmlFor="operator-comment-visibility" className="mt-4 block text-sm font-medium text-gray-800">
              Comment visibility
              <select
                id="operator-comment-visibility"
                value={input.commentVisibility}
                onChange={(event) => setField(
                  'commentVisibility',
                  event.target.value as OperatorManualBookingInput['commentVisibility'],
                )}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-72"
              >
                <option value="INTERNAL_NOTE">Internal Note</option>
                <option value="SHARED_COMMENT">Shared Comment</option>
              </select>
            </label>
            <label htmlFor="operator-comment" className="mt-4 block text-sm font-medium text-gray-800">
              Comment
              <textarea
                id="operator-comment"
                value={input.sharedComment}
                onChange={(event) => setField('sharedComment', event.target.value)}
                className="mt-1 min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 flex items-start gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={input.consentConfirmed} onChange={(event) => setField('consentConfirmed', event.target.checked)} />
              <span>I confirm the required booking consent and that I am creating this local appointment on behalf of the selected Supplier.</span>
            </label>
            <p className="mt-3 text-xs text-gray-500">
              Only document name/status metadata is retained. No file bytes are uploaded or stored.
            </p>
          </fieldset>
        )}

        {stepIndex === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Summary and confirmation</h2>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div><dt className="text-gray-500">Creator</dt><dd className="font-medium text-gray-900">{activeActor.displayName} · Warehouse Operator</dd></div>
              <div><dt className="text-gray-500">Supplier</dt><dd className="font-medium text-gray-900">{selectedSupplier?.supplierName}</dd></div>
              <div><dt className="text-gray-500">Warehouse</dt><dd className="font-medium text-gray-900">{selectedWarehouse?.warehouseName}</dd></div>
              <div><dt className="text-gray-500">Flow</dt><dd className="font-medium text-gray-900">{input.flow}</dd></div>
              <div><dt className="text-gray-500">Duration</dt><dd className="font-medium text-gray-900">{durationMinutes} minutes</dd></div>
              <div><dt className="text-gray-500">Selected slot</dt><dd className="font-medium text-gray-900">{input.selectedSlotId.replace('T', ' · ')}</dd></div>
              <div><dt className="text-gray-500">Reference / PO / ASN</dt><dd className="font-medium text-gray-900">{input.referenceNumber} · {input.purchaseOrderNumber || '—'} · {input.asnNumber || '—'}</dd></div>
              <div><dt className="text-gray-500">Vehicle</dt><dd className="font-medium text-gray-900">{input.vehicleType} · {input.tractorRegistration} · {input.trailerOrContainerRegistration || '—'}</dd></div>
              <div><dt className="text-gray-500">Comment visibility</dt><dd className="font-medium text-gray-900">{input.commentVisibility}</dd></div>
              <div><dt className="text-gray-500">Document metadata</dt><dd className="font-medium text-gray-900">{input.documentName || 'No metadata'}</dd></div>
              <div className="md:col-span-2"><dt className="text-gray-500">Expected approval outcome</dt><dd className="font-medium text-gray-900">{approval.outcome} — {approval.explanation}</dd></div>
            </dl>
            <button type="button" onClick={confirm} className="mt-6 rounded-md bg-[#023466] px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
              Confirm local Operator appointment
            </button>
          </div>
        )}
      </div>

      {conflictAlternatives.length > 0 && (
        <section className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4" aria-labelledby="operator-conflict-alternatives">
          <h2 id="operator-conflict-alternatives" className="font-semibold text-amber-950">
            Compatible alternatives
          </h2>
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
        {stepIndex < operatorManualBookingSteps.length - 1 && (
          <button type="button" onClick={next} className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white">
            Next step
          </button>
        )}
      </div>
    </section>
  );
}
