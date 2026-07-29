import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from './DemoDomainProvider';
import type { DemoAction } from './demoDomain';

export function DemoActionGuard({
  action,
  children,
}: {
  action: DemoAction;
  children: React.ReactNode;
}) {
  const { canPerformAction, defaultRoute } = useDemoDomain();

  return canPerformAction(action)
    ? children
    : <Navigate to={defaultRoute} replace />;
}
