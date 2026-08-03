import React, { useMemo, useState } from 'react';
import { planningAppointments } from '../calendar/planningCalendar';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { WarehouseId } from '../demoDomain/demoDomain';
import {
  buildFridayImportPreview,
  createFridayImportTargets,
  fridayImportHeaders,
  type FridayImportPreview,
} from './fridayImport';
import { getAuthorizedFridayImportWarehouseIds } from './FridayImportGuard';

export function FridayImportPage() {
  const {
    activeActor,
    canAccessWorkflowRoute,
    getWarehouseDisplayNames,
  } = useDemoDomain();
  const authorizedWarehouseIds = useMemo(() => getAuthorizedFridayImportWarehouseIds(
    activeActor.warehouseIds,
    canAccessWorkflowRoute,
  ), [activeActor.warehouseIds, canAccessWorkflowRoute]);
  const [warehouseId, setWarehouseId] = useState<WarehouseId>(authorizedWarehouseIds[0]);
  const [preview, setPreview] = useState<FridayImportPreview | null>(null);
  const [reading, setReading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    setPreview(null);
    if (!file) return;
    setReading(true);
    try {
      const text = await file.text();
      const targets = createFridayImportTargets(planningAppointments)
        .filter((target) => target.warehouseCode === warehouseId.toUpperCase());
      setPreview(buildFridayImportPreview({
        fileName: file.name,
        size: file.size,
        text,
        targets,
      }));
    } catch {
      setPreview({
        fileName: file.name,
        groups: [],
        errors: ['The selected file could not be read locally.'],
        counts: {
          EXACT_MATCH: 0,
          NO_MATCH: 0,
          AMBIGUOUS_MATCH: 0,
          INVALID_GROUP: 0,
          DUPLICATE_IMPORT: 0,
        },
      });
    } finally {
      setReading(false);
    }
  };

  return (
    <section aria-labelledby="friday-import-title" className="mx-auto max-w-7xl">
      <header className="mb-6">
        <p className="text-sm font-medium text-[#023466]">Administrator workflow · local preview only</p>
        <h1 id="friday-import-title" className="mt-1 text-2xl font-semibold text-gray-900">
          Friday PO/SKU import preview
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Select a local CSV file to validate and reconcile evidence. Nothing is applied, persisted, scheduled or sent to another system.
        </p>
      </header>

      <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="friday-import-warehouse" className="block text-sm font-semibold text-gray-800">
              Warehouse scope
            </label>
            <select
              id="friday-import-warehouse"
              value={warehouseId}
              onChange={(event) => {
                setWarehouseId(event.target.value as WarehouseId);
                setPreview(null);
              }}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {authorizedWarehouseIds.map((id) => (
                <option key={id} value={id}>{getWarehouseDisplayNames([id])[0]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="friday-import-file" className="block text-sm font-semibold text-gray-800">
              Friday delivery-details CSV
            </label>
            <input
              id="friday-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              aria-describedby="friday-import-help"
              className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#023466] file:px-4 file:py-2 file:font-semibold file:text-white"
            />
          </div>
        </div>
        <p id="friday-import-help" className="mt-4 text-xs leading-5 text-gray-600">
          Required headers, in a stable contract: {fridayImportHeaders.join(', ')}. Maximum 5000 data rows and 524288 bytes. Local browser paths are never displayed.
        </p>
      </div>

      <div aria-live="polite" aria-busy={reading} className="mt-6">
        {reading && <p className="text-sm text-gray-600">Reading and validating the local file…</p>}
        {preview && (
          <section aria-labelledby="friday-import-results" className="space-y-5">
            <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <h2 id="friday-import-results" className="text-lg font-semibold text-gray-900">Preview results</h2>
              <p className="mt-1 text-sm text-gray-600">File: {preview.fileName}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                {Object.entries(preview.counts).map(([outcome, count]) => (
                  <div key={outcome} className="rounded-md border border-gray-200 p-3">
                    <dt className="break-words text-xs font-semibold text-gray-600">{outcome}</dt>
                    <dd className="mt-1 text-xl font-semibold text-gray-900">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {preview.errors.length > 0 && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-900">
                <h3 className="font-semibold">File validation failed</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {preview.errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}

            {preview.groups.map((group) => (
              <article key={group.fingerprint} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.identity.purchaseOrderNumber || 'Invalid PO identity'}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {group.identity.warehouseCode} · {group.identity.supplierCode} · {group.identity.deliveryWeek} · part {group.identity.deliveryPartKey || 'missing'}
                    </p>
                  </div>
                  <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-800">
                    {group.outcome}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-600">Source rows: {group.rowNumbers.join(', ')}</p>
                {group.matchedAppointmentIds.length > 0 && (
                  <p className="mt-1 text-sm text-gray-600">Matched booking evidence: {group.matchedAppointmentIds.join(', ')}</p>
                )}

                {group.diagnostics.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {group.diagnostics.map((diagnostic) => <li key={diagnostic}>{diagnostic}</li>)}
                  </ul>
                )}

                {group.transportConflicts.length > 0 && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <h4 className="font-semibold">Transport reconciliation required</h4>
                    <ul className="mt-2 space-y-1">
                      {group.transportConflicts.map((conflict) => (
                        <li key={conflict.field}>
                          {conflict.field}: existing “{conflict.existingValue}”, imported “{conflict.importedValue}”. No overwrite occurred.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {group.lines.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                      <thead><tr>
                        <th className="px-3 py-2 font-semibold">SKU</th>
                        <th className="px-3 py-2 font-semibold">Description</th>
                        <th className="px-3 py-2 font-semibold">Units</th>
                        <th className="px-3 py-2 font-semibold">Pallets</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.lines.map((line) => (
                          <tr key={`${line.rowNumber}-${line.sku}`}>
                            <td className="px-3 py-2">{line.sku}</td>
                            <td className="px-3 py-2">{line.description}</td>
                            <td className="px-3 py-2">{line.units}</td>
                            <td className="px-3 py-2">{line.pallets}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </section>
  );
}
