import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../auth/useAuth';
import {
  Menu, X, LayoutDashboard, Calendar, CalendarClock,
  Users, Building, Bell, ChevronDown, LogOut, Truck
} from 'lucide-react';

interface BreadcrumbInfo {
  parent?: { label: string; to: string };
  current: string;
}

function getBreadcrumb(pathname: string): BreadcrumbInfo {
  switch (pathname) {
    case '/appointments':
      return { current: 'Appointments' };
    case '/users/invite':
      return { parent: { label: 'Users & access', to: '/users' }, current: 'Invite user' };
    case '/warehouses/new':
      return { parent: { label: 'Warehouses', to: '/warehouses' }, current: 'Add warehouse' };
    case '/warehouses':
      return { current: 'Warehouses' };
    case '/supplier-organizations/new':
      return { parent: { label: 'Supplier organizations', to: '/supplier-organizations' }, current: 'Add supplier organization' };
    case '/supplier-organizations':
      return { current: 'Supplier organizations' };
    default:
      return { current: 'Users & access' };
  }
}

export function AuthenticatedShell() {
  const { logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const isAppointmentsRoute = location.pathname.startsWith('/appointments');

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden bg-[#000A32] text-white p-4 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#7FA5D0] flex items-center justify-center font-bold">D</div>
          <span className="font-semibold tracking-wide">Dock Scheduling</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="p-1 hover:bg-[#023466] rounded transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav
        aria-label="Primary navigation"
        className={`${
          mobileMenuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        } md:visible md:translate-x-0 fixed md:sticky top-0 left-0 w-64 h-full bg-[#000A32] text-[#D9D9C4] flex flex-col z-30 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6 hidden md:flex flex-col gap-1 border-b border-[#023466]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded bg-[#7FA5D0] flex items-center justify-center text-[#000A32] font-bold">D</div>
            <span className="font-bold text-white tracking-wide text-lg">Dock Scheduling</span>
          </div>
          <span className="text-sm text-[#7FA5D0]">Operations Portal</span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-6 px-4">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Overview</h2>
            <ul>
              <li>
                <div role="link" aria-disabled="true" className="flex items-center justify-between px-2 py-2 text-gray-500 rounded-lg cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </div>
                  <span className="text-[10px] uppercase bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Scheduling</h2>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  to="/appointments"
                  onClick={closeMobileMenu}
                  aria-current={isAppointmentsRoute ? 'page' : undefined}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                    isAppointmentsRoute
                      ? 'bg-[#023466] text-white font-medium'
                      : 'text-[#D9D9C4] hover:bg-[#023466]/50'
                  }`}
                >
                  <CalendarClock size={18} aria-hidden="true" />
                  <span>Appointments</span>
                </Link>
              </li>
              <li>
                <div role="link" aria-disabled="true" className="flex items-center justify-between px-2 py-2 text-gray-500 rounded-lg cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} />
                    <span>Slot calendar</span>
                  </div>
                  <span className="text-[10px] uppercase bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Administration</h2>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  to="/users"
                  onClick={closeMobileMenu}
                  aria-current={location.pathname.startsWith('/users') ? 'page' : undefined}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                    location.pathname.startsWith('/users')
                      ? 'bg-[#023466] text-white font-medium'
                      : 'text-[#D9D9C4] hover:bg-[#023466]/50'
                  }`}
                >
                  <Users size={18} />
                  <span>Users & access</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/warehouses"
                  onClick={closeMobileMenu}
                  aria-current={location.pathname.startsWith('/warehouses') ? 'page' : undefined}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                    location.pathname.startsWith('/warehouses')
                      ? 'bg-[#023466] text-white font-medium'
                      : 'text-[#D9D9C4] hover:bg-[#023466]/50'
                  }`}
                >
                  <Building size={18} />
                  <span>Warehouses</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/supplier-organizations"
                  onClick={closeMobileMenu}
                  aria-current={location.pathname.startsWith('/supplier-organizations') ? 'page' : undefined}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                    location.pathname.startsWith('/supplier-organizations')
                      ? 'bg-[#023466] text-white font-medium'
                      : 'text-[#D9D9C4] hover:bg-[#023466]/50'
                  }`}
                >
                  <Truck size={18} aria-hidden="true" />
                  <span>Supplier organizations</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-[#023466] bg-[#000620]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#7FA5D0] text-[#000A32] flex items-center justify-center font-bold">DA</div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white leading-tight">Demo administrator</span>
              <span className="text-xs text-gray-400">System administrator</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent hover:bg-white/10 text-white rounded-lg transition-colors border border-white/20 text-sm font-medium"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </nav>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 md:min-h-screen max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-sm z-10">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 hidden sm:inline">{isAppointmentsRoute ? 'Scheduling' : 'Administration'}</span>
            <span className="text-gray-400 hidden sm:inline">/</span>
            {(() => {
              const breadcrumb = getBreadcrumb(location.pathname);
              return breadcrumb.parent ? (
                <>
                  <Link to={breadcrumb.parent.to} className="text-gray-500 hover:text-[#000A32] hidden sm:inline transition-colors">
                    {breadcrumb.parent.label}
                  </Link>
                  <span className="text-gray-400 hidden sm:inline">/</span>
                  <span className="font-medium text-[#000A32]">{breadcrumb.current}</span>
                </>
              ) : (
                <span className="font-medium text-[#000A32]">{breadcrumb.current}</span>
              );
            })()}
          </nav>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 text-sm">
              <Building size={16} className="text-gray-500" />
              <span className="font-medium text-gray-700">All warehouses</span>
              <ChevronDown size={14} className="text-gray-500 ml-1" />
            </div>
            <button type="button" className="text-gray-500 hover:text-[#000A32] transition-colors relative" aria-label="Notifications">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#FF9166] rounded-full border border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#7FA5D0] text-[#000A32] hidden sm:flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
              DA
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
