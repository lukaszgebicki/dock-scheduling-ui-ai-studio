import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { SupplierOrganizationsPage } from '../supplierOrganizations/SupplierOrganizationsPage';
import { AddSupplierOrganizationPage } from '../supplierOrganizations/AddSupplierOrganizationPage';

function NotFoundFallback() {
  const { status, isAuthenticated } = useAuth();

  if (status === 'bootstrapping') {
    return <AuthBootstrapScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/users" replace />;
  }

  return <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedShell />}>
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<UsersAccessPage />} />
          <Route path="/users/invite" element={<InviteUserPage />} />
          <Route path="/warehouses" element={<WarehousesPage />} />
          <Route path="/warehouses/new" element={<AddWarehousePage />} />
          <Route path="/supplier-organizations" element={<SupplierOrganizationsPage />} />
          <Route path="/supplier-organizations/new" element={<AddSupplierOrganizationPage />} />
        </Route>
      </Route>

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route path="/forgot-password" element={<ForgotPasswordPage api={demoAuthApi} />} />
      <Route path="/reset-password" element={<ResetPasswordPage api={demoAuthApi} />} />

      <Route path="*" element={<NotFoundFallback />} />
    </Routes>
  );
}
