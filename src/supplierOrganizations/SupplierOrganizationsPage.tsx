import React, { useState } from 'react';
import { Link } from 'react-router';
import { Building2, Warehouse, Layers, AlertCircle, Plus, Search, Settings } from 'lucide-react';
import { demoSupplierOrganizations } from '../users/demoAccessScope';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';

export function SupplierOrganizationsPage() {
  const {
    canPerformAction,
    canViewSupplierOrganization,
    canViewWarehouse,
    configuration,
    getWarehouseDisplayNames,
  } = useDemoDomain();
  const [searchTerm, setSearchTerm] = useState('');
  const scopedOrganizations = demoSupplierOrganizations
    .filter((organization) => canViewSupplierOrganization(organization.id));
  let warehouseAssignments = 0;
  let multiWarehouseOrganizations = 0;
  let organizationsWithoutAccess = 0;

  scopedOrganizations.forEach((organization) => {
    const assignedIds = (configuration.suppliers
      .find((supplier) => supplier.organizationId === organization.id)?.warehouseIds ?? [])
      .filter(canViewWarehouse);
    warehouseAssignments += assignedIds.length;
    if (assignedIds.length > 1) {
      multiWarehouseOrganizations += 1;
    }
    if (assignedIds.length === 0) {
      organizationsWithoutAccess += 1;
    }
  });

  const summary = {
    totalOrganizations: scopedOrganizations.length,
    warehouseAssignments,
    multiWarehouseOrganizations,
    organizationsWithoutAccess,
  };
  const term = searchTerm.trim().toLowerCase();
  const filteredOrganizations = scopedOrganizations
    .filter((organization) =>
      organization.displayName.toLowerCase().includes(term)
      || organization.id.toLowerCase().includes(term))
    .map((organization) => {
      const supplierConfiguration = configuration.suppliers.find((supplier) =>
        supplier.organizationId === organization.id);
      const warehouseIdsForOrganization = (supplierConfiguration?.warehouseIds ?? [])
        .filter(canViewWarehouse);
      return {
        ...organization,
        warehouseNames: getWarehouseDisplayNames(warehouseIdsForOrganization),
        status: supplierConfiguration?.status ?? 'inactive',
      };
    });

  return (
    <div className="mx-auto min-w-0 max-w-7xl">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Supplier organizations</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage supplier organizations and their inherited warehouse access.
          </p>
        </div>
        {canPerformAction('add-supplier-organization') && <div className="mt-4 sm:mt-0">
          <Link
            to="/supplier-organizations/new"
            aria-label="Add supplier organization"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#000A32] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add supplier organization
          </Link>
        </div>}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Total organizations</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{summary.totalOrganizations}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Warehouse className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Warehouse assignments</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{summary.warehouseAssignments}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Layers className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Multi-warehouse organizations</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{summary.multiWarehouseOrganizations}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Organizations without access</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{summary.organizationsWithoutAccess}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative rounded-md shadow-sm max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            name="search"
            id="search"
            className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border"
            placeholder="Search organization name or ID"
            aria-label="Search organization name or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredOrganizations.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:block md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Supplier organization
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Stable ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Warehouse access
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Warehouse count
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Configuration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredOrganizations.map((org) => (
                  <tr key={org.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {org.displayName}
                    </td>
                    <td className="break-all px-3 py-4 text-sm text-gray-500">
                      {org.id}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {org.warehouseNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {org.warehouseNames.map((name) => (
                            <span key={name} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {org.warehouseNames.length}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {canPerformAction('configure-supplier-organization') && (
                        <Link
                          to={`/supplier-organizations/${org.id}/configuration`}
                          className="inline-flex items-center gap-1 font-medium text-[#023466] hover:underline"
                        >
                          <Settings className="h-4 w-4" aria-hidden="true" />
                          Configure
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="min-w-0 space-y-4 sm:hidden">
            {filteredOrganizations.map((org) => (
              <div key={org.id} className="min-w-0 bg-white px-4 py-5 shadow sm:rounded-lg sm:px-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">{org.displayName}</h2>
                <div className="mt-2 min-w-0 text-sm text-gray-500">
                  <p className="break-all font-mono text-xs">{org.id}</p>
                  <p className="mt-1 capitalize">{org.status}</p>
                </div>
                {canPerformAction('configure-supplier-organization') && (
                  <Link
                    to={`/supplier-organizations/${org.id}/configuration`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#023466] hover:underline"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Configure organization
                  </Link>
                )}
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Warehouse access ({org.warehouseNames.length})
                  </p>
                  <div className="mt-2">
                    {org.warehouseNames.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {org.warehouseNames.map((name) => (
                          <span key={name} className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">None</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center rounded-lg border-2 border-dashed border-gray-300 p-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
          <h2 className="mt-2 text-sm font-semibold text-gray-900">No supplier organizations found</h2>
          <p className="mt-1 text-sm text-gray-500">No supplier organization matches the search.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Clear search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
