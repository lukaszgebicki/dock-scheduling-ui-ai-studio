import React, { useState, useMemo } from 'react';
import { Users, UserCheck, UserX, Truck, Search, X, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { demoUsers, UserRole, UserStatus } from './demoUsers';

export function UsersAccessPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All roles'>('All roles');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'All statuses'>('All statuses');
  const [orgFilter, setOrgFilter] = useState<string>('All organizations');

  const organizations = useMemo(() => {
    const orgs = Array.from(new Set(demoUsers.map(u => u.organization)));
    return ['All organizations', ...orgs];
  }, []);

  const filteredUsers = useMemo(() => {
    return demoUsers.filter(user => {
      const matchSearch = search.toLowerCase() === '' ||
        user.fullName.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());

      const matchRole = roleFilter === 'All roles' || user.role === roleFilter;
      const matchStatus = statusFilter === 'All statuses' || user.status === statusFilter;
      const matchOrg = orgFilter === 'All organizations' || user.organization === orgFilter;

      return matchSearch && matchRole && matchStatus && matchOrg;
    });
  }, [search, roleFilter, statusFilter, orgFilter]);

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('All roles');
    setStatusFilter('All statuses');
    setOrgFilter('All organizations');
  };

  const totalUsers = demoUsers.length;
  const activeUsers = demoUsers.filter(u => u.status === 'Active').length;
  const inactiveUsers = demoUsers.filter(u => u.status === 'Inactive').length;
  const supplierAccounts = demoUsers.filter(u => u.accountType === 'Supplier').length;

  return (
    <div className="max-w-7xl mx-auto w-full">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#000A32]">Users & access</h1>
          <p className="text-[#023466] mt-1">Manage accounts, roles, organizations and warehouse access.</p>
        </div>
        <Link
          to="/users/invite"
          className="bg-[#023466] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#000A32] transition-colors whitespace-nowrap self-start sm:self-auto flex items-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-[#023466] outline-none"
        >
          <UserPlus size={20} />
          Invite user
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-[#023466] rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total users</p>
            <p className="text-2xl font-bold text-[#000A32]">{totalUsers}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-700 rounded-lg">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active users</p>
            <p className="text-2xl font-bold text-[#000A32]">{activeUsers}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-gray-50 text-gray-500 rounded-lg">
            <UserX size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Inactive users</p>
            <p className="text-2xl font-bold text-[#000A32]">{inactiveUsers}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-[#FF9166] rounded-lg">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Supplier accounts</p>
            <p className="text-2xl font-bold text-[#000A32]">{supplierAccounts}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              aria-label="Search name or email"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'All roles')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] outline-none"
            >
              <option value="All roles">All roles</option>
              <option value="Administrator">Administrator</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Security">Security</option>
              <option value="Warehouse manager">Warehouse manager</option>
              <option value="Supplier">Supplier</option>
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'All statuses')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] outline-none"
            >
              <option value="All statuses">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              aria-label="Filter by organization"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7FA5D0] focus:border-[#023466] outline-none"
            >
              {organizations.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>

            {(search || roleFilter !== 'All roles' || statusFilter !== 'All statuses' || orgFilter !== 'All organizations') && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-[#023466] hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                <X size={16} />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {filteredUsers.length > 0 ? (
          <>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Warehouse access</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#D9D9C4] text-[#023466] font-semibold flex items-center justify-center shrink-0">
                            {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-[#000A32]">{user.fullName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#000A32]">{user.organization}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.warehouseAccess}</td>
                      <td className="px-6 py-4">
                        {user.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{user.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#D9D9C4] text-[#023466] font-semibold flex items-center justify-center shrink-0">
                      {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-[#000A32]">{user.fullName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Organization</div>
                    <div className="font-medium">{user.organization}</div>

                    <div className="text-gray-500">Role</div>
                    <div><span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">{user.role}</span></div>

                    <div className="text-gray-500">Access</div>
                    <div className="truncate">{user.warehouseAccess}</div>

                    <div className="text-gray-500">Status</div>
                    <div>
                      {user.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing 1–{filteredUsers.length} of {filteredUsers.length} users
              </p>
              <div className="flex gap-2">
                <button type="button" disabled className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed bg-white">Previous</button>
                <button type="button" disabled className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed bg-white">Next</button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-bold text-[#000A32] mb-1">No users found</h3>
            <p className="text-gray-500 mb-6">Try changing your search or filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-[#023466] hover:bg-gray-50 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
