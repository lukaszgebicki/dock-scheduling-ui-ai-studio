import { z } from 'zod';
import { demoWarehouses } from '../users/demoAccessScope';
import { createWarehouseId } from './warehouseSlug';

export const warehouseSchema = z.object({
  name: z.string()
    .trim()
    .superRefine((val, ctx) => {
      if (val.length < 2 || val.length > 80) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter the warehouse name.',
        });
        return;
      }

      const normalizedName = val.normalize('NFC').toLowerCase();
      const isDuplicateName = demoWarehouses.some(
        (warehouse) => warehouse.displayName.trim().normalize('NFC').toLowerCase() === normalizedName,
      );
      if (isDuplicateName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A warehouse with this name already exists.',
        });
        return;
      }

      const generatedId = createWarehouseId(val);
      if (!generatedId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a warehouse name that can generate a valid ID.',
        });
        return;
      }

      const isDuplicateId = demoWarehouses.some((w) => w.id === generatedId);
      if (isDuplicateId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A warehouse with this ID already exists.',
        });
      }
    }),
});

export type WarehouseFormData = z.infer<typeof warehouseSchema>;
