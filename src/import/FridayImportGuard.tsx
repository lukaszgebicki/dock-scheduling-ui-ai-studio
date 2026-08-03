import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { WarehouseId } from '../demoDomain/demoDomain';

export function getAuthorizedFridayImportWarehouseIds(
  warehouseIds: readonly WarehouseId[],
  canAccessWorkflowRoute: ReturnType<typeof useDemoDomain>['canAccessWorkflowRoute'],
): readonly WarehouseId[] {
  return warehouseIds.filter((warehouseId) => canAccessWorkflowRoute({
    step: 'ADMIN_IMPORT_FRIDAY_DETAILS',
    capability: 'IMPORT_DELIVERY_DETAILS',
    scope: { warehouseId },
  }));
}

export function FridayImportGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, canAccessWorkflowRoute, defaultRoute } = useDemoDomain();
  const authorizedWarehouseIds = getAuthorizedFridayImportWarehouseIds(
    activeActor.warehouseIds,
    canAccessWorkflowRoute,
  );

  if (authorizedWarehouseIds.length === 0) {
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
}
