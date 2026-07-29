import React, { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Info, CheckCircle2 } from 'lucide-react';
import { supplierOrganizationSchema, SupplierOrganizationFormData, SupplierOrganizationSubmitValues } from './supplierOrganizationSchema';
import { createSupplierOrganizationId } from './supplierOrganizationSlug';
import { demoWarehouses, WarehouseId } from '../users/demoAccessScope';

interface SuccessState {
  name: string;
  id: string;
  warehouseAccess: WarehouseId[];
}

const defaultValues: SupplierOrganizationFormData = {
  name: '',
  warehouseAccess: [],
};

export function AddSupplierOrganizationPage() {
  const [successState, setSuccessState] = useState<SuccessState | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<SupplierOrganizationFormData, unknown, SupplierOrganizationSubmitValues>({
    resolver: zodResolver(supplierOrganizationSchema),
    defaultValues,
  });

  const watchedName = watch('name') || '';
  const watchedWarehouseAccess = watch('warehouseAccess') || [];
  const trimmedName = watchedName.trim();
  const generatedId = createSupplierOrganizationId(trimmedName);
  const selectedWarehouseNames = demoWarehouses
    .filter((warehouse) => watchedWarehouseAccess.includes(warehouse.id))
    .map((warehouse) => warehouse.displayName);

  const onSubmit = (data: SupplierOrganizationSubmitValues) => {
    const normalizedWarehouseAccess = demoWarehouses
      .filter((warehouse) => data.warehouseAccess.some((id) => id === warehouse.id))
      .map((warehouse) => warehouse.id);

    setSuccessState({
      name: data.name,
      id: createSupplierOrganizationId(data.name),
      warehouseAccess: normalizedWarehouseAccess,
    });
  };

  const resetForm = () => {
    reset(defaultValues);
    setSuccessState(null);
  };

  if (successState) {
    const successWarehouseNames = demoWarehouses
      .filter((warehouse) => successState.warehouseAccess.includes(warehouse.id))
      .map((warehouse) => warehouse.displayName);

    return (
      <div className="max-w-2xl mx-auto py-8">
        <Link
          to="/supplier-organizations"
          className="inline-flex items-center gap-1 text-[#023466] hover:underline mb-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] rounded px-1"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Back to supplier organizations
        </Link>

        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center" role="region" aria-live="polite">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-[#000A32] mb-2">Supplier organization prepared</h1>
          <p className="text-gray-600 mb-6">The supplier organization details were validated successfully.</p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-left flex items-start gap-3">
            <Info size={20} className="text-[#023466] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-[#023466]">Demo mode: no supplier organization was created and no data was saved.</p>
            </div>
          </div>

          <div className="text-left bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">Supplier organization name</dt>
                <dd className="font-medium text-[#000A32] break-words">{successState.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Organization ID</dt>
                <dd className="font-medium text-[#000A32] font-mono break-all">{successState.id}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500 mb-1">Warehouse access</dt>
                <dd className="font-medium text-[#000A32]">
                  {successWarehouseNames.length > 0 ? successWarehouseNames.join(', ') : 'None'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#023466] text-white rounded-lg font-medium hover:bg-[#000A32] transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] outline-none"
            >
              Prepare another organization
            </button>
            <Link
              to="/supplier-organizations"
              className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-[#000A32] rounded-lg font-medium hover:bg-gray-50 transition-colors text-center focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] outline-none"
            >
              Back to supplier organizations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/supplier-organizations"
        className="inline-flex items-center gap-1 text-[#023466] hover:underline mb-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] rounded px-1"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back to supplier organizations
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#000A32] mb-2">Add supplier organization</h1>
        <p className="text-[#023466]">Define the organization identity and inherited warehouse access.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-2/3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>

            {/* Supplier organization identity Section */}
            <section data-testid="identity-section" className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-[#000A32] mb-1">Supplier organization identity</h2>
              <p className="text-sm text-gray-500 mb-6">Name the organization and review its generated stable ID.</p>

              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#000A32] mb-1.5">
                    Supplier organization name
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] text-sm ${
                      errors.name ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p id="name-error" className="mt-1.5 text-sm text-red-600" role="alert">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="organization-id" className="block text-sm font-medium text-[#000A32] mb-1.5">
                    Organization ID
                  </label>
                  <input
                    id="organization-id"
                    type="text"
                    value={generatedId}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg shadow-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466]"
                  />
                </div>
              </div>
            </section>

            {/* Warehouse access Section */}
            <section data-testid="warehouse-access-section" className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-[#000A32] mb-1">Warehouse access</h2>
              <p className="text-sm text-gray-500 mb-6">Select which warehouses this organization's supplier users will access.</p>

              <fieldset
                aria-invalid={errors.warehouseAccess ? 'true' : undefined}
                aria-describedby={errors.warehouseAccess ? 'warehouse-access-error' : undefined}
              >
                <legend className="text-sm font-medium text-[#000A32] mb-3">Warehouse access</legend>
                <div className="space-y-3">
                  {demoWarehouses.map((warehouse) => (
                    <label key={warehouse.id} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        value={warehouse.id}
                        {...register('warehouseAccess')}
                        aria-describedby={errors.warehouseAccess ? 'warehouse-access-error' : undefined}
                        className="mt-0.5 w-4 h-4 text-[#023466] border-gray-300 rounded focus:ring-[#7FA5D0]"
                      />
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-[#000A32]">{warehouse.displayName}</span>
                        <span className="text-xs text-gray-500 font-mono" aria-hidden="true">{warehouse.id}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.warehouseAccess && (
                  <p id="warehouse-access-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.warehouseAccess.message}
                  </p>
                )}
              </fieldset>
            </section>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#023466] text-white rounded-lg font-medium hover:bg-[#000A32] transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] outline-none"
              >
                Prepare organization
              </button>
              <Link
                to="/supplier-organizations"
                className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-[#000A32] rounded-lg font-medium hover:bg-gray-50 transition-colors text-center focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] outline-none"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Live Summary Card */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-24">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-[#000A32] mb-6">Summary</h2>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">Supplier organization name</dt>
                <dd className={`font-medium break-words ${trimmedName ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {trimmedName || 'Not selected'}
                </dd>
              </div>

              <div>
                <dt className="text-gray-500 mb-1">Organization ID</dt>
                <dd className={`font-medium font-mono break-all ${generatedId ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {generatedId || 'Not generated'}
                </dd>
              </div>

              <div>
                <dt className="text-gray-500 mb-1">Warehouse access</dt>
                <dd className={`font-medium leading-relaxed ${selectedWarehouseNames.length > 0 ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {selectedWarehouseNames.length > 0 ? selectedWarehouseNames.join(', ') : 'Not selected'}
                </dd>
              </div>
            </dl>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex items-start gap-2">
                <span className="text-[#FF9166] mt-0.5" aria-hidden="true">●</span>
                <span>Supplier users will inherit the warehouse access assigned to their organization.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
