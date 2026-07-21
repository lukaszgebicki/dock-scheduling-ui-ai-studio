import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';
import { AuthBootstrapScreen } from './AuthBootstrapScreen';

export function PublicOnlyRoute() {
  const { status, isAuthenticated } = useAuth();

  if (status === 'bootstrapping') {
    return <AuthBootstrapScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
