import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.')
    .toLowerCase(),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
