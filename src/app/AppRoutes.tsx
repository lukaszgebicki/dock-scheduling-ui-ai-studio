import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { PublicOnlyRoute } from '../auth/PublicOnlyRoute';
import { AuthenticatedShell } from './AuthenticatedShell';
import { LoginPage } from '../auth/LoginPage';
import { useAuth } from '../auth/useAuth';
import { AuthBootstrapScreen } from '../auth/AuthBootstrapScreen';
import { ForgotPasswordPage } from '../auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../auth/ResetPasswordPage';
import { demoAuthApi } from '../demo/demoAuthApi';
import { UsersAccessPage } from '../users/UsersAccessPage';
import { InviteUserPage } from '../users/InviteUserPage';
import { WarehousesPage } from '../warehouses/WarehousesPage';
import { AddWarehousePage } from '../warehouses/AddWarehousePage';
import { WarehouseConfigurationPage } from '../warehouses/WarehouseConfigurationPage';
import { SupplierOrganizationsPage } from '../supplierOrganizations/SupplierOrganizationsPage';
import { AddSupplierOrganizationPage } from '../supplierOrganizations/AddSupplierOrganizationPage';
import { SupplierConfigurationPage } from '../supplierOrganizations/SupplierConfigurationPage';
import { AppointmentsPage } from '../appointments/AppointmentsPage';
import { AppointmentDetailsPage } from '../appointments/AppointmentDetailsPage';
import { AppointmentDetailsGuard } from '../appointments/AppointmentDetailsGuard';
import { AppointmentWorkspaceProvider } from '../appointments/AppointmentWorkspaceProvider';
import { SupplierWeeklyBookingPage } from '../appointments/SupplierWeeklyBookingPage';
import { SupplierWeeklyBookingGuard } from '../appointments/SupplierWeeklyBookingGuard';
import { PlanningCalendarPage } from '../calendar/PlanningCalendarPage';
import { planningAppointments } from '../calendar/planningCalendar';
import { FridayImportGuard, getAuthorizedFridayImportWarehouseIds } from '../import/FridayImportGuard';
import { FridayImportPage } from '../import/FridayImportPage';
import {
  WeeklyPlanningGuard,
  getAuthorizedWeeklyPlanningWarehouseIds,
  getWeeklyPlanningWarehouseUniverse,
} from '../weeklyPlanning/WeeklyPlanningGuard';
import { WeeklyPlanningPage } from '../weeklyPlanning/WeeklyPlanningPage';
import { LifecycleGuard, canOpenLifecycleForActor } from '../lifecycle/LifecycleGuard';
import { LifecyclePage } from '../lifecycle/LifecyclePage';
import { GateOpsGuard, getAuthorizedGateWarehouseIds } from '../gateOps/GateOpsGuard';
import { GateOpsPage } from '../gateOps/GateOpsPage';
import { ReportingGuard } from '../reporting/ReportingGuard';
import { ReportingPage } from '../reporting/ReportingPage';
import { canAccessReporting } from '../reporting/reportingDomain';
import { NotificationsPage } from '../notifications/NotificationsPage';
import { DashboardPage } from '../dashboard/DashboardPage';
import { StandingAppointmentsGuard } from '../standingAppointments/StandingAppointmentsGuard';
import { StandingAppointmentsPage } from '../standingAppointments/StandingAppointmentsPage';
import { canAccessStandingAppointments } from '../standingAppointments/standingAppointmentDomain';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { DemoActionGuard } from '../demoDomain/DemoActionGuard';
import { DemoRouteGuard } from '../demoDomain/DemoRouteGuard';

function DefaultDemoRoute() {
  const { defaultRoute } = useDemoDomain();
  return <Navigate to={defaultRoute} replace />;
}

