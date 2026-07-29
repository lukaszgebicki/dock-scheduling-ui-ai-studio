import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import {
  deriveSupplierBookingContract,
  deliveryFlows,
  type ApprovalCondition,
  type SupplierConfiguration,
} from '../demoDomain/configuration';
import {
  getSupplierOrganizationById,
  isSupplierOrganizationId,
  type WarehouseId,
} from '../demoDomain/demoDomain';

function replaceValue<T>(values: readonly T[], value: T, checked: boolean): readonly T[] {
  return checked
    ? values.includes(value) ? values : [...values, value]
    : values.filter((candidate) => candidate !== value);
}

function SupplierConfigurationEditor({
  initialSupplier,
}: {
  initialSupplier: SupplierConfiguration;
}) {
  const {
    configuration,
    getWarehouseDisplayNames,
    publishSupplier,
  } = useDemoDomain();
  const [supplier, setSupplier] = useState(initialSupplier);
  const [authorizeOverride, setAuthorizeOverride] = useState(
    initialSupplier.criticalRuleOverrides.length > 0,
  );
  const [overrideReason, setOverrideReason] = useState(
    initialSupplier.criticalRuleOverrides[0]?.reason ?? '',
  );
  const [error, setError] = useState('');
  const [published, setPublished] = useState(false);
  const organization = getSupplierOrganizationById(supplier.organizationId);
  const assignedCriticalRules = configuration.warehouses
    .filter((warehouse) => supplier.warehouseIds.includes(warehouse.id))
    .flatMap((warehouse) => warehouse.activeCriticalRules)
    .filter((condition, index, all) => all.indexOf(condition) === index);
  const previewConfiguration = {
    ...configuration,
    suppliers: configuration.suppliers.map((candidate) =>
      candidate.organizationId === supplier.organizationId ? supplier : candidate),
  };
  const bookingContract = deriveSupplierBookingContract(
    previewConfiguration,
    supplier.organizationId,
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (supplier.warehouseIds.length === 0) {
      setError('Assign at least one warehouse.');
      return;
    }
    if (supplier.allowedFlows.length === 0) {
      setError('Allow at least one delivery flow.');
      return;
    }
    if (supplier.approvalMode === 'auto'
      && assignedCriticalRules.length > 0
      && (!authorizeOverride || !overrideReason.trim())) {
      setError('Auto approval requires an explicit override reason for active critical rules.');
      return;
    }
    const nextSupplier: SupplierConfiguration = {
      ...supplier,
      criticalRuleOverrides:
        supplier.approvalMode === 'auto' && authorizeOverride
          ? assignedCriticalRules.map((condition) => ({
            condition,
            reason: overrideReason.trim(),
          }))
          : [],
    };
    publishSupplier(nextSupplier);
    setSupplier(nextSupplier);
    setPublished(true);
    setError('');
  };

  const bookingBlocked = !bookingContract.canBook;
  const history = configuration.history.filter((entry) =>
    entry.targetType === 'supplier' && entry.targetId === supplier.organizationId);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/supplier-organizations"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[#023466] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to supplier organizations
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Configure {organization.displayName}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Supplier restrictions and approval settings are local demonstration inputs.
        </p>
      </header>

      {published && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Supplier configuration published in local demo state.
        </div>
      )}
      {error && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000A32]">Profile status</h2>
          <label className="mt-4 block max-w-sm text-sm font-medium text-gray-700">
            Supplier status
            <select
              value={supplier.status}
              onChange={(event) => setSupplier((current) => ({
                ...current,
                status: event.target.value as SupplierConfiguration['status'],
              }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
          <p className={`mt-4 rounded-lg p-3 text-sm ${
            bookingBlocked ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {bookingBlocked
              ? supplier.status !== 'active'
                ? 'Later booking consumers must reject new booking and reschedule attempts.'
                : bookingContract.message
                  ?? 'Later booking consumers must reject new booking and reschedule attempts.'
              : 'Later booking consumers may use assigned warehouses and flows.'}
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <fieldset className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <legend className="text-lg font-semibold text-[#000A32]">Warehouse assignments</legend>
            <div className="mt-4 space-y-3">
              {configuration.warehouses
                .filter((warehouse) => warehouse.status === 'published')
                .map((warehouse) => (
                  <label key={warehouse.id} className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={supplier.warehouseIds.includes(warehouse.id)}
                      onChange={(event) => setSupplier((current) => ({
                        ...current,
                        warehouseIds: replaceValue(
                          current.warehouseIds,
                          warehouse.id,
                          event.target.checked,
                        ) as readonly WarehouseId[],
                      }))}
                    />
                    {warehouse.displayName}
                  </label>
                ))}
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <legend className="text-lg font-semibold text-[#000A32]">Allowed flows</legend>
            <div className="mt-4 space-y-3">
              {deliveryFlows.map((flow) => (
                <label key={flow} className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={supplier.allowedFlows.includes(flow)}
                    onChange={(event) => setSupplier((current) => ({
                      ...current,
                      allowedFlows: replaceValue(
                        current.allowedFlows,
                        flow,
                        event.target.checked,
                      ),
                    }))}
                  />
                  {flow}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000A32]">Approval mode</h2>
          <label className="mt-4 block max-w-sm text-sm font-medium text-gray-700">
            Supplier approval mode
            <select
              value={supplier.approvalMode}
              onChange={(event) => setSupplier((current) => ({
                ...current,
                approvalMode: event.target.value as SupplierConfiguration['approvalMode'],
              }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="inherit">Inherit warehouse rule</option>
              <option value="auto">Auto approve</option>
              <option value="manual">Manual approve</option>
            </select>
          </label>
          {supplier.approvalMode === 'auto' && assignedCriticalRules.length > 0 && (
            <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm text-orange-800">
                Active critical rules: {(assignedCriticalRules as readonly ApprovalCondition[]).join(', ')}.
              </p>
              <label className="mt-3 flex items-center gap-2 text-sm font-medium text-orange-900">
                <input
                  type="checkbox"
                  checked={authorizeOverride}
                  onChange={(event) => setAuthorizeOverride(event.target.checked)}
                />
                Authorize critical-rule override
              </label>
              <label className="mt-3 block text-sm font-medium text-orange-900">
                Override reason
                <input
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-orange-300 bg-white px-3 py-2"
                />
              </label>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#000A32]">Consumer contract summary</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Warehouses</dt>
              <dd className="font-medium text-gray-900">
                {getWarehouseDisplayNames(supplier.warehouseIds).join(', ') || 'None'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Allowed flows</dt>
              <dd className="font-medium text-gray-900">
                {bookingContract.allowedFlows.join(', ') || 'None'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Booking output</dt>
              <dd className="font-medium text-gray-900">
                {bookingContract.canBook ? 'Available' : 'Blocked'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Recorded changes</dt>
              <dd className="font-medium text-gray-900">{history.length}</dd>
            </div>
          </dl>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-[#000A32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#023466]"
          >
            Publish supplier configuration
          </button>
        </div>
      </form>
    </div>
  );
}

export function SupplierConfigurationPage() {
  const { supplierOrganizationId = '' } = useParams();
  const { canViewSupplierOrganization, configuration } = useDemoDomain();
  const id = isSupplierOrganizationId(supplierOrganizationId)
    ? supplierOrganizationId
    : undefined;
  const supplier = id
    ? configuration.suppliers.find((candidate) => candidate.organizationId === id)
    : undefined;

  if (!supplier || !canViewSupplierOrganization(supplier.organizationId)) {
    return <Navigate to="/supplier-organizations" replace />;
  }
  return <SupplierConfigurationEditor initialSupplier={supplier} />;
}
