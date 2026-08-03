import React, { createContext, useContext, useState } from 'react';
import {
  canAccessRoute,
  canPerformAction,
  canViewAppointment,
  canViewUser,
  canViewWarehouse,
  demoActors,
  demoUsers,
  getDefaultRoute,
  getDemoActor,
  type DemoAction,
  type DemoActor,
  type DemoActorId,
  type DemoRoute,
  type DemoUser,
  type SupplierOrganizationId,
  type WarehouseId,
} from './demoDomain';
import {
  addWarehouseDraft,
  createWarehouseDraftConfiguration,
  initialDemoConfiguration,
  publishSupplierConfiguration,
  publishWarehouseConfiguration,
  type ApprovalCondition,
  type DemoConfigurationState,
  type SupplierConfiguration,
  type WarehouseConfiguration,
} from './configuration';
import {
  resolveWorkflowRouting,
  workflowDecisionAllowsActor,
  type WorkflowRoutingDecision,
  type WorkflowRoutingRequest,
} from './workflowRouting';

export type ContextWorkflowRoutingRequest = Omit<WorkflowRoutingRequest, 'actors'>;

interface DemoDomainContextValue {
  activeActor: DemoActor;
  actors: readonly DemoActor[];
  configuration: DemoConfigurationState;
  defaultRoute: DemoRoute;
  setActiveActorId: (id: DemoActorId) => void;
  canAccessRoute: (route: DemoRoute) => boolean;
  canPerformAction: (action: DemoAction) => boolean;
  canViewWarehouse: (id: WarehouseId) => boolean;
  canViewSupplierOrganization: (id: SupplierOrganizationId) => boolean;
  canViewUser: (user: DemoUser) => boolean;
  canViewAppointment: (appointment: { warehouseId: WarehouseId; supplierOrganizationId: SupplierOrganizationId }) => boolean;
  resolveWorkflow: (request: ContextWorkflowRoutingRequest) => WorkflowRoutingDecision;
  canNavigateWorkflow: (request: ContextWorkflowRoutingRequest) => boolean;
  canPerformWorkflowAction: (request: ContextWorkflowRoutingRequest) => boolean;
  canAccessWorkflowRoute: (request: ContextWorkflowRoutingRequest) => boolean;
  getWarehouseDisplayNames: (ids: readonly WarehouseId[]) => string[];
  createWarehouseDraft: (id: WarehouseId, displayName: string) => void;
  publishWarehouse: (
    warehouse: WarehouseConfiguration,
    criticalRuleCatalog?: readonly ApprovalCondition[],
  ) => void;
  publishSupplier: (supplier: SupplierConfiguration) => void;
}

function getConfiguredActor(
  actor: DemoActor,
  configuration: DemoConfigurationState,
): DemoActor {
  if (actor.role === 'Warehouse Administrator') {
    return {
      ...actor,
      warehouseIds: configuration.warehouses
        .filter((warehouse) =>
          warehouse.status === 'published'
          && warehouse.administratorUserIds.includes(actor.userId))
        .map((warehouse) => warehouse.id),
    };
  }
  if (actor.supplierOrganizationId) {
    const supplier = configuration.suppliers.find((candidate) =>
      candidate.organizationId === actor.supplierOrganizationId);
    return supplier ? { ...actor, warehouseIds: supplier.warehouseIds } : actor;
  }
  return actor;
}

function getConfiguredUser(
  user: DemoUser,
  configuration: DemoConfigurationState,
): DemoUser {
  const supplier = configuration.suppliers.find((candidate) =>
    candidate.organizationId === user.organizationId);
  if (supplier) {
    return { ...user, warehouseIds: supplier.warehouseIds };
  }
  if (user.role === 'Warehouse Administrator') {
    return {
      ...user,
      warehouseIds: configuration.warehouses
        .filter((warehouse) =>
          warehouse.status === 'published'
          && warehouse.administratorUserIds.some((userId) => userId === user.id))
        .map((warehouse) => warehouse.id),
    };
  }
  return user;
}

