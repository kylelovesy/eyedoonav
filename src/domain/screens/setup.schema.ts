/*---------------------------------------
File: src/domain/screen-schema/setup.schema.ts
Description: Core screen wrapper component providing consistent layout, safe area handling,
Description: Setup screen schemas used throughout the application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
import { z } from 'zod';
import { SubscriptionPlan, SetupSection as SetupSectionEnum } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/*---------------------------------------*/
// Setup Schemas
/*---------------------------------------*/

export const setupItemSchema = z.object({
  id: z.string().min(1, 'Setup item ID is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  section: z.nativeEnum(SetupSectionEnum).optional(),
  icon: z.string().min(1, 'Icon is required'),
  subscription: z.nativeEnum(SubscriptionPlan),
  completed: z.boolean().default(DEFAULTS.DISABLED),
  route: z.string().min(1, 'Route is required'),
});

/*---------------------------------------*/
// Setup Progress Schema
/*---------------------------------------*/

export const setupProgressSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  completedItems: z.array(z.string().min(1)).default([]),
  totalItems: z.number().int().min(0).default(0),
  completionPercentage: z.number().min(0).max(100).default(DEFAULTS.PERCENTAGE_COMPLETE),
  lastUpdated: z.date(),
});

// ============================================================================
// Setup Section Schema
// ============================================================================

export const setupSectionSchema = z.object({
  section: z.nativeEnum(SetupSectionEnum),
  title: z.string().min(1, 'Section title is required'),
  description: z.string().optional(),
  items: z.array(setupItemSchema).default([]),
  isCompleted: z.boolean().default(false),
  order: z.number().int().min(0),
});

// ============================================================================
// Input Schemas
// ============================================================================

export const setupItemInputSchema = setupItemSchema.omit({
  id: true,
  completed: true,
});

export const setupItemUpdateSchema = setupItemSchema
  .omit({
    id: true,
  })
  .partial();

export const setupProgressUpdateSchema = setupProgressSchema
  .omit({
    userId: true,
    lastUpdated: true,
  })
  .partial();

// ============================================================================
// Complete Setup Action Schema
// ============================================================================

export const completeSetupItemSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  itemId: z.string().min(1, 'Setup item ID is required'),
});

export const uncompleteSetupItemSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  itemId: z.string().min(1, 'Setup item ID is required'),
});

// ============================================================================
// Setup Configuration Schema
// ============================================================================

export const setupConfigSchema = z.object({
  sections: z.array(setupSectionSchema).min(1, 'At least one section is required'),
  requiresOnboarding: z.boolean().default(DEFAULTS.ENABLED),
  allowSkip: z.boolean().default(DEFAULTS.DISABLED),
  showProgress: z.boolean().default(DEFAULTS.ENABLED),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const setupFilterSchema = z.object({
  section: z.nativeEnum(SetupSectionEnum).optional(),
  subscription: z.nativeEnum(SubscriptionPlan).optional(),
  completed: z.boolean().optional(),
});

export const setupSortSchema = z.object({
  field: z.enum(['title', 'section', 'completed']),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SetupItem = z.infer<typeof setupItemSchema>;
export type SetupProgress = z.infer<typeof setupProgressSchema>;
export type SetupSection = z.infer<typeof setupSectionSchema>;
export type SetupItemInput = z.infer<typeof setupItemInputSchema>;
export type SetupItemUpdate = z.infer<typeof setupItemUpdateSchema>;
export type SetupProgressUpdate = z.infer<typeof setupProgressUpdateSchema>;
export type CompleteSetupItem = z.infer<typeof completeSetupItemSchema>;
export type UncompleteSetupItem = z.infer<typeof uncompleteSetupItemSchema>;
export type SetupConfig = z.infer<typeof setupConfigSchema>;
export type SetupFilter = z.infer<typeof setupFilterSchema>;
export type SetupSort = z.infer<typeof setupSortSchema>;
