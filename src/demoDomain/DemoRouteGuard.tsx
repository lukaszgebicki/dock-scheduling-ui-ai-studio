import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from './DemoDomainProvider';
import type { DemoRoute } from './demoDomain';

export function DemoRouteGuard({ route, children }: {
  route: DemoRoute;
  children: React.ReactNode;
}) {
  const { canAccessRoute, defaultRoute } = useDemoDomain();
  return canAccessRoute(route) ? children : <Navigate to={defaultRoute} replace />;
}
