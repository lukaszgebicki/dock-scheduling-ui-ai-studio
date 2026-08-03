import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { canAccessReporting } from './reportingDomain';

export function ReportingGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, defaultRoute } = useDemoDomain();
  if (!canAccessReporting(activeActor.role)) {
    return <Navigate to={defaultRoute} replace />;
  }
  return <>{children}</>;
}
