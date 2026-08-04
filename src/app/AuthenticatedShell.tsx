import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../auth/useAuth';
import {
  Menu, X, LayoutDashboard, Calendar, CalendarClock,
  Users, Building, Bell, ChevronDown, LogOut, Truck
} from 'lucide-react';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { type DemoActorId } from '../demoDomain/demoDomain';
import { ResponsiveRouteNotice } from '../responsive/ResponsiveRouteNotice';

interface BreadcrumbInfo {
  parent?: { label: string; to: string };
  current: string;
}

function getBreadcrumb(pathname: string): BreadcrumbInfo {
  if (/^\/warehouses\/[^/]+\/configuration$/.test(pathname)) {
    return { parent: { label: 'Warehouses', to: '/warehouses' }, current: 'Warehouse configuration' };
  }
  if (/^\/supplier-organizations\/[^/]+\/configuration$/.test(pathname)) {
    return {
      parent: { label: 'Supplier organizations', to: '/supplier-organizations' },
      current: 'Supplier configuration',
    };
  }
  if (/^\/appointments\/[^/]+$/.test(pathname)) {
    return { parent: { label: 'Appointments', to: '/appointments' }, current: 'Appointment details' };
  }
  switch (pathname) {
    case '/dashboard':
      return { current: 'Dashboard' };
    case '/calendar':
      return { current: 'Calendar' };
    case '/notifications':
      return { current: 'Notifications' };
    case '/appointments':
      return { current: 'Appointments' };
    case '/appointments/new':
      return { parent: { label: 'Appointments', to: '/appointments' }, current: 'Create appointment' };
    case '/appointments/manual/new':
      return { parent: { label: 'Appointments', to: '/appointments' }, current: 'Manual appointment' };
    case '/appointments/reserve-next-week':
      return { parent: { label: 'Appointments', to: '/appointments' }, current: 'Reserve next week' };
    case '/appointments/lifecycle':
      return { parent: { label: 'Appointments', to: '/appointments' }, current: 'Lifecycle' };
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
    case '/gate-operations':
      return { current: 'Gate operations' };
    default:
      return { current: 'Users & access' };
  }
}

