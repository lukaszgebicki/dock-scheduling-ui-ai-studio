import { z } from 'zod';
import { demoUsers } from './demoUsers';
import {
  isSupplierOrganizationId,
  supplierOrganizationIds,
  warehouseIds,
} from './demoAccessScope';

export const inviteUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Enter the user’s full name.' })
    .max(80, { message: 'Enter the user’s full name.' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Enter a valid work email address.' })
    .refine((val) => !demoUsers.some((u) => u.email.toLowerCase() === val), {
      message: 'A user with this email already exists.',
    }),
  role: z.enum([
    'Administrator',
    'Warehouse',
    'Security',
    'Warehouse manager',
    'Supplier',
  ], { message: 'Select a role.' }),
  organization: z.union([
    z.enum(supplierOrganizationIds),
    z.literal('Pernod Ricard Poland'),
    z.literal(''),
  ]).optional(),
  warehouseAccess: z.array(z.enum(warehouseIds)).optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'Supplier') {
    if (!data.organization || !isSupplierOrganizationId(data.organization)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['organization'],
        message: 'Select a supplier organization.',
      });
    }
  }

  if (['Warehouse', 'Security', 'Warehouse manager'].includes(data.role)) {
    if (!data.warehouseAccess || data.warehouseAccess.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['warehouseAccess'],
        message: 'Select at least one warehouse.',
      });
    }
  }
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
