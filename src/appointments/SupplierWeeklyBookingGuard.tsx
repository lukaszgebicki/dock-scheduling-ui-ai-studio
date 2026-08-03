import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';

export function SupplierWeeklyBookingGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, canAccessWorkflowRoute, defaultRoute } = useDemoDomain();
  const supplierOrganizationId = activeActor.supplierOrganizationId;
  const warehouseId = activeActor.warehouseIds[0];

  if (!supplierOrganizationId || !warehouseId) {
    return <Navigate to={defaultRoute} replace />;
  }

  const allowed = canAccessWorkflowRoute({
    step: 'SUPPLIER_RESERVE_NEXT_WEEK',
    capability: 'BOOK_APPOINTMENT',
    scope: { supplierOrganizationId, warehouseId },
  });

  return allowed ? children : <Navigate to={defaultRoute} replace />;
}
