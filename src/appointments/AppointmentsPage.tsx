import React, { useMemo, useState } from 'react';
import { CalendarClock, Search, X } from 'lucide-react';
import {
  demoSupplierOrganizations,
  demoWarehouses,
  getSupplierOrganizationById,
  getWarehouseById,
  type SupplierOrganizationId,
  type WarehouseId,
} from '../users/demoAccessScope';
import { demoAppointments, type AppointmentStatus } from './demoAppointments';

const appointmentStatuses: readonly AppointmentStatus[] = [
  'Scheduled',
  'Confirmed',
  'Checked in',
  'Completed',
  'Cancelled',
];

const statusClasses: Readonly<Record<AppointmentStatus, string>> = {
  Scheduled: 'bg-gray-100 text-gray-700',
  Confirmed: 'bg-blue-50 text-blue-700',
  'Checked in': 'bg-amber-50 text-amber-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
};

function formatPlannedDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function AppointmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<WarehouseId | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<SupplierOrganizationId | 'all'>('all');

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return demoAppointments.filter((appointment) => {
      const supplier = getSupplierOrganizationById(appointment.supplierOrganizationId);
      const warehouse = getWarehouseById(appointment.warehouseId);
      const matchesSearch = normalizedSearch.length === 0
        || appointment.reference.toLowerCase().includes(normalizedSearch)
        || supplier.displayName.toLowerCase().includes(normalizedSearch)
        || warehouse.displayName.toLowerCase().includes(normalizedSearch);

      return matchesSearch
        && (statusFilter === 'all' || appointment.status === statusFilter)
        && (warehouseFilter === 'all' || appointment.warehouseId === warehouseFilter)
        && (supplierFilter === 'all' || appointment.supplierOrganizationId === supplierFilter);
    });
  }, [searchTerm, statusFilter, supplierFilter, warehouseFilter]);

  const hasActiveFilters = searchTerm.trim() !== ''
    || statusFilter !== 'all'
    || warehouseFilter !== 'all'
    || supplierFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setWarehouseFilter('all');
    setSupplierFilter('all');
  };

  return (
    <div className="mx-auto min-w-0 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review planned dock arrivals across warehouses and supplier organizations.
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label htmlFor="appointment-search" className="block text-sm font-medium text-gray-700">Search</label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" aria-hidden="true" />
              <input
                id="appointment-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Reference, supplier or warehouse"
                className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AppointmentStatus | 'all')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All statuses</option>
              {appointmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="warehouse-filter" className="block text-sm font-medium text-gray-700">Warehouse</label>
            <select
              id="warehouse-filter"
              value={warehouseFilter}
              onChange={(event) => setWarehouseFilter(event.target.value as WarehouseId | 'all')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All warehouses</option>
              {demoWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.displayName}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="supplier-filter" className="block text-sm font-medium text-gray-700">Supplier</label>
            <select
              id="supplier-filter"
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value as SupplierOrganizationId | 'all')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All suppliers</option>
              {demoSupplierOrganizations.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.displayName}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600" role="status" aria-live="polite">
            Showing <span className="font-medium text-gray-900">{filteredAppointments.length}</span> of {demoAppointments.length} appointments
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-[#023466] hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filteredAppointments.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:block md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {['Appointment', 'Supplier', 'Warehouse', 'Planned arrival', 'Delivery type', 'Status'].map((heading) => (
                    <th key={heading} scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900 first:pl-6">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAppointments.map((appointment) => {
                  const supplier = getSupplierOrganizationById(appointment.supplierOrganizationId);
                  const warehouse = getWarehouseById(appointment.warehouseId);
                  return (
                    <tr key={appointment.id}>
                      <td className="whitespace-nowrap py-4 pl-6 pr-4 text-sm font-medium text-gray-900">{appointment.reference}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{supplier.displayName}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{warehouse.displayName}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                        <div>{formatPlannedDate(appointment.plannedDate)}</div>
                        <div className="text-xs text-gray-500">{appointment.plannedTime}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{appointment.deliveryType}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[appointment.status]}`}>
                          {appointment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {filteredAppointments.map((appointment) => {
              const supplier = getSupplierOrganizationById(appointment.supplierOrganizationId);
              const warehouse = getWarehouseById(appointment.warehouseId);
              return (
                <article key={appointment.id} className="rounded-lg bg-white p-4 shadow ring-1 ring-gray-200">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-gray-900">{appointment.reference}</h2>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[appointment.status]}`}>
                      {appointment.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                    <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Supplier</dt><dd className="mt-1 text-gray-900">{supplier.displayName}</dd></div>
                    <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Warehouse</dt><dd className="mt-1 text-gray-900">{warehouse.displayName}</dd></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Arrival</dt><dd className="mt-1 text-gray-900">{formatPlannedDate(appointment.plannedDate)}, {appointment.plannedTime}</dd></div>
                      <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Delivery type</dt><dd className="mt-1 text-gray-900">{appointment.deliveryType}</dd></div>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <CalendarClock className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
          <h2 className="mt-2 text-sm font-semibold text-gray-900">No appointments found</h2>
          <p className="mt-1 text-sm text-gray-500">No appointment matches the selected search and filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
