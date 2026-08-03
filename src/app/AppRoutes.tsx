import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
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
import { SupplierWeeklyBookingPage } from '../appointments/SupplierWeeklyBookingPage';
import { SupplierWeeklyBookingGuard } from '../appointments/SupplierWeeklyBookingGuard';
import { DemoDomainProvider, useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { DemoActionGuard } from '../demoDomain/DemoActionGuard';
import { DemoRouteGuard } from '../demoDomain/DemoRouteGuard';

function DefaultDemoRoute() {
  const { defaultRoute } = useDemoDomain();
  return <Navigate to={defaultRoute} replace />;
}

function NotFoundFallback() {
  const { status, isAuthenticated } = useAuth();
  const { defaultRoute } = useDemoDomain();

  if (status === 'bootstrapping') {
    return <AuthBootstrapScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={defaultRoute} replace />;
  }

  return <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <DemoDomainProvider>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<AuthenticatedShell />}>
            <Route path="/" element={<DefaultDemoRoute />} />
            <Route
              path="/appointments"
              element={<DemoRouteGuard route="/appointments"><AppointmentsPage /></DemoRouteGuard>}
            />
            <Route
              path="/appointments/reserve-next-week"
              element={<SupplierWeeklyBookingGuard><SupplierWeeklyBookingPage /></SupplierWeeklyBookingGuard>}
            />
            <Route
              path="/users"
              element={<DemoRouteGuard route="/users"><UsersAccessPage /></DemoRouteGuard>}
            />
            <Route
              path="/users/invite"
              element={<DemoActionGuard action="invite-user"><InviteUserPage /></DemoActionGuard>}
            />
            <Route
              path="/warehouses"
              element={<DemoRouteGuard route="/warehouses"><WarehousesPage /></DemoRouteGuard>}
            />
            <Route
              path="/warehouses/new"
              element={<DemoActionGuard action="add-warehouse"><AddWarehousePage /></DemoActionGuard>}
            />
            <Route
              path="/warehouses/:warehouseId/configuration"
              element={(
                <DemoActionGuard action="configure-warehouse">
                  <WarehouseConfigurationPage />
                </DemoActionGuard>
              )}
            />
            <Route
              path="/supplier-organizations"
              element={(
                <DemoRouteGuard route="/supplier-organizations">
                  <SupplierOrganizationsPage />
                </DemoRouteGuard>
              )}
            />
            <Route
              path="/supplier-organizations/new"
              element={(
                <DemoActionGuard action="add-supplier-organization">
                  <AddSupplierOrganizationPage />
                </DemoActionGuard>
              )}
            />
            <Route
              path="/supplier-organizations/:supplierOrganizationId/configuration"
              element={(
                <DemoActionGuard action="configure-supplier-organization">
                  <SupplierConfigurationPage />
                </DemoActionGuard>
              )}
            />
          </Route>
        </Route>

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route path="/forgot-password" element={<ForgotPasswordPage api={demoAuthApi} />} />
        <Route path="/reset-password" element={<ResetPasswordPage api={demoAuthApi} />} />

        <Route path="*" element={<NotFoundFallback />} />
      </Routes>
    </DemoDomainProvider>
  );
}
