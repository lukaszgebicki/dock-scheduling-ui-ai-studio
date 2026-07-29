import React, { createContext, useContext, useState } from 'react';
import {
  canAccessRoute,
  canPerformAction,
  canViewAppointment,
  canViewSupplierOrganization,
  canViewUser,
  canViewWarehouse,
  demoActors,
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

interface DemoDomainContextValue {
  activeActor: DemoActor;
  actors: readonly DemoActor[];
  defaultRoute: DemoRoute;
  setActiveActorId: (id: DemoActorId) => void;
  canAccessRoute: (route: DemoRoute) => boolean;
  canPerformAction: (action: DemoAction) => boolean;
  canViewWarehouse: (id: WarehouseId) => boolean;
  canViewSupplierOrganization: (id: SupplierOrganizationId) => boolean;
  canViewUser: (user: DemoUser) => boolean;
  canViewAppointment: (appointment: { warehouseId: WarehouseId; supplierOrganizationId: SupplierOrganizationId }) => boolean;
}

function createContextValue(
  activeActor: DemoActor,
  setActiveActorId: (id: DemoActorId) => void,
): DemoDomainContextValue {
  return {
    activeActor,
    actors: demoActors,
    defaultRoute: getDefaultRoute(activeActor),
    setActiveActorId,
    canAccessRoute: (route) => canAccessRoute(activeActor, route),
    canPerformAction: (action) => canPerformAction(activeActor, action),
    canViewWarehouse: (id) => canViewWarehouse(activeActor, id),
    canViewSupplierOrganization: (id) => canViewSupplierOrganization(activeActor, id),
    canViewUser: (user) => canViewUser(activeActor, user),
    canViewAppointment: (appointment) => canViewAppointment(activeActor, appointment),
  };
}

// AppRoutes supplies the mutable context; this default preserves existing isolated component renders.
const DemoDomainContext = createContext<DemoDomainContextValue>(
  createContextValue(getDemoActor('system-administrator'), () => undefined),
);

export function DemoDomainProvider({ children, initialActorId = 'system-administrator' }: {
  children: React.ReactNode;
  initialActorId?: DemoActorId;
}) {
  const [activeActorId, setActiveActorId] = useState<DemoActorId>(initialActorId);
  const activeActor = getDemoActor(activeActorId);

  return (
    <DemoDomainContext.Provider value={createContextValue(activeActor, setActiveActorId)}>
      <React.Fragment key={activeActorId}>{children}</React.Fragment>
    </DemoDomainContext.Provider>
  );
}

export function useDemoDomain(): DemoDomainContextValue {
  return useContext(DemoDomainContext);
}
