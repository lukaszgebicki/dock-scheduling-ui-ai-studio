import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { getSupplierOrganizationById, getWarehouseById, type WarehouseId } from '../demoDomain/demoDomain';
import { ResponsiveActionGroup } from '../responsive/ResponsivePrimitives';
import {
  validateSupplierWeeklyBooking,
  type SupplierWeeklyBookingError,
  type SupplierWeeklyBookingInput,
  type SupplierWeeklyBookingResult,
} from './supplierWeeklyBooking';

const referenceDate = '2026-08-03';
const expectedDeliveryWeek = '2026-W33';

const slots = [
  {
    id: 'slot-2026-08-10-0800',
    warehouseId: 'nowy-kisielin-distribution-center',
    deliveryWeek: expectedDeliveryWeek,
    startsAt: '2026-08-10T08:00:00+02:00',
    label: 'Monday 10 Aug, 08:00–09:00',
  },
  {
    id: 'slot-2026-08-11-1000',
    warehouseId: 'nowy-kisielin-distribution-center',
    deliveryWeek: expectedDeliveryWeek,
    startsAt: '2026-08-11T10:00:00+02:00',
    label: 'Tuesday 11 Aug, 10:00–11:00',
  },
  {
    id: 'slot-2026-08-12-1300',
    warehouseId: 'zielona-gora-plant',
    deliveryWeek: expectedDeliveryWeek,
    startsAt: '2026-08-12T13:00:00+02:00',
    label: 'Wednesday 12 Aug, 13:00–14:00',
  },
] as const;

const existingReservations = [
  {
    supplierOrganizationId: 'northstar-packaging',
    warehouseId: 'nowy-kisielin-distribution-center',
    deliveryWeek: expectedDeliveryWeek,
    purchaseOrderNumber: 'PO-DEMO-1001',
  },
] as const;

function errorFor(errors: readonly SupplierWeeklyBookingError[], field: SupplierWeeklyBookingError['field']) {
  return errors.find((error) => error.field === field)?.message;
}