export function AuthenticatedShell() {
  const { logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    activeActor,
    actors,
    canAccessRoute,
    getWarehouseDisplayNames,
    setActiveActorId,
  } = useDemoDomain();

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const isAppointmentsRoute = location.pathname.startsWith('/appointments');
  const hasAdministrationRoute = canAccessRoute('/users')
    || canAccessRoute('/warehouses')
    || canAccessRoute('/supplier-organizations');

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  const navigationLinkClass = (active: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
      active
        ? 'bg-[#023466] text-white font-medium'
        : 'text-[#D9D9C4] hover:bg-[#023466]/50'
    }`;

  return (
    <div className="flex min-h-screen max-w-full flex-col overflow-x-hidden bg-[#F9FAFB] md:flex-row">
      <div className="z-20 flex min-h-16 items-center justify-between bg-[#000A32] p-4 text-white shadow-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#7FA5D0] font-bold">D</div>
          <span className="font-semibold tracking-wide">Dock Scheduling</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
          className="flex min-h-11 min-w-11 items-center justify-center rounded p-2 transition-colors hover:bg-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <nav
        id="primary-navigation"
        aria-label="Primary navigation"
        className={`${
          mobileMenuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        } fixed left-0 top-0 z-30 flex h-dvh w-72 max-w-[88vw] flex-col bg-[#000A32] text-[#D9D9C4] transition-transform duration-300 ease-in-out md:sticky md:visible md:h-screen md:w-64 md:max-w-none md:translate-x-0`}
      >
        <div className="hidden flex-col gap-1 border-b border-[#023466] p-6 md:flex">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#7FA5D0] font-bold text-[#000A32]">D</div>
            <span className="text-lg font-bold tracking-wide text-white">Dock Scheduling</span>
          </div>
          <span className="text-sm text-[#7FA5D0]">Operations Portal</span>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
          <div>
            <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Overview</h2>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  to="/dashboard"
                  onClick={closeMobileMenu}
                  aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                  className={navigationLinkClass(location.pathname === '/dashboard')}
                >
                  <LayoutDashboard size={18} aria-hidden="true" />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/notifications"
                  onClick={closeMobileMenu}
                  aria-current={location.pathname === '/notifications' ? 'page' : undefined}
                  className={navigationLinkClass(location.pathname === '/notifications')}
                >
                  <Bell size={18} aria-hidden="true" />
                  <span>Notifications</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Scheduling</h2>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  to="/appointments"
                  onClick={closeMobileMenu}
                  aria-current={isAppointmentsRoute ? 'page' : undefined}
                  className={navigationLinkClass(isAppointmentsRoute)}
                >
                  <CalendarClock size={18} aria-hidden="true" />
                  <span>Appointments</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/calendar"
                  onClick={closeMobileMenu}
                  aria-current={location.pathname === '/calendar' ? 'page' : undefined}
                  className={navigationLinkClass(location.pathname === '/calendar')}
                >
                  <Calendar size={18} aria-hidden="true" />
                  <span>Slot calendar</span>
                </Link>
              </li>
            </ul>
          </div>

          {hasAdministrationRoute && (
            <div>
              <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Administration</h2>
              <ul className="flex flex-col gap-1">
                {canAccessRoute('/users') && (
                  <li>
                    <Link
                      to="/users"
                      onClick={closeMobileMenu}
                      aria-current={location.pathname.startsWith('/users') ? 'page' : undefined}
                      className={navigationLinkClass(location.pathname.startsWith('/users'))}
                    >
                      <Users size={18} aria-hidden="true" />
                      <span>Users & access</span>
                    </Link>
                  </li>
                )}
                {canAccessRoute('/warehouses') && (
                  <li>
                    <Link
                      to="/warehouses"
                      onClick={closeMobileMenu}
                      aria-current={location.pathname.startsWith('/warehouses') ? 'page' : undefined}
                      className={navigationLinkClass(location.pathname.startsWith('/warehouses'))}
                    >
                      <Building size={18} aria-hidden="true" />
                      <span>Warehouses</span>
                    </Link>
                  </li>
                )}
                {canAccessRoute('/supplier-organizations') && (
                  <li>
                    <Link
                      to="/supplier-organizations"
                      onClick={closeMobileMenu}
                      aria-current={location.pathname.startsWith('/supplier-organizations') ? 'page' : undefined}
                      className={navigationLinkClass(location.pathname.startsWith('/supplier-organizations'))}
                    >
                      <Truck size={18} aria-hidden="true" />
                      <span>Supplier organizations</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-[#023466] bg-[#000620] p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7FA5D0] font-bold text-[#000A32]">
              {activeActor.displayName
                .split(' ')
                .map((name) => name[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium leading-tight text-white">{activeActor.displayName}</span>
              <span className="truncate text-xs text-gray-400">{activeActor.role}</span>
            </div>
          </div>
          <label htmlFor="demo-role-context" className="block text-xs font-semibold text-gray-300">
            Demo access context
          </label>
          <select
            id="demo-role-context"
            value={activeActor.id}
            onChange={(event) => setActiveActorId(event.target.value as DemoActorId)}
            aria-describedby="demo-role-context-help"
            className="mt-1 min-h-11 w-full rounded border border-white/20 bg-[#000A32] px-2 py-2 text-xs text-white"
          >
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.role} — {actor.displayName}
              </option>
            ))}
          </select>
          <p id="demo-role-context-help" className="mb-4 mt-1 text-[11px] leading-4 text-gray-400">
            UI-only demonstration. This does not change authentication or authorization.
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
          >
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
          aria-label="Close navigation overlay"
        />
      )}

      <div
        aria-hidden={mobileMenuOpen ? true : undefined}
        className="flex min-h-0 max-w-full flex-1 flex-col overflow-x-hidden md:min-h-screen"
      >
        <header className="z-10 flex min-h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-8">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-gray-500 sm:inline">{isAppointmentsRoute ? 'Scheduling' : 'Administration'}</span>
            <span className="hidden text-gray-400 sm:inline">/</span>
            {(() => {
              const breadcrumb = getBreadcrumb(location.pathname);
              return breadcrumb.parent ? (
                <>
                  <Link to={breadcrumb.parent.to} className="hidden text-gray-500 transition-colors hover:text-[#000A32] sm:inline">
                    {breadcrumb.parent.label}
                  </Link>
                  <span className="hidden text-gray-400 sm:inline">/</span>
                  <span className="truncate font-medium text-[#000A32]">{breadcrumb.current}</span>
                </>
              ) : (
                <span className="truncate font-medium text-[#000A32]">{breadcrumb.current}</span>
              );
            })()}
          </nav>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm sm:flex">
              <Building size={16} className="text-gray-500" aria-hidden="true" />
              <span className="max-w-64 truncate font-medium text-gray-700">
                {activeActor.role === 'System Administrator'
                  ? 'All warehouses'
                  : getWarehouseDisplayNames(activeActor.warehouseIds).join(', ')}
              </span>
              <ChevronDown size={14} className="ml-1 text-gray-500" aria-hidden="true" />
            </div>
            <Link
              to="/notifications"
              className="relative flex min-h-11 min-w-11 items-center justify-center rounded text-gray-500 transition-colors hover:text-[#000A32] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]"
              aria-label="Notifications"
            >
              <Bell size={20} aria-hidden="true" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-[#FF9166]" />
            </Link>
            <div className="hidden h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#7FA5D0] text-sm font-bold text-[#000A32] shadow-sm sm:flex">
              {activeActor.displayName
                .split(' ')
                .map((name) => name[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8">
          <ResponsiveRouteNotice pathname={location.pathname} role={activeActor.role} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