function AppointmentsRoutePage() {
  const {
    activeActor,
    configuration,
    canNavigateWorkflow,
    canAccessWorkflowRoute,
    canViewAppointment,
    resolveWorkflow,
  } = useDemoDomain();
  const supplierOrganizationId = activeActor.supplierOrganizationId;
  const warehouseId = activeActor.warehouseIds[0];
  const canReserveNextWeek = Boolean(
    supplierOrganizationId
    && warehouseId
    && canNavigateWorkflow({
      step: 'SUPPLIER_RESERVE_NEXT_WEEK',
      capability: 'BOOK_APPOINTMENT',
      scope: { supplierOrganizationId, warehouseId },
    }),
  );
  const canPreviewFridayImport = getAuthorizedFridayImportWarehouseIds(
    activeActor.warehouseIds,
    canAccessWorkflowRoute,
  ).length > 0;
  const weeklyPlanningUniverse = getWeeklyPlanningWarehouseUniverse(
    activeActor.role,
    activeActor.warehouseIds,
    configuration.warehouses
      .filter((warehouse) => warehouse.status === 'published')
      .map((warehouse) => warehouse.id),
  );
  const canOpenWeeklyPlanning = getAuthorizedWeeklyPlanningWarehouseIds(
    weeklyPlanningUniverse,
    canAccessWorkflowRoute,
  ).length > 0;
  const canOpenLifecycle = canOpenLifecycleForActor(
    activeActor.role,
    planningAppointments,
    canViewAppointment,
  );
  const canOpenGateOps = getAuthorizedGateWarehouseIds(
    activeActor.userId,
    activeActor.warehouseIds,
    resolveWorkflow,
  ).length > 0;
  const canOpenReporting = canAccessReporting(activeActor.role);
  const canOpenStanding = canAccessStandingAppointments(activeActor.role);

  return (
    <>
      <div className="mx-auto mb-6 flex max-w-7xl flex-wrap justify-end gap-3">
        <Link to="/dashboard" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
          Open role dashboard
        </Link>
        <Link to="/calendar" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
          Open PO planning calendar
        </Link>
        <Link to="/notifications" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
          Open notifications and states
        </Link>
        {canOpenStanding && (
          <Link to="/standing-appointments" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
            Open standing appointment series
          </Link>
        )}
        {canOpenReporting && (
          <Link to="/reports" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
            Open PO/SKU reports
          </Link>
        )}
        {canOpenLifecycle && (
          <Link to="/appointments/lifecycle" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
            Open appointment lifecycle
          </Link>
        )}
        {canOpenGateOps && (
          <Link to="/gate-operations" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
            Open gate operations
          </Link>
        )}
        {canOpenWeeklyPlanning && (
          <Link to="/weekly-planning" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
            Open weekly planning queue
          </Link>
        )}
        {canPreviewFridayImport && (
          <Link to="/imports/friday-details" className="rounded-md border border-[#023466] px-4 py-2 text-sm font-semibold text-[#023466] focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
            Preview Friday CSV
          </Link>
        )}
        {canReserveNextWeek && (
          <Link to="/appointments/reserve-next-week" className="rounded-md bg-[#023466] px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#7FA5D0]">
            Reserve next-week slot
          </Link>
        )}
      </div>
      <AppointmentsPage />
    </>
  );
}

function NotFoundFallback() {
  const { status, isAuthenticated } = useAuth();
  const { defaultRoute } = useDemoDomain();
  if (status === 'bootstrapping') return <AuthBootstrapScreen />;
  if (isAuthenticated) return <Navigate to={defaultRoute} replace />;
  return <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <DemoDomainProvider>
      <AppointmentWorkspaceProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<AuthenticatedShell />}>
              <Route path="/" element={<DefaultDemoRoute />} />
              <Route path="/appointments" element={<DemoRouteGuard route="/appointments"><AppointmentsRoutePage /></DemoRouteGuard>} />
              <Route path="/appointments/:appointmentId" element={<DemoRouteGuard route="/appointments"><AppointmentDetailsGuard><AppointmentDetailsPage /></AppointmentDetailsGuard></DemoRouteGuard>} />
              <Route path="/appointments/reserve-next-week" element={<SupplierWeeklyBookingGuard><SupplierWeeklyBookingPage /></SupplierWeeklyBookingGuard>} />
              <Route path="/appointments/lifecycle" element={<LifecycleGuard><LifecyclePage /></LifecycleGuard>} />
              <Route path="/gate-operations" element={<GateOpsGuard><GateOpsPage /></GateOpsGuard>} />
              <Route path="/calendar" element={<DemoRouteGuard route="/appointments"><PlanningCalendarPage /></DemoRouteGuard>} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportingGuard><ReportingPage /></ReportingGuard>} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/standing-appointments" element={<StandingAppointmentsGuard><StandingAppointmentsPage /></StandingAppointmentsGuard>} />
              <Route path="/imports/friday-details" element={<FridayImportGuard><FridayImportPage /></FridayImportGuard>} />
              <Route path="/weekly-planning" element={<WeeklyPlanningGuard><WeeklyPlanningPage /></WeeklyPlanningGuard>} />
              <Route path="/users" element={<DemoRouteGuard route="/users"><UsersAccessPage /></DemoRouteGuard>} />
              <Route path="/users/invite" element={<DemoActionGuard action="invite-user"><InviteUserPage /></DemoActionGuard>} />
              <Route path="/warehouses" element={<DemoRouteGuard route="/warehouses"><WarehousesPage /></DemoRouteGuard>} />
              <Route path="/warehouses/new" element={<DemoActionGuard action="add-warehouse"><AddWarehousePage /></DemoActionGuard>} />
              <Route path="/warehouses/:warehouseId/configuration" element={<DemoActionGuard action="configure-warehouse"><WarehouseConfigurationPage /></DemoActionGuard>} />
              <Route path="/supplier-organizations" element={<DemoRouteGuard route="/supplier-organizations"><SupplierOrganizationsPage /></DemoRouteGuard>} />
              <Route path="/supplier-organizations/new" element={<DemoActionGuard action="add-supplier-organization"><AddSupplierOrganizationPage /></DemoActionGuard>} />
              <Route path="/supplier-organizations/:supplierOrganizationId/configuration" element={<DemoActionGuard action="configure-supplier-organization"><SupplierConfigurationPage /></DemoActionGuard>} />
            </Route>
          </Route>
          <Route element={<PublicOnlyRoute />}><Route path="/login" element={<LoginPage />} /></Route>
          <Route path="/forgot-password" element={<ForgotPasswordPage api={demoAuthApi} />} />
          <Route path="/reset-password" element={<ResetPasswordPage api={demoAuthApi} />} />
          <Route path="*" element={<NotFoundFallback />} />
        </Routes>
      </AppointmentWorkspaceProvider>
    </DemoDomainProvider>
  );
}
