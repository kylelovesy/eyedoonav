/*---------------------------------------
File: src/domain/screen-schema/onboarding.schema.ts
Description: Onboarding screen schemas used throughout the application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
import { z } from 'zod';
import { DEFAULTS } from '@/constants/defaults';

/*---------------------------------------*/
// Onboarding Step Schema
/*---------------------------------------*/
export const onboardingStepSchema = z.object({
  id: z.number().int().min(0),
  title: z.string().min(1, 'Step title is required'),
  subtitle: z.string().optional(),
  description: z.string().min(1, 'Step description is required'),
  image: z.any(), // Flexible type for asset handling
  imageAlt: z.string().optional(),
});

/*---------------------------------------*/
// Onboarding State Schema
/*---------------------------------------*/

export const onboardingStateSchema = z.object({
  currentStep: z.number().int().min(0).default(0),
  isCompleted: z.boolean().default(DEFAULTS.DISABLED),
  steps: z.array(onboardingStepSchema).min(1, 'At least one step is required'),
});

/*---------------------------------------*/
// Onboarding Progress Schema
/*---------------------------------------*/

export const onboardingProgressSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  currentStep: z.number().int().min(0).default(0),
  completedSteps: z.array(z.number().int().min(0)).default([]),
  skippedSteps: z.array(z.number().int().min(0)).default([]),
  isCompleted: z.boolean().default(DEFAULTS.DISABLED),
  completedAt: z.date().optional(),
  startedAt: z.date(),
});

/*---------------------------------------*/
// Input Schemas
/*---------------------------------------*/

export const onboardingStepInputSchema = onboardingStepSchema.omit({
  id: true,
});

export const onboardingProgressInputSchema = onboardingProgressSchema.omit({
  userId: true,
  startedAt: true,
});

export const onboardingProgressUpdateSchema = onboardingProgressSchema
  .omit({
    userId: true,
    startedAt: true,
  })
  .partial();

/*---------------------------------------*/
// Action Schemas
/*---------------------------------------*/

export const onboardingNavigationSchema = z.object({
  direction: z.enum(['next', 'previous', 'skip', 'reset']),
  targetStep: z.number().int().min(0).optional(),
});

export const onboardingCompleteSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  completedAt: z.date(),
  feedback: z.string().max(500, 'Feedback is too long').optional(),
});

/*---------------------------------------*/
// Configuration Schema
/*---------------------------------------*/

export const onboardingConfigSchema = z.object({
  enabled: z.boolean().default(DEFAULTS.ENABLED),
  allowSkip: z.boolean().default(DEFAULTS.ENABLED),
  showProgress: z.boolean().default(DEFAULTS.ENABLED),
  autoAdvance: z.boolean().default(DEFAULTS.DISABLED),
  autoAdvanceDelay: z.number().int().min(0).default(3000),
  steps: z.array(onboardingStepSchema).min(1),
});

/*---------------------------------------*/
// Type Exports
/*---------------------------------------*/

export type OnboardingStep = z.infer<typeof onboardingStepSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;
export type OnboardingStepInput = z.infer<typeof onboardingStepInputSchema>;
export type OnboardingProgressInput = z.infer<typeof onboardingProgressInputSchema>;
export type OnboardingProgressUpdate = z.infer<typeof onboardingProgressUpdateSchema>;
export type OnboardingNavigation = z.infer<typeof onboardingNavigationSchema>;
export type OnboardingComplete = z.infer<typeof onboardingCompleteSchema>;
export type OnboardingConfig = z.infer<typeof onboardingConfigSchema>;

/*---------------------------------------*/
// State Management Types
/*---------------------------------------*/

export interface OnboardingActions {
  setCurrentStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  skipStep: (stepId: number) => void;
  goToStep: (stepId: number) => void;
}
