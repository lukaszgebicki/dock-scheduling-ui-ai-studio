import { z } from 'zod';

export const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(1, 'Password is required.')
    .min(12, 'Password must contain at least 12 characters.')
    .max(128, 'Password must contain no more than 128 characters.'),
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required.'),
}).superRefine((data, context) => {
  if (data.confirmPassword && data.newPassword !== data.confirmPassword) {
    context.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Passwords do not match.',
    });
  }
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
