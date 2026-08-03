import React from 'react';
import { Navigate } from 'react-router';
import { useDemoDomain } from '../demoDomain/DemoDomainProvider';
import type { WarehouseId } from '../demoDomain/demoDomain';
import type { WorkflowRoutingDecision } from '../demoDomain/workflowRouting';
import { workflowDecisionAllowsActor } from '../demoDomain/workflowRouting';
import { routedActions } from './gateOps';

export function getAuthorizedGateWarehouseIds(
  actorId: string,
  warehouseIds: readonly WarehouseId[],
  resolve: (request: {
    step: (typeof routedActions)[keyof typeof routedActions]['step'];
    capability: (typeof routedActions)[keyof typeof routedActions]['capability'];
    scope: { warehouseId: WarehouseId };
  }) => WorkflowRoutingDecision,
): readonly WarehouseId[] {
  const contracts = Object.values(routedActions);
  return warehouseIds.filter((warehouseId) => contracts.some((contract) => {
    const decision = resolve({ ...contract, scope: { warehouseId } });
    return workflowDecisionAllowsActor(decision, actorId);
  }));
}

export function GateOpsGuard({ children }: { children: React.ReactNode }) {
  const { activeActor, resolveWorkflow, defaultRoute } = useDemoDomain();
  const warehouseIds = getAuthorizedGateWarehouseIds(
    activeActor.userId,
    activeActor.warehouseIds,
    resolveWorkflow,
  );
  if (warehouseIds.length === 0) return <Navigate to={defaultRoute} replace />;
  return <>{children}</>;
}
