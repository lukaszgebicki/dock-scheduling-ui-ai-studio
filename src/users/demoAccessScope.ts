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

export interface Warehouse {
  id: WarehouseId;
  displayName: string;
}

export interface SupplierOrganization {
  id: SupplierOrganizationId;
  displayName: string;
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

export const demoSupplierOrganizations: readonly SupplierOrganization[] = Object.values(supplierOrganizationsById);

// UI-only demo configuration for inherited warehouse access
export const demoSupplierAssignments: Readonly<Record<SupplierOrganizationId, readonly WarehouseId[]>> = {
  'northstar-packaging': ['nowy-kisielin-distribution-center'],
  'baltic-freight': ['zielona-gora-plant'],
  'vistula-materials': ['nowy-kisielin-distribution-center', 'zielona-gora-plant'],
};

export function isSupplierOrganizationId(value: string): value is SupplierOrganizationId {
  return supplierOrganizationIds.some((id) => id === value);
}

export function getWarehouseById(id: WarehouseId): Warehouse {
  return warehousesById[id];
}

export function getSupplierOrganizationById(id: SupplierOrganizationId): SupplierOrganization {
  return supplierOrganizationsById[id];
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
