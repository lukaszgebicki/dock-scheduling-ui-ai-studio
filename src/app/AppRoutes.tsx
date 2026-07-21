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
