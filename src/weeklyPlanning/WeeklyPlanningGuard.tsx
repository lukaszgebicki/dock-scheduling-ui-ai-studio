import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { WarehouseId } from '../demoDomain/demoDomain';

export function getAuthorizedWeeklyPlanningWarehouseIds(
  warehouseIds: readonly WarehouseId[],
  canAccess: (request: {
    step: 'ADMIN_SCHEDULE_UNRESERVED' | 'ADMIN_RESOLVE_PLANNING_CONFLICT';
    capability: 'SCHEDULE_UNRESERVED_DELIVERY' | 'RESOLVE_PLANNING_CONFLICT';
    scope: { warehouseId: WarehouseId };
  }) => boolean,
): readonly WarehouseId[] {
  return warehouseIds.filter((warehouseId) =>
    canAccess({
      step: 'ADMIN_SCHEDULE_UNRESERVED',
      capability: 'SCHEDULE_UNRESERVED_DELIVERY',
      scope: { warehouseId },
    }) || canAccess({
      step: 'ADMIN_RESOLVE_PLANNING_CONFLICT',
      capability: 'RESOLVE_PLANNING_CONFLICT',
      scope: { warehouseId },
    }));
}

export function WeeklyPlanningGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, canAccessWorkflowRoute, defaultRoute } = useDemoDomain();
  const warehouseIds = getAuthorizedWeeklyPlanningWarehouseIds(
    activeActor.warehouseIds,
    canAccessWorkflowRoute,
  );
  if (warehouseIds.length === 0) return <Navigate to={defaultRoute} replace />;
  return <>{children}</>;
}
