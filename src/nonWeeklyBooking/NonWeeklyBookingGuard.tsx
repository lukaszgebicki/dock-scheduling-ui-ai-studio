import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { canAccessNonWeeklyBooking } from './nonWeeklyBookingDomain';

export function NonWeeklyBookingGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, configuration, defaultRoute } = useDemoDomain();
  if (!canAccessNonWeeklyBooking(activeActor, configuration)) {
    return <Navigate to={defaultRoute} replace />;
  }
  return <>{children}</>;
}
