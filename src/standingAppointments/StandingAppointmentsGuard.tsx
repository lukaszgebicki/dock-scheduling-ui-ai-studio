import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { canAccessStandingAppointments } from './standingAppointmentDomain';

export function StandingAppointmentsGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, defaultRoute } = useDemoDomain();
  if (!canAccessStandingAppointments(activeActor.role)) {
    return <Navigate to={defaultRoute} replace />;
  }
  return <>{children}</>;
}
