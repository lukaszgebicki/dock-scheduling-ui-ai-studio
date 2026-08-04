import React, { useState } from 'react';
import { CapacityDemonstration } from '../capacity/CapacityDemonstration';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  buildPlanningCalendar,
  planningAppointments,
  type PlanningAppointment,
} from './planningCalendar';

function DeliveryContents({
  appointment,
  supplierView,
}: {
  appointment: PlanningAppointment;
  supplierView: boolean;
}) {
  if (appointment.skuLines.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        Awaiting SKU details
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
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
          {appointment.skuLines.map((line) => (
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
          Internal planning detail is intentionally limited to approved operational content. Technical lineage is not displayed.
        </p>
      )}
    </div>
  );
}

export function PlanningCalendarPage() {
  const {
    activeActor,
    canViewAppointment,
    configuration,
    getWarehouseDisplayNames,
  } = useDemoDomain();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supplierView = Boolean(activeActor.supplierOrganizationId);
  const cards = buildPlanningCalendar(
    planningAppointments,
    configuration.warehouses,
  ).filter(({ appointment }) => canViewAppointment(appointment));

  return (
    <section aria-labelledby="planning-calendar-title" className="mx-auto max-w-7xl">
      <header className="mb-6">
        <p className="text-sm font-medium text-[#023466]">Week 33 · local demonstration</p>
        <h1 id="planning-calendar-title" className="mt-1 text-2xl font-semibold text-gray-900">
          PO planning calendar
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          One card represents one appointment and PO header. Configuration conflicts never move, cancel, approve or override a booking.
        </p>
      </header>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="font-semibold text-gray-900">No visible calendar appointments</h2>
          <p className="mt-2 text-sm text-gray-600">Change the demo access context or warehouse assignment.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {cards.map(({ appointment, totals, conflict }) => {
            const expanded = expandedId === appointment.id;
            return (
              <article
                key={appointment.id}
                aria-labelledby={`${appointment.id}-title`}
                className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {appointment.plannedDate} · {appointment.plannedTime}
                    </p>
                    <h2 id={`${appointment.id}-title`} className="mt-1 text-lg font-semibold text-gray-900">
                      {appointment.purchaseOrderNumber}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {appointment.supplierName} · {getWarehouseDisplayNames([appointment.warehouseId])[0]}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="block rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800">
                      {appointment.planningState}
                    </span>
                    <span className="mt-1 block text-gray-500">{appointment.bookingOrigin}</span>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-gray-500">Appointment status</dt>
                    <dd className="font-medium text-gray-900">{appointment.appointmentStatus}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Tractor</dt>
                    <dd className="font-medium text-gray-900">{appointment.tractorRegistration}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Trailer / container</dt>
                    <dd className="font-medium text-gray-900">{appointment.trailerOrContainerRegistration}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Delivery contents</dt>
                    <dd className="font-medium text-gray-900">
                      {totals
                        ? `${totals.skuCount} SKU · ${totals.units} units · ${totals.pallets} pallets`
                        : 'Awaiting SKU details'}
                    </dd>
                  </div>
                </dl>

                {conflict && (
                  <div role="status" className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <strong>{conflict.kind}</strong>: {conflict.message}
                  </div>
                )}

                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${appointment.id}-contents`}
                  onClick={() => setExpandedId(expanded ? null : appointment.id)}
                  className="mt-5 rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
                >
                  Pokaż zawartość dostawy
                </button>

                {expanded && (
                  <div id={`${appointment.id}-contents`}>
                    <DeliveryContents appointment={appointment} supplierView={supplierView} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <CapacityDemonstration actor={activeActor} warehouses={configuration.warehouses} />
    </section>
  );
}