export function SupplierWeeklyBookingPage() {
  const { activeActor, canPerformWorkflowAction } = useDemoDomain();
  const supplierOrganizationId = activeActor.supplierOrganizationId ?? '';
  const initialWarehouseId = activeActor.warehouseIds[0] ?? '';
  const [input, setInput] = useState<SupplierWeeklyBookingInput>({
    supplierOrganizationId,
    warehouseId: initialWarehouseId,
    deliveryWeek: expectedDeliveryWeek,
    purchaseOrderNumber: '',
    selectedSlotId: '',
    tractorRegistration: '',
    trailerOrContainerRegistration: '',
  });
  const [errors, setErrors] = useState<readonly SupplierWeeklyBookingError[]>([]);
  const [result, setResult] = useState<SupplierWeeklyBookingResult | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.warehouseId === input.warehouseId),
    [input.warehouseId],
  );

  const update = (field: keyof SupplierWeeklyBookingInput, value: string) => {
    setResult(null);
    setDuplicateWarning(null);
    setInput((current) => ({
      ...current,
      [field]: value,
      ...(field === 'warehouseId' ? { selectedSlotId: '' } : {}),
    }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const authorized = input.supplierOrganizationId && input.warehouseId
      ? canPerformWorkflowAction({
          step: 'SUPPLIER_RESERVE_NEXT_WEEK',
          capability: 'BOOK_APPOINTMENT',
          scope: {
            supplierOrganizationId: input.supplierOrganizationId,
            warehouseId: input.warehouseId,
          },
        })
      : false;

    if (!authorized) {
      setResult(null);
      setDuplicateWarning(null);
      setErrors([{ field: 'warehouseId', message: 'This Supplier actor is not authorized for the selected Supplier and warehouse scope.' }]);
      return;
    }

    const validation = validateSupplierWeeklyBooking(input, {
      referenceDate,
      expectedDeliveryWeek,
      selectableSlots: slots,
      existingReservations,
    });
    setErrors(validation.errors);
    if (!validation.valid) {
      setResult(null);
      setDuplicateWarning(null);
      return;
    }
    setResult(validation.result);
    setDuplicateWarning(validation.duplicateWarning);
  };

  const supplierName = supplierOrganizationId
    ? getSupplierOrganizationById(supplierOrganizationId).displayName
    : 'Unavailable Supplier';

  return (
    <div className="mx-auto max-w-3xl" data-responsive-screen="supplier-weekly-booking">
      <div className="mb-6 sm:mb-8">
        <Link to="/appointments" className="inline-flex min-h-11 items-center text-sm font-medium text-[#023466] hover:underline focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
          ← Back to appointments
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900 sm:mt-4">Reserve a next-week delivery slot</h1>
        <p className="mt-2 text-sm text-gray-600">
          Local demonstration for {supplierName}. Reference date {referenceDate}; selectable delivery week {expectedDeliveryWeek}.
        </p>
      </div>

      {errors.length > 0 && (
        <div role="alert" aria-labelledby="booking-errors-title" className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <h2 id="booking-errors-title" className="font-semibold text-red-800">Reservation was not created</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
            {errors.map((error) => <li key={`${error.field}-${error.message}`}>{error.message}</li>)}
          </ul>
        </div>
      )}

      {result ? (
        <section aria-labelledby="booking-success-title" className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <h2 id="booking-success-title" className="text-lg font-semibold text-gray-900">Demonstrational reservation created</h2>
          {duplicateWarning && <p role="status" className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{duplicateWarning}</p>}
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-medium text-gray-500">Purchase order</dt><dd className="break-words text-gray-900">{result.purchaseOrderNumber}</dd></div>
            <div><dt className="font-medium text-gray-500">Slot</dt><dd className="text-gray-900">{result.selectedSlot.label}</dd></div>
            <div><dt className="font-medium text-gray-500">Tractor</dt><dd className="break-words text-gray-900">{result.tractorRegistration}</dd></div>
            <div><dt className="font-medium text-gray-500">Trailer / container</dt><dd className="break-words text-gray-900">{result.trailerOrContainerRegistration}</dd></div>
            <div><dt className="font-medium text-gray-500">Origin</dt><dd className="text-gray-900">{result.origin}</dd></div>
            <div><dt className="font-medium text-gray-500">Planning state</dt><dd className="text-gray-900">{result.planningState}</dd></div>
          </dl>
          <p className="mt-6 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            This result exists only in current component memory. No durable save, capacity reservation, email, approval or integration occurred.
          </p>
          <div className="mt-6">
            <ResponsiveActionGroup label="Weekly booking success actions">
              <button
                type="button"
                onClick={() => { setResult(null); setErrors([]); }}
                className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
              >
                Create another local reservation
              </button>
              <Link
                to="/appointments"
                className="inline-flex items-center justify-center rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
              >
                Return to appointments
              </Link>
            </ResponsiveActionGroup>
          </div>
        </section>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">Supplier</label>
            <input id="supplier" value={supplierName} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
          </div>

          <div>
            <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700">Warehouse</label>
            <select id="warehouse" value={input.warehouseId} onChange={(event) => update('warehouseId', event.target.value)} aria-invalid={Boolean(errorFor(errors, 'warehouseId'))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select warehouse</option>
              {activeActor.warehouseIds.map((warehouseId) => <option key={warehouseId} value={warehouseId}>{getWarehouseById(warehouseId as WarehouseId).displayName}</option>)}
            </select>
            {errorFor(errors, 'warehouseId') && <p className="mt-1 text-sm text-red-700">{errorFor(errors, 'warehouseId')}</p>}
          </div>

          <div>
            <label htmlFor="delivery-week" className="block text-sm font-medium text-gray-700">Delivery week</label>
            <input id="delivery-week" value={input.deliveryWeek} readOnly className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm" />
          </div>

          <div>
            <label htmlFor="purchase-order" className="block text-sm font-medium text-gray-700">Purchase order number</label>
            <input id="purchase-order" value={input.purchaseOrderNumber} onChange={(event) => update('purchaseOrderNumber', event.target.value)} aria-invalid={Boolean(errorFor(errors, 'purchaseOrderNumber'))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            {errorFor(errors, 'purchaseOrderNumber') && <p className="mt-1 text-sm text-red-700">{errorFor(errors, 'purchaseOrderNumber')}</p>}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-gray-700">Available next-week slot</legend>
            <div className="mt-2 space-y-3" data-responsive-screen="supplier-day-time-choices">
              {availableSlots.map((slot) => (
                <label key={slot.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-gray-200 p-3 focus-within:border-[#023466] focus-within:ring-2 focus-within:ring-[#7FA5D0]">
                  <input className="mt-1" type="radio" name="selectedSlot" value={slot.id} checked={input.selectedSlotId === slot.id} onChange={(event) => update('selectedSlotId', event.target.value)} />
                  <span className="text-sm text-gray-900">{slot.label}</span>
                </label>
              ))}
            </div>
            {errorFor(errors, 'selectedSlotId') && <p className="mt-1 text-sm text-red-700">{errorFor(errors, 'selectedSlotId')}</p>}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tractor-registration" className="block text-sm font-medium text-gray-700">Tractor registration</label>
              <input id="tractor-registration" value={input.tractorRegistration} onChange={(event) => update('tractorRegistration', event.target.value)} aria-invalid={Boolean(errorFor(errors, 'tractorRegistration'))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              {errorFor(errors, 'tractorRegistration') && <p className="mt-1 text-sm text-red-700">{errorFor(errors, 'tractorRegistration')}</p>}
            </div>
            <div>
              <label htmlFor="trailer-registration" className="block text-sm font-medium text-gray-700">Trailer or container registration</label>
              <input id="trailer-registration" value={input.trailerOrContainerRegistration} onChange={(event) => update('trailerOrContainerRegistration', event.target.value)} aria-invalid={Boolean(errorFor(errors, 'trailerOrContainerRegistration'))} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              {errorFor(errors, 'trailerOrContainerRegistration') && <p className="mt-1 text-sm text-red-700">{errorFor(errors, 'trailerOrContainerRegistration')}</p>}
            </div>
          </div>

          <ResponsiveActionGroup label="Weekly booking form actions" stickyOnMobile>
            <button type="submit" className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
              Create local demonstration
            </button>
          </ResponsiveActionGroup>
        </form>
      )}
    </div>
  );
}
