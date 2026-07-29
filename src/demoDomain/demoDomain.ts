export const uiMvpRoles = [
  'System Administrator',
  'Warehouse Administrator',
  'Warehouse Operator',
  'Security Officer',
  'Supplier Administrator',
  'Supplier User',
] as const;

export type UiMvpRole = (typeof uiMvpRoles)[number];

export const warehouseIds = [
  'nowy-kisielin-distribution-center',
  'zielona-gora-plant',
] as const;

export type WarehouseId = (typeof warehouseIds)[number];

export const supplierOrganizationIds = [
  'northstar-packaging',
  'baltic-freight',
  'vistula-materials',
] as const;

export type SupplierOrganizationId = (typeof supplierOrganizationIds)[number];
export type OrganizationId = 'pernod-ricard-poland' | SupplierOrganizationId;

export interface Warehouse {
  id: WarehouseId;
  displayName: string;
}

export interface SupplierOrganization {
  id: SupplierOrganizationId;
  displayName: string;
}

export type UserStatus = 'Active' | 'Inactive';
export type AccountType = 'Internal' | 'Supplier';

export interface DemoUser {
  id: string;
  fullName: string;
  email: string;
  organizationId: OrganizationId;
  role: UiMvpRole;
  warehouseIds: readonly WarehouseId[];
  status: UserStatus;
  lastActive: string;
  accountType: AccountType;
}

export type DemoRoute =
  | '/appointments'
  | '/users'
  | '/warehouses'
  | '/supplier-organizations';

export type DemoAction =
  | 'invite-user'
  | 'add-warehouse'
  | 'add-supplier-organization';

export interface DemoActor {
  id: string;
  userId: DemoUserId;
  displayName: string;
  role: UiMvpRole;
  organizationId: OrganizationId;
  warehouseIds: readonly WarehouseId[];
  supplierOrganizationId?: SupplierOrganizationId;
}

const warehousesById: Readonly<Record<WarehouseId, Warehouse>> = {
  'nowy-kisielin-distribution-center': {
    id: 'nowy-kisielin-distribution-center',
    displayName: 'Nowy Kisielin Distribution Center',
  },
  'zielona-gora-plant': {
    id: 'zielona-gora-plant',
    displayName: 'Zielona Góra Plant',
  },
};

export const demoWarehouses: readonly Warehouse[] = Object.values(warehousesById);

const supplierOrganizationsById: Readonly<Record<SupplierOrganizationId, SupplierOrganization>> = {
  'northstar-packaging': {
    id: 'northstar-packaging',
    displayName: 'Northstar Packaging',
  },
  'baltic-freight': {
    id: 'baltic-freight',
    displayName: 'Baltic Freight',
  },
  'vistula-materials': {
    id: 'vistula-materials',
    displayName: 'Vistula Materials',
  },
};

export const demoSupplierOrganizations: readonly SupplierOrganization[] =
  Object.values(supplierOrganizationsById);

export const demoSupplierAssignments: Readonly<
  Record<SupplierOrganizationId, readonly WarehouseId[]>
> = {
  'northstar-packaging': ['nowy-kisielin-distribution-center'],
  'baltic-freight': ['zielona-gora-plant'],
  'vistula-materials': [
    'nowy-kisielin-distribution-center',
    'zielona-gora-plant',
  ],
};

const demoUserRecords = [
  {
    id: 'u-1',
    fullName: 'Demo Administrator',
    email: 'demo@dock.local',
    organizationId: 'pernod-ricard-poland',
    role: 'System Administrator',
    warehouseIds,
    status: 'Active',
    lastActive: 'Just now',
    accountType: 'Internal',
  },
  {
    id: 'u-2',
    fullName: 'Alice Smith',
    email: 'alice.smith@pr.com',
    organizationId: 'pernod-ricard-poland',
    role: 'Warehouse Administrator',
    warehouseIds: ['nowy-kisielin-distribution-center'],
    status: 'Active',
    lastActive: '2 hours ago',
    accountType: 'Internal',
  },
  {
    id: 'u-3',
    fullName: 'Bob Jones',
    email: 'bob.jones@pr.com',
    organizationId: 'pernod-ricard-poland',
    role: 'Warehouse Operator',
    warehouseIds: ['zielona-gora-plant'],
    status: 'Active',
    lastActive: '1 day ago',
    accountType: 'Internal',
  },
  {
    id: 'u-4',
    fullName: 'Charlie Davis',
    email: 'cdavis@security.local',
    organizationId: 'pernod-ricard-poland',
    role: 'Security Officer',
    warehouseIds: ['nowy-kisielin-distribution-center'],
    status: 'Inactive',
    lastActive: '2 weeks ago',
    accountType: 'Internal',
  },
  {
    id: 'u-5',
    fullName: 'Eve Northstar',
    email: 'eve@northstar-packaging.com',
    organizationId: 'northstar-packaging',
    role: 'Supplier Administrator',
    warehouseIds: demoSupplierAssignments['northstar-packaging'],
    status: 'Active',
    lastActive: '5 hours ago',
    accountType: 'Supplier',
  },
  {
    id: 'u-6',
    fullName: 'Frank Baltic',
    email: 'frank@balticfreight.com',
    organizationId: 'baltic-freight',
    role: 'Supplier User',
    warehouseIds: demoSupplierAssignments['baltic-freight'],
    status: 'Active',
    lastActive: '3 days ago',
    accountType: 'Supplier',
  },
  {
    id: 'u-7',
    fullName: 'Grace Vistula',
    email: 'grace@vistulamaterials.com',
    organizationId: 'vistula-materials',
    role: 'Supplier User',
    warehouseIds: demoSupplierAssignments['vistula-materials'],
    status: 'Inactive',
    lastActive: '1 month ago',
    accountType: 'Supplier',
  },
  {
    id: 'u-8',
    fullName: 'Henry Ford',
    email: 'hford@pr.com',
    organizationId: 'pernod-ricard-poland',
    role: 'Warehouse Operator',
    warehouseIds: [],
    status: 'Active',
    lastActive: '4 hours ago',
    accountType: 'Internal',
  },
] as const satisfies readonly DemoUser[];

