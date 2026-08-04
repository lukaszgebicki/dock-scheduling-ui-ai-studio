import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import { canAccessOperatorManualBooking } from './operatorManualBookingDomain';

export function OperatorManualBookingGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, configuration, defaultRoute } = useDemoDomain();
  if (!canAccessOperatorManualBooking(activeActor, configuration)) {
    return <Navigate to={defaultRoute} replace />;
  }
  return <>{children}</>;
}
