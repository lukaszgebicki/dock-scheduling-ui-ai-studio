import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Info, CheckCircle2 } from 'lucide-react';
import { inviteUserSchema, InviteUserFormData } from './inviteUserSchema';
import { demoUsers } from './demoUsers';
import {
  demoWarehouses,
  demoSupplierOrganizations,
  getSupplierOrganizationById,
  getSupplierWarehouseDisplayNames,
  getWarehouseDisplayNames,
  isSupplierOrganizationId,
} from './demoAccessScope';

export function InviteUserPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<InviteUserFormData | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: undefined,
      organization: '',
      warehouseAccess: [],
    },
  });

  const selectedRole = watch('role');
  const watchedFullName = watch('fullName');
  const watchedEmail = watch('email');
  const watchedOrg = watch('organization');
  const watchedWarehouses = watch('warehouseAccess');

  useEffect(() => {
    if (selectedRole === 'Supplier') {
      if (watchedOrg === 'Pernod Ricard Poland') {
        setValue('organization', '');
      }
      setValue('warehouseAccess', []);
    } else if (selectedRole) {
      setValue('organization', 'Pernod Ricard Poland');
      if (selectedRole === 'Administrator') {
        setValue('warehouseAccess', []);
      }
    }
  }, [selectedRole, setValue, watchedOrg]);

  const onSubmit = async (data: InviteUserFormData) => {
    // Artificial slight delay to show the 'Preparing invitation...' state
    await new Promise((resolve) => setTimeout(resolve, 500));

    setSubmittedData(data);
    setIsSuccess(true);
  };

  const handleInviteAnother = () => {
    reset({
      fullName: '',
      email: '',
      role: undefined,
      organization: '',
      warehouseAccess: [],
    });
    setIsSuccess(false);
    setSubmittedData(null);
  };

  const getAccountType = (role?: string) => {
    if (!role) return 'Not selected';
    return role === 'Supplier' ? 'Supplier account' : 'Internal account';
  };

  const getOrganizationDisplay = () => {
    if (selectedRole === 'Supplier') {
      return watchedOrg && isSupplierOrganizationId(watchedOrg)
        ? getSupplierOrganizationById(watchedOrg).displayName
        : 'Not selected';
    }
    if (selectedRole) {
      return 'Pernod Ricard Poland';
    }
    return 'Not selected';
  };

  const getWarehouseAccessDisplay = () => {
    if (selectedRole === 'Administrator') return 'All warehouses';
    if (selectedRole === 'Supplier') {
      if (!watchedOrg || !isSupplierOrganizationId(watchedOrg)) return 'Not selected';
      const inherited = getSupplierWarehouseDisplayNames(watchedOrg);
      return inherited.length > 0 ? inherited.join(', ') : 'Not selected';
    }
    if (watchedWarehouses && watchedWarehouses.length > 0) {
      return getWarehouseDisplayNames(watchedWarehouses).join(', ');
    }
    return 'Not selected';
  };

  if (isSuccess && submittedData) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Link
          to="/users"
          className="inline-flex items-center gap-1 text-[#023466] hover:underline mb-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] rounded px-1"
        >
          <ChevronLeft size={16} />
          Back to users
        </Link>

        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center" role="region" aria-live="polite">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#000A32] mb-2">Invitation prepared</h1>
          <p className="text-gray-600 mb-6">The invitation details were validated successfully.</p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-left flex items-start gap-3">
            <Info size={20} className="text-[#023466] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#023466]">Demo mode: no email was sent and no account was created.</p>
            </div>
          </div>

          <div className="text-left bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">Full name</dt>
                <dd className="font-medium text-[#000A32]">{submittedData.fullName}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Work email</dt>
                <dd className="font-medium text-[#000A32]">{submittedData.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Role</dt>
                <dd className="font-medium text-[#000A32]">{submittedData.role}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Organization</dt>
                <dd className="font-medium text-[#000A32]">
                  {submittedData.role === 'Supplier' && submittedData.organization && isSupplierOrganizationId(submittedData.organization)
                    ? getSupplierOrganizationById(submittedData.organization).displayName
                    : submittedData.organization}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500 mb-1">Warehouse access</dt>
                <dd className="font-medium text-[#000A32]">
                  {submittedData.role === 'Administrator' ? 'All warehouses' :
                   submittedData.role === 'Supplier' ? (submittedData.organization && isSupplierOrganizationId(submittedData.organization) ? getSupplierWarehouseDisplayNames(submittedData.organization).join(', ') : 'Not selected') :
                   submittedData.warehouseAccess ? getWarehouseDisplayNames(submittedData.warehouseAccess).join(', ') : ''}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleInviteAnother}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#023466] text-white rounded-lg font-medium hover:bg-[#000A32] transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] outline-none"
            >
              Invite another user
            </button>
            <Link
              to="/users"
              className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-[#000A32] rounded-lg font-medium hover:bg-gray-50 transition-colors text-center focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] outline-none"
            >
              Back to users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/users"
        className="inline-flex items-center gap-1 text-[#023466] hover:underline mb-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] rounded px-1"
      >
        <ChevronLeft size={16} />
        Back to users
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#000A32] mb-2">Invite user</h1>
        <p className="text-[#023466]">Configure the account role, organization and warehouse access.</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 flex items-start gap-3">
        <Info size={20} className="text-[#023466] shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-bold text-[#023466] mb-1">Demo mode</h2>
          <p className="text-sm text-[#023466]">This preview validates the invitation experience only. No account or email will be created.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-2/3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>

            {/* Account Details Section */}
            <section data-testid="account-details-section" className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-[#000A32] mb-1">Account details</h2>
              <p className="text-sm text-gray-500 mb-6">Basic information for the new user.</p>

              <div className="space-y-5">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-[#000A32] mb-1.5">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    {...register('fullName')}
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] text-sm ${
                      errors.fullName ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.fullName && (
                    <p id="fullName-error" className="mt-1.5 text-sm text-red-600" role="alert">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#000A32] mb-1.5">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] text-sm ${
                      errors.email ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && (
                    <p id="email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Role and organization Section */}
            <section data-testid="role-organization-section" className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-[#000A32] mb-1">Role and organization</h2>
              <p className="text-sm text-gray-500 mb-6">Define the user's operational role and corporate affiliation.</p>

              <div className="space-y-5">
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-[#000A32] mb-1.5">
                    Role
                  </label>
                  <select
                    id="role"
                    {...register('role')}
                    aria-invalid={!!errors.role}
                    aria-describedby={errors.role ? "role-error" : undefined}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] text-sm bg-white ${
                      errors.role ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select...</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Security">Security</option>
                    <option value="Warehouse manager">Warehouse manager</option>
                    <option value="Supplier">Supplier</option>
                  </select>
                  {errors.role && (
                    <p id="role-error" className="mt-1.5 text-sm text-red-600" role="alert">
                      {errors.role.message}
                    </p>
                  )}
                </div>

                {selectedRole === 'Supplier' && (
                  <div>
                    <label htmlFor="organization" className="block text-sm font-medium text-[#000A32] mb-1.5">
                      Organization
                    </label>
                    <select
                      id="organization"
                      {...register('organization')}
                      aria-invalid={!!errors.organization}
                      aria-describedby={errors.organization ? "organization-error" : undefined}
                      className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] text-sm bg-white ${
                        errors.organization ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select...</option>
                      {demoSupplierOrganizations.map(org => (
                        <option key={org.id} value={org.id}>{org.displayName}</option>
                      ))}
                    </select>
                    {errors.organization && (
                      <p id="organization-error" className="mt-1.5 text-sm text-red-600" role="alert">
                        {errors.organization.message}
                      </p>
                    )}
                  </div>
                )}

                {selectedRole && selectedRole !== 'Supplier' && (
                  <div>
                    <label htmlFor="organization-readonly" className="block text-sm font-medium text-[#000A32] mb-1.5">
                      Organization
                    </label>
                    <input
                      id="organization-readonly"
                      type="text"
                      value="Pernod Ricard Poland"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg shadow-sm text-sm cursor-not-allowed focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Warehouse access Section */}
            <section data-testid="warehouse-access-section" className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-[#000A32] mb-1">Warehouse access</h2>
              {selectedRole === 'Supplier' ? (
                <p className="text-sm text-gray-500 mb-6">Warehouse access is inherited from the supplier organization.</p>
              ) : (
                <p className="text-sm text-gray-500 mb-6">Select which facilities this user can access.</p>
              )}

              {!selectedRole && (
                <p className="text-sm text-gray-500 italic">Select a role to configure warehouse access.</p>
              )}

              {selectedRole === 'Administrator' && (
                <p className="text-sm font-medium text-[#000A32]">All warehouses</p>
              )}

              {selectedRole === 'Supplier' && (
                <div className="space-y-2">
                  {!watchedOrg ? (
                    <p className="text-sm font-medium text-gray-500 italic">Not selected</p>
                  ) : (
                    <ul data-testid="supplier-warehouse-list" className="text-sm font-medium text-[#000A32] list-disc list-inside">
                      {isSupplierOrganizationId(watchedOrg) && getSupplierWarehouseDisplayNames(watchedOrg).map((wh) => (
                        <li key={wh}>{wh}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {['Warehouse', 'Security', 'Warehouse manager'].includes(selectedRole || '') && (
                <fieldset
                  aria-invalid={errors.warehouseAccess ? 'true' : undefined}
                  aria-describedby={errors.warehouseAccess ? 'warehouse-access-error' : undefined}
                >
                  <legend className="sr-only">Warehouse locations</legend>
                  <div className="space-y-3">
                    {demoWarehouses.map((warehouse) => (
                      <label key={warehouse.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          value={warehouse.id}
                          {...register('warehouseAccess')}
                          aria-describedby={errors.warehouseAccess ? 'warehouse-access-error' : undefined}
                          className="w-4 h-4 text-[#023466] border-gray-300 rounded focus:ring-[#7FA5D0]"
                        />
                        <span className="text-sm text-[#000A32]">{warehouse.displayName}</span>
                      </label>
                    ))}
                  </div>
                  {errors.warehouseAccess && (
                    <p id="warehouse-access-error" className="mt-2 text-sm text-red-600" role="alert">
                      {errors.warehouseAccess.message}
                    </p>
                  )}
                </fieldset>
              )}
            </section>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#023466] text-white rounded-lg font-medium hover:bg-[#000A32] transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] outline-none"
              >
                {isSubmitting ? 'Preparing invitation…' : 'Prepare invitation'}
              </button>
              <Link
                to="/users"
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
            <h2 className="text-lg font-bold text-[#000A32] mb-6">Access summary</h2>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">Name</dt>
                <dd className={`font-medium ${watchedFullName?.trim() ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {watchedFullName?.trim() || 'Not selected'}
                </dd>
              </div>

              <div>
                <dt className="text-gray-500 mb-1">Email</dt>
                <dd className={`font-medium truncate ${watchedEmail?.trim() ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {watchedEmail?.trim() || 'Not selected'}
                </dd>
              </div>

              <div>
                <dt className="text-gray-500 mb-1">Account type</dt>
                <dd className={`font-medium ${selectedRole ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {getAccountType(selectedRole)}
                </dd>
              </div>

              <div>
                <dt className="text-gray-500 mb-1">Role</dt>
                <dd className={`font-medium ${selectedRole ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {selectedRole || 'Not selected'}
                </dd>
              </div>

              <div>
                <dt className="text-gray-500 mb-1">Organization</dt>
                <dd className={`font-medium ${getOrganizationDisplay() !== 'Not selected' ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {getOrganizationDisplay()}
                </dd>
              </div>

              <div>
                <dt className="text-gray-500 mb-1">Warehouse access</dt>
                <dd className={`font-medium leading-relaxed ${getWarehouseAccessDisplay() !== 'Not selected' ? 'text-[#000A32]' : 'text-gray-400 italic'}`}>
                  {getWarehouseAccessDisplay()}
                </dd>
              </div>
            </dl>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex items-start gap-2">
                <span className="text-[#FF9166] mt-0.5">●</span>
                Access will be limited to the selected organization and warehouse scope.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
