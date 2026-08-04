import React, { useEffect, useState } from 'react';
import type { WarehouseConfiguration } from '../demoDomain/configuration';
import type { DemoActor } from '../demoDomain/demoDomain';
import {
  applyCapacityOverride,
  evaluateCapacitySlot,
  occupiedCapacityUnits,
  simulateFinalCapacityCompetition,
  type CapacityAppointment,
  type CapacityCompetitionResult,
  type CapacityOverrideEvidence,
  type CapacitySlotRequest,
} from './capacityDomain';

function demonstrationRequest(warehouse: WarehouseConfiguration): CapacitySlotRequest {
  return {
    warehouseId: warehouse.id,
    date: '2026-08-13',
    time: '09:00',
    durationMinutes: 30,
    flow: 'Material Delivery',
  };
}

function baseOccupancy(
  warehouse: WarehouseConfiguration,
  request: CapacitySlotRequest,
): readonly CapacityAppointment[] {
  const empty = evaluateCapacitySlot([warehouse], [], request);
  const limit = empty.internalEvidence?.effectiveLimit ?? 0;
  return Array.from({ length: Math.max(0, limit - 1) }, (_, index) => ({
    id: `capacity-demo-existing-${index + 1}`,
    warehouseId: warehouse.id,
    plannedDate: request.date,
    plannedTime: request.time,
    durationMinutes: request.durationMinutes,
    flow: request.flow,
    appointmentStatus: 'CONFIRMED',
    operationalStatus: 'EXPECTED',
  }));
}

function actorWarehouse(
  actor: DemoActor,
  warehouses: readonly WarehouseConfiguration[],
): WarehouseConfiguration | null {
  if (actor.role === 'System Administrator') return warehouses[0] ?? null;
  return warehouses.find((warehouse) => actor.warehouseIds.includes(warehouse.id)) ?? null;
}

export function CapacityDemonstration({
  actor,
  warehouses,
}: {
  actor: DemoActor;
  warehouses: readonly WarehouseConfiguration[];
}) {
  const [competition, setCompetition] = useState<CapacityCompetitionResult | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideEvidence, setOverrideEvidence] = useState<CapacityOverrideEvidence | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const warehouse = actorWarehouse(actor, warehouses);

  useEffect(() => {
    setCompetition(null);
    setOverrideReason('');
    setOverrideEvidence(null);
    setOverrideError(null);
  }, [actor.id]);

  if (!warehouse) {
    return (
      <section className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">Composite capacity demonstration</h2>
        <p className="mt-2 text-sm text-gray-600">No warehouse is available in the active actor scope.</p>
      </section>
    );
  }

  const request = demonstrationRequest(warehouse);
  const occupiedUnits = occupiedCapacityUnits(
    request.date,
    request.time,
    request.durationMinutes,
  );
  const existing = baseOccupancy(warehouse, request);
  const canOfferOverride = actor.role === 'System Administrator'
    || (actor.role === 'Warehouse Administrator'
      && actor.warehouseIds.includes(warehouse.id)
      && warehouse.administratorUserIds.includes(actor.userId));

  const runCompetition = () => {
    setCompetition(simulateFinalCapacityCompetition(
      [warehouse],
      existing,
      request,
      [
        { id: 'first-local-attempt', supplierOrganizationId: 'northstar-packaging' },
        { id: 'second-local-attempt', supplierOrganizationId: 'vistula-materials' },
      ],
    ));
    setOverrideEvidence(null);
    setOverrideError(null);
  };

  const applyOverride = () => {
    const accepted = competition?.results.find((result) => result.outcome === 'RESERVED');
    if (!accepted) {
      setOverrideError('Run the final-capacity demonstration first.');
      return;
    }
    const occupied: CapacityAppointment[] = [
      ...existing,
      {
        id: 'capacity-demo-winning-attempt',
        warehouseId: warehouse.id,
        plannedDate: accepted.slot.date,
        plannedTime: accepted.slot.time,
        durationMinutes: request.durationMinutes,
        flow: request.flow,
        appointmentStatus: 'SUBMITTED',
        operationalStatus: 'EXPECTED',
      },
    ];
    const blocked = evaluateCapacitySlot([warehouse], occupied, request);
    const override = applyCapacityOverride(actor, warehouse, blocked, overrideReason);
    setOverrideError(override.error);
    setOverrideEvidence(override.evidence);
  };

  return (
    <section aria-labelledby="capacity-demo-title" className="mt-8 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Local UI-only scenario</p>
          <h2 id="capacity-demo-title" className="mt-1 text-lg font-semibold text-gray-900">
            Composite capacity demonstration
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            A 30-minute request occupies {occupiedUnits.join(' and ')}. Two ordered attempts compete for one final compatible unit; no real lock, persistence or background reservation is created.
          </p>
        </div>
        <button
          type="button"
          onClick={runCompetition}
          className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
        >
          Run final-capacity demonstration
        </button>
      </div>

      {competition?.error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {competition.error}
        </p>
      )}

      {competition && competition.results.length > 0 && (
        <ol className="mt-5 grid gap-4 md:grid-cols-2" aria-label="Final capacity attempt results">
          {competition.results.map((result, index) => (
            <li key={result.attemptId} className="rounded-md border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Attempt {index + 1}
              </p>
              <p className="mt-1 font-semibold text-gray-900">{result.outcome}</p>
              <p className="mt-2 text-sm text-gray-600">{result.message}</p>
              {result.alternatives.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-800">Nearest compatible alternatives</p>
                  <ul className="mt-1 text-sm text-gray-600">
                    {result.alternatives.map((alternative) => (
                      <li key={`${alternative.date}-${alternative.time}`}>
                        {alternative.date} · {alternative.time}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {canOfferOverride && competition?.results.some((result) =>
        result.outcome === 'RESERVATION_CONFLICT') && (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-950">Controlled Administrator override</h3>
          <label className="mt-3 block text-sm font-medium text-amber-950" htmlFor="capacity-override-reason">
            Override reason
          </label>
          <input
            id="capacity-override-reason"
            value={overrideReason}
            onChange={(event) => setOverrideReason(event.target.value)}
            className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={applyOverride}
            className="mt-3 rounded-md border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-900"
          >
            Apply local capacity override
          </button>
          {overrideError && <p role="alert" className="mt-2 text-sm text-red-700">{overrideError}</p>}
          {overrideEvidence && (
            <p role="status" className="mt-2 text-sm text-amber-950">
              Override recorded locally for {overrideEvidence.warehouseId}: {overrideEvidence.reason}. Before {overrideEvidence.before.reasonCode}; after {overrideEvidence.after.reasonCode}.
            </p>
          )}
        </div>
      )}

      {!canOfferOverride && (
        <p className="mt-5 text-sm text-gray-500">
          The active role cannot override capacity. Only a scoped Warehouse Administrator or System Administrator can record a local reasoned override.
        </p>
      )}
    </section>
  );
}
