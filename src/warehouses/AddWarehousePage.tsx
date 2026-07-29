import React, { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ArrowLeft, CheckCircle } from 'lucide-react';
import { createWarehouseSchema, type WarehouseFormData } from './warehouseSchema';
import { createWarehouseId } from './warehouseSlug';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { asWarehouseId } from '../demoDomain/demoDomain';

interface SuccessState {
  name: string;
  id: string;
}

export function AddWarehousePage() {
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const { configuration, createWarehouseDraft } = useDemoDomain();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(createWarehouseSchema(configuration.warehouses)),
    defaultValues: {
      name: '',
    },
    mode: 'onBlur',
  });

  const nameValue = watch('name');
  const generatedId = createWarehouseId(nameValue || '');

  const onSubmit = (data: WarehouseFormData) => {
    const id = createWarehouseId(data.name);
    createWarehouseDraft(asWarehouseId(id), data.name.trim());
    setSuccessState({
      name: data.name.trim(),
      id,
    });
  };

  const resetForm = () => {
    reset();
    setSuccessState(null);
  };

  if (successState) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            to="/warehouses"
            className="inline-flex items-center text-sm font-medium text-[#000A32] hover:text-[#023466]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Back to warehouses
          </Link>
        </div>

        <div className="rounded-md bg-green-50 p-6 shadow-sm ring-1 ring-green-500/20" role="region" aria-live="polite">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-4">
              <h1 className="text-lg font-medium text-green-800">Warehouse prepared</h1>
              <div className="mt-2 text-sm text-green-700">
                <p>The warehouse draft is ready for configuration.</p>
                <p className="mt-1 font-semibold">
                  Demo mode: this change exists only in local memory and will reset on reload.
                </p>
              </div>

              <div className="mt-6 border-t border-green-200 pt-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-green-800">Warehouse name</dt>
                    <dd className="mt-1 text-sm text-green-900">{successState.name}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-green-800">Warehouse ID</dt>
                    <dd className="mt-1 text-sm text-green-900 font-mono">{successState.id}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-green-800">Supplier organization access</dt>
                    <dd className="mt-1 text-sm text-green-900">Not configured</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-8 flex space-x-4 flex-wrap gap-y-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  Prepare another warehouse
                </button>
                <Link
                  to={`/warehouses/${successState.id}/configuration`}
                  className="rounded-md bg-green-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-600"
                >
                  Configure warehouse
                </Link>
                <Link
                  to="/warehouses"
                  className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 shadow-sm ring-1 ring-inset ring-green-600/20 hover:bg-green-100"
                >
                  Back to warehouses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <Link
          to="/warehouses"
          className="inline-flex items-center text-sm font-medium text-[#000A32] hover:text-[#023466]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Back to warehouses
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Add warehouse</h1>
        <p className="mt-2 text-sm text-gray-600">
          Define the warehouse name and stable system identifier.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Warehouse name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="name"
                      {...register('name')}
                      aria-invalid={errors.name ? 'true' : 'false'}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      className={`block w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border ${
                        errors.name
                          ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-[#7FA5D0] focus:ring-[#7FA5D0]'
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600" id="name-error" role="alert">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="warehouse-id" className="block text-sm font-medium text-gray-700">
                    Warehouse ID
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="warehouse-id"
                      value={generatedId}
                      readOnly
                      className="block w-full rounded-md shadow-sm sm:text-sm py-2 px-3 border border-gray-300 bg-gray-50 text-gray-500 focus:border-[#7FA5D0] focus:ring-[#7FA5D0] font-mono"
                    />
                  </div>
                </div>

                <div className="pt-5 border-t border-gray-200 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent bg-[#000A32] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:ring-offset-2"
                  >
                    Prepare warehouse
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white shadow sm:rounded-lg sticky top-8">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                Summary
              </h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Warehouse name</dt>
                  <dd className="mt-1 text-sm text-gray-900 break-words">
                    {nameValue?.trim() || <span className="text-gray-400 italic">Not selected</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Warehouse ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                    {generatedId || <span className="text-gray-400 italic">Not generated</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Supplier organization access</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className="text-gray-400 italic">Not configured</span>
                  </dd>
                </div>
              </dl>

              <div className="mt-6 rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      Supplier organization access will be configured separately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
