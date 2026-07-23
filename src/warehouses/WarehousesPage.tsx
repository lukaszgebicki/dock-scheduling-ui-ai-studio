import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search, Building } from 'lucide-react';
import { demoWarehouses, demoSupplierOrganizations, demoSupplierAssignments } from '../users/demoAccessScope';

export function WarehousesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const summary = useMemo(() => {
    const totalWarehouses = demoWarehouses.length;
    const supplierOrganizations = demoSupplierOrganizations.length;
    let organizationAssignments = 0;

    Object.values(demoSupplierAssignments).forEach((warehouseIds) => {
      organizationAssignments += warehouseIds.length;
    });

    const unassignedWarehouses = demoWarehouses.filter((warehouse) => {
      return !Object.values(demoSupplierAssignments).some((warehouseIds) => warehouseIds.includes(warehouse.id));
    }).length;

    return {
      totalWarehouses,
      supplierOrganizations,
      organizationAssignments,
      unassignedWarehouses
    };
  }, []);

  const filteredWarehouses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return demoWarehouses.filter((w) =>
      w.displayName.toLowerCase().includes(term) || w.id.includes(term)
    ).map((warehouse) => {
      const orgs = demoSupplierOrganizations.filter((org) => {
        const assignedIds = demoSupplierAssignments[org.id] || [];
        return assignedIds.includes(warehouse.id);
      });
      return {
        ...warehouse,
        organizations: orgs
      };
    });
  }, [searchTerm]);

  return (
    <div className="mx-auto min-w-0 max-w-7xl">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Warehouses</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage warehouse locations available for access configuration.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/warehouses/new"
            aria-label="Add warehouse"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#000A32] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add warehouse
          </Link>
        </div>
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
                  <dt className="truncate text-sm font-medium text-gray-500">Total warehouses</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{summary.totalWarehouses}</div>
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
                <Building className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Supplier organizations</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{summary.supplierOrganizations}</div>
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
                <Building2 className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Organization assignments</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{summary.organizationAssignments}</div>
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
                <Building2 className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">Unassigned warehouses</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{summary.unassignedWarehouses}</div>
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
            placeholder="Search warehouse name or ID"
            aria-label="Search warehouse name or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredWarehouses.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:block md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Warehouse
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Stable ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Supplier organizations
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Organization count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredWarehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {warehouse.displayName}
                    </td>
                    <td className="break-all px-3 py-4 text-sm text-gray-500">
                      {warehouse.id}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {warehouse.organizations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {warehouse.organizations.map((org) => (
                            <span key={org.id} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                              {org.displayName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {warehouse.organizations.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="min-w-0 space-y-4 sm:hidden">
            {filteredWarehouses.map((warehouse) => (
              <div key={warehouse.id} className="min-w-0 bg-white px-4 py-5 shadow sm:rounded-lg sm:px-6">
                <h2 className="text-lg font-medium leading-6 text-gray-900">{warehouse.displayName}</h2>
                <div className="mt-2 min-w-0 text-sm text-gray-500">
                  <p className="break-all font-mono text-xs">{warehouse.id}</p>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Supplier organizations ({warehouse.organizations.length})
                  </p>
                  <div className="mt-2">
                    {warehouse.organizations.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {warehouse.organizations.map((org) => (
                          <span key={org.id} className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {org.displayName}
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
          <h2 className="mt-2 text-sm font-semibold text-gray-900">No warehouses found</h2>
          <p className="mt-1 text-sm text-gray-500">No warehouse matches the search.</p>
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