export type DemoUserId = (typeof demoUserRecords)[number]['id'];
export const demoUsers: readonly DemoUser[] = demoUserRecords;

function createDemoActor<Id extends string>(id: Id, userId: DemoUserId) {
  const user = demoUserRecords.find((candidate) => candidate.id === userId);
  if (!user) throw new Error(`Unknown demo user: ${userId}`);

  const actor = {
    id,
    userId,
    displayName: user.fullName,
    role: user.role,
    organizationId: user.organizationId,
    warehouseIds: user.warehouseIds,
  };

  return user.accountType === 'Supplier'
    ? { ...actor, supplierOrganizationId: user.organizationId } satisfies DemoActor
    : actor satisfies DemoActor;
}

export const demoActors = [
  createDemoActor('system-administrator', 'u-1'),
  createDemoActor('warehouse-administrator', 'u-2'),
  createDemoActor('warehouse-operator', 'u-3'),
  createDemoActor('security-officer', 'u-4'),
  createDemoActor('supplier-administrator', 'u-5'),
  createDemoActor('supplier-user', 'u-7'),
] as const satisfies readonly DemoActor[];

export type DemoActorId = (typeof demoActors)[number]['id'];

const routesByRole: Readonly<Record<UiMvpRole, readonly DemoRoute[]>> = {
  'System Administrator': ['/appointments', '/users', '/warehouses', '/supplier-organizations'],
  'Warehouse Administrator': ['/appointments', '/users', '/warehouses', '/supplier-organizations'],
  'Warehouse Operator': ['/appointments'],
  'Security Officer': ['/appointments'],
  'Supplier Administrator': ['/appointments', '/users'],
  'Supplier User': ['/appointments'],
};

const actionsByRole: Readonly<Record<UiMvpRole, readonly DemoAction[]>> = {
  'System Administrator': ['invite-user', 'add-warehouse', 'add-supplier-organization'],
  'Warehouse Administrator': [],
  'Warehouse Operator': [],
  'Security Officer': [],
  'Supplier Administrator': ['invite-user'],
  'Supplier User': [],
};

export function getDemoActor(id: DemoActorId): DemoActor {
  const actor = demoActors.find((candidate) => candidate.id === id);
  if (!actor) throw new Error(`Unknown demo actor: ${id}`);
  return actor;
}

export function getDefaultRoute(actor: DemoActor): DemoRoute {
  return routesByRole[actor.role].includes('/users') ? '/users' : '/appointments';
}

export function canAccessRoute(actor: DemoActor, route: DemoRoute): boolean {
  return routesByRole[actor.role].includes(route);
}

export function canPerformAction(actor: DemoActor, action: DemoAction): boolean {
  return actionsByRole[actor.role].includes(action);
}

export function canViewWarehouse(actor: DemoActor, warehouseId: WarehouseId): boolean {
  return actor.role === 'System Administrator' || actor.warehouseIds.includes(warehouseId);
}

export function canViewSupplierOrganization(actor: DemoActor, id: SupplierOrganizationId): boolean {
  if (actor.role === 'System Administrator') return true;
  if (actor.supplierOrganizationId) return actor.supplierOrganizationId === id;
  return demoSupplierAssignments[id].some((warehouseId) => actor.warehouseIds.includes(warehouseId));
}

export function canViewUser(actor: DemoActor, user: DemoUser): boolean {
  if (actor.role === 'System Administrator') return true;
  if (actor.supplierOrganizationId) {
    return user.organizationId === actor.supplierOrganizationId
      && user.warehouseIds.some((warehouseId) => actor.warehouseIds.includes(warehouseId));
  }
  return user.warehouseIds.some((warehouseId) => actor.warehouseIds.includes(warehouseId));
}

export function canViewAppointment(actor: DemoActor, appointment: {
  warehouseId: WarehouseId;
  supplierOrganizationId: SupplierOrganizationId;
}): boolean {
  if (actor.role === 'System Administrator') return true;
  const warehouseVisible = actor.warehouseIds.includes(appointment.warehouseId);
  return actor.supplierOrganizationId
    ? warehouseVisible && actor.supplierOrganizationId === appointment.supplierOrganizationId
    : warehouseVisible;
}

export function getWarehouseById(id: WarehouseId): Warehouse {
  return warehousesById[id];
}

export function getSupplierOrganizationById(id: SupplierOrganizationId): SupplierOrganization {
  return supplierOrganizationsById[id];
}

export function getOrganizationDisplayName(id: OrganizationId): string {
  return id === 'pernod-ricard-poland'
    ? 'Pernod Ricard Poland'
    : getSupplierOrganizationById(id).displayName;
}

export function getWarehouseDisplayNames(ids: readonly WarehouseId[]): string[] {
  return ids.map((id) => getWarehouseById(id).displayName);
}

export function getSupplierWarehouseIds(id: SupplierOrganizationId): readonly WarehouseId[] {
  return demoSupplierAssignments[id];
}

export function getSupplierWarehouseDisplayNames(id: SupplierOrganizationId): string[] {
  return getWarehouseDisplayNames(getSupplierWarehouseIds(id));
}

export function isSupplierOrganizationId(value: string): value is SupplierOrganizationId {
  return supplierOrganizationIds.some((id) => id === value);
}
