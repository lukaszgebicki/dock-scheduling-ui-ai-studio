import { z } from 'zod';
import { demoSupplierOrganizations, warehouseIds, WarehouseId } from '../users/demoAccessScope';
import { createSupplierOrganizationId } from './supplierOrganizationSlug';

function isWarehouseId(value: string): value is WarehouseId {
  return warehouseIds.some((warehouseId) => warehouseId === value);
}

const rawSupplierOrganizationSchema = z.object({
  name: z.string().trim(),
  warehouseAccess: z.array(z.string()),
});

export const supplierOrganizationSchema = rawSupplierOrganizationSchema.superRefine((data, ctx) => {
  const name = data.name;

  if (name.length < 2 || name.length > 80) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'Enter the supplier organization name.',
    });
    return;
  }

  const normalizedName = name.normalize('NFC').toLowerCase();
  const isDuplicateName = demoSupplierOrganizations.some(
    (org) => org.displayName.trim().normalize('NFC').toLowerCase() === normalizedName,
  );
  if (isDuplicateName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'A supplier organization with this name already exists.',
    });
    return;
  }

  const generatedId = createSupplierOrganizationId(name);
  if (!generatedId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'Enter a supplier organization name that can generate a valid ID.',
    });
    return;
  }

  const isDuplicateId = demoSupplierOrganizations.some((org) => org.id === generatedId);
  if (isDuplicateId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'A supplier organization with this ID already exists.',
    });
    return;
  }

  const uniqueWarehouseIds = new Set(data.warehouseAccess);
  const hasOnlyKnownWarehouseIds = data.warehouseAccess.every(isWarehouseId);
  const hasValidWarehouseAccess =
    hasOnlyKnownWarehouseIds &&
    uniqueWarehouseIds.size > 0 &&
    uniqueWarehouseIds.size === data.warehouseAccess.length;

  if (!hasValidWarehouseAccess) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['warehouseAccess'],
      message: 'Select at least one warehouse.',
    });
  }
}).transform((data) => ({
  name: data.name,
  warehouseAccess: warehouseIds.filter((warehouseId) => data.warehouseAccess.includes(warehouseId)),
}));

export type SupplierOrganizationFormData = z.input<typeof supplierOrganizationSchema>;
export type SupplierOrganizationSubmitValues = z.output<typeof supplierOrganizationSchema>;
