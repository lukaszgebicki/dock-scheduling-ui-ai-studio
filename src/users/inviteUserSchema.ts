import { z } from 'zod';
import { demoUsers } from './demoUsers';
import {
  isSupplierOrganizationId,
  supplierOrganizationIds,
  warehouseIds,
} from './demoAccessScope';

export const inviteUserRoles = [
  'Administrator',
  'Warehouse',
  'Security',
  'Warehouse manager',
  'Supplier',
] as const;
export type InviteUserRole = (typeof inviteUserRoles)[number];

export function createInviteUserSchema(
  assignableSupplierOrganizationIds: readonly string[] = supplierOrganizationIds,
  assignableRoles: readonly InviteUserRole[] = inviteUserRoles,
) {
  return z.object({
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
    role: z.enum(inviteUserRoles, { message: 'Select a role.' }),
    organization: z.union([
      z.enum(supplierOrganizationIds),
      z.literal('Pernod Ricard Poland'),
      z.literal(''),
    ]).optional(),
    warehouseAccess: z.array(z.enum(warehouseIds)).optional(),
  }).superRefine((data, ctx) => {
    if (!assignableRoles.includes(data.role)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role'],
        message: 'The active role cannot prepare this user assignment.',
      });
    }

    if (data.role === 'Supplier') {
      if (!data.organization || !isSupplierOrganizationId(data.organization)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organization'],
          message: 'Select a supplier organization.',
        });
      } else if (!assignableSupplierOrganizationIds.includes(data.organization)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organization'],
          message: 'This supplier organization cannot receive new user assignments.',
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
}

export const inviteUserSchema = createInviteUserSchema();

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
