import { createWarehouseId } from '../warehouses/warehouseSlug';

export function createSupplierOrganizationId(name: string): string {
  return createWarehouseId(name);
}
