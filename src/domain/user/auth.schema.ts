/*---------------------------------------
File: src/domain/auth.schema.ts
Description: Authentication schemas used throughout the application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
import { z } from 'zod';
import { emailSchema, passwordSchema, displayNameSchema } from '@/domain/common/shared-schemas';
import { SubscriptionPlan } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * Authentication Domain Schemas
 * Handles user authentication, registration, and password management
 */

export const signUpInputSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    displayName: displayNameSchema,
    confirmPassword: passwordSchema,
    subscriptionPlan: z.nativeEnum(SubscriptionPlan),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
    acceptPrivacy: z.boolean().refine(val => val === true, {
      message: 'You must accept the privacy policy',
    }),
    acceptMarketing: z.boolean().optional(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const signInInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().default(false),
});

export const passwordResetInputSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
    token: z.string().min(1, 'Reset token is required'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const passwordChangeInputSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export const emailVerificationSchema = z.object({
  token: z.string().min(1, `Verification token ${DEFAULTS.TEXT_LENGTHS_MSG.REQUIRED}`).trim(),
  email: emailSchema,
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type SignInInput = z.infer<typeof signInInputSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetInputSchema>;
export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeInputSchema>;
export type EmailVerification = z.infer<typeof emailVerificationSchema>;