function createContextValue(
  baseActor: DemoActor,
  configuration: DemoConfigurationState,
  workflowUsers: readonly DemoUser[],
  setActiveActorId: (id: DemoActorId) => void,
  createWarehouseDraft: (id: WarehouseId, displayName: string) => void,
  publishWarehouse: (
    warehouse: WarehouseConfiguration,
    criticalRuleCatalog?: readonly ApprovalCondition[],
  ) => void,
  publishSupplier: (supplier: SupplierConfiguration) => void,
): DemoDomainContextValue {
  const activeActor = getConfiguredActor(baseActor, configuration);
  const configuredUsers = workflowUsers.map((user) => getConfiguredUser(user, configuration));
  const resolveWorkflow = (request: ContextWorkflowRoutingRequest) =>
    resolveWorkflowRouting({ ...request, actors: configuredUsers });
  const activeActorCanUseWorkflow = (request: ContextWorkflowRoutingRequest) =>
    workflowDecisionAllowsActor(resolveWorkflow(request), activeActor.userId);
  return {
    activeActor,
    actors: demoActors,
    configuration,
    defaultRoute: getDefaultRoute(activeActor),
    setActiveActorId,
    canAccessRoute: (route) => canAccessRoute(activeActor, route),
    canPerformAction: (action) => canPerformAction(activeActor, action),
    canViewWarehouse: (id) => canViewWarehouse(activeActor, id),
    canViewSupplierOrganization: (id) => {
      if (activeActor.role === 'System Administrator') return true;
      if (activeActor.supplierOrganizationId) {
        return activeActor.supplierOrganizationId === id;
      }
      const supplier = configuration.suppliers.find((candidate) =>
        candidate.organizationId === id);
      return supplier?.warehouseIds.some((warehouseId) =>
        activeActor.warehouseIds.includes(warehouseId)) ?? false;
    },
    canViewUser: (user) => canViewUser(activeActor, getConfiguredUser(user, configuration)),
    canViewAppointment: (appointment) => canViewAppointment(activeActor, appointment),
    resolveWorkflow,
    canNavigateWorkflow: activeActorCanUseWorkflow,
    canPerformWorkflowAction: activeActorCanUseWorkflow,
    canAccessWorkflowRoute: activeActorCanUseWorkflow,
    getWarehouseDisplayNames: (ids) => ids.map((id) =>
      configuration.warehouses.find((warehouse) => warehouse.id === id)?.displayName ?? id),
    createWarehouseDraft,
    publishWarehouse,
    publishSupplier,
  };
}

// AppRoutes supplies the mutable context; this default preserves existing isolated component renders.
const DemoDomainContext = createContext<DemoDomainContextValue>(
  createContextValue(
    getDemoActor('system-administrator'),
    initialDemoConfiguration,
    demoUsers,
    () => undefined,
    () => undefined,
    () => undefined,
    () => undefined,
  ),
);

export function DemoDomainProvider({
  children,
  initialActorId = 'system-administrator',
  initialWorkflowUsers = demoUsers,
}: {
  children: React.ReactNode;
  initialActorId?: DemoActorId;
  initialWorkflowUsers?: readonly DemoUser[];
}) {
  const [activeActorId, setActiveActorId] = useState<DemoActorId>(initialActorId);
  const [configuration, setConfiguration] = useState(initialDemoConfiguration);
  const baseActor = getDemoActor(activeActorId);
  const activeActor = getConfiguredActor(baseActor, configuration);

  const createWarehouseDraft = (id: WarehouseId, displayName: string) => {
    setConfiguration((current) =>
      addWarehouseDraft(
        current,
        createWarehouseDraftConfiguration(id, displayName),
        activeActor,
      ));
  };

  const publishWarehouse = (
    warehouse: WarehouseConfiguration,
    criticalRuleCatalog?: readonly ApprovalCondition[],
  ) => {
    setConfiguration((current) =>
      publishWarehouseConfiguration(current, warehouse, activeActor, criticalRuleCatalog));
  };

  const publishSupplier = (supplier: SupplierConfiguration) => {
    setConfiguration((current) =>
      publishSupplierConfiguration(current, supplier, activeActor));
  };

  return (
    <DemoDomainContext.Provider value={createContextValue(
      baseActor,
      configuration,
      initialWorkflowUsers,
      setActiveActorId,
      createWarehouseDraft,
      publishWarehouse,
      publishSupplier,
    )}>
      <React.Fragment key={activeActorId}>{children}</React.Fragment>
    </DemoDomainContext.Provider>
  );
}

export function useDemoDomain(): DemoDomainContextValue {
  return useContext(DemoDomainContext);
}
