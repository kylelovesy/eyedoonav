/*---------------------------------------
File: src/domain/project/portal.schema.ts
Description: Client portal schemas - flattened structure
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { z } from 'zod';
import {
  idSchema,
  urlSchema,
  optionalTimestampSchema,
  requiredTimestampSchema,
} from '@/domain/common/shared-schemas';
import { SectionStatus, ActionOn, PortalStepID } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';
import { keyPeopleListSchema } from '@/domain/project/key-people.schema';
import { locationListSchema } from '@/domain/project/location.schema';
import { groupShotListSchema } from '@/domain/user/shots.schema';
import { photoRequestListSchema } from '@/domain/project/photo-request.schema';
import { timelineListSchema } from '@/domain/project/timeline.schema';

/**
 * ============================================================================
 * BASE PORTAL STEP SCHEMA
 * ============================================================================
 * Base schema for all portal steps containing common metadata fields.
 * Each step represents a section of the client portal that can be enabled/disabled.
 */
export const basePortalStepSchema = z.object({
  stepTitle: z.string().min(1, 'Step title is required').trim(),
  stepNumber: z.number().int().min(0),
  stepIcon: z.string().min(1, 'Step icon is required'),
  stepStatus: z.nativeEnum(SectionStatus).default(SectionStatus.LOCKED),
  requiredStep: z.boolean().default(DEFAULTS.DISABLED),
  actionOn: z.nativeEnum(ActionOn).default(ActionOn.CLIENT),
});

/**
 * ============================================================================
 * INDIVIDUAL PORTAL STEP SCHEMAS
 * ============================================================================
 * Discriminated union schemas for each portal step type.
 * Each step contains metadata and optional data from the corresponding list.
 */

/**
 * Key People portal step schema
 */
export const keyPeopleStepSchema = basePortalStepSchema.extend({
  portalStepID: z.literal(PortalStepID.KEY_PEOPLE),
  data: keyPeopleListSchema.optional(),
});

/**
 * Locations portal step schema
 */
export const locationsStepSchema = basePortalStepSchema.extend({
  portalStepID: z.literal(PortalStepID.LOCATIONS),
  data: locationListSchema.optional(),
});

/**
 * Group Shots portal step schema
 */
export const groupShotsStepSchema = basePortalStepSchema.extend({
  portalStepID: z.literal(PortalStepID.GROUP_SHOTS),
  data: groupShotListSchema.optional(),
});

/**
 * Photo Requests portal step schema
 */
export const photoRequestsStepSchema = basePortalStepSchema.extend({
  portalStepID: z.literal(PortalStepID.PHOTO_REQUESTS),
  data: photoRequestListSchema.optional(),
});

/**
 * Timeline portal step schema
 */
export const timelineStepSchema = basePortalStepSchema.extend({
  portalStepID: z.literal(PortalStepID.TIMELINE),
  data: timelineListSchema.optional(),
});

/**
 * ============================================================================
 * DISCRIMINATED UNION OF PORTAL STEPS
 * ============================================================================
 * Union type for all portal step schemas, discriminated by portalStepID.
 */
export const portalStepSchema = z.discriminatedUnion('portalStepID', [
  keyPeopleStepSchema,
  locationsStepSchema,
  groupShotsStepSchema,
  photoRequestsStepSchema,
  timelineStepSchema,
]);

/**
 * ============================================================================
 * CLIENT PORTAL SCHEMA - Flattened structure
 * ============================================================================
 * Main schema for client portal documents.
 * Uses flattened structure with all fields at the top level.
 */
export const clientPortalSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  isSetup: z.boolean().default(DEFAULTS.DISABLED),
  isEnabled: z.boolean().default(DEFAULTS.DISABLED),
  setupDate: optionalTimestampSchema.optional(),
  expiresAt: optionalTimestampSchema.optional(),
  portalUrl: urlSchema.optional(),
  accessToken: z.string().min(1, 'Access token is required').optional(),
  currentStepID: z.nativeEnum(PortalStepID).default(PortalStepID.WELCOME),
  portalMessage: z.string().max(1000, 'Message is too long').optional(),

  // Portal metadata (flattened)
  totalSteps: z.number().int().min(0).default(0),
  completedSteps: z.number().int().min(0).default(0),
  completionPercentage: z.number().min(0).max(100).default(DEFAULTS.PERCENTAGE_COMPLETE),
  lastClientActivity: optionalTimestampSchema.optional(),
  clientAccessCount: z.number().int().min(0).default(DEFAULTS.ITEM_COUNT),

  // Steps array
  steps: z.array(portalStepSchema).default([]),

  // Timestamps
  createdAt: requiredTimestampSchema,
  updatedAt: requiredTimestampSchema,
});

/**
 * ============================================================================
 * INPUT SCHEMAS
 * ============================================================================
 */

/**
 * Client portal input schema for creating/updating portals.
 * Omits fields that are auto-generated or managed by the system.
 */
export const clientPortalInputSchema = clientPortalSchema.omit({
  id: true,
  projectId: true,
  setupDate: true,
  expiresAt: true,
  portalUrl: true,
  accessToken: true,
  totalSteps: true,
  completedSteps: true,
  completionPercentage: true,
  lastClientActivity: true,
  clientAccessCount: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Client portal update schema - all fields optional for partial updates.
 */
export const clientPortalUpdateSchema = clientPortalInputSchema.partial();

/**
 * Client portal create schema - requires projectId.
 */
export const clientPortalCreateSchema = clientPortalInputSchema.extend({
  projectId: idSchema,
});

/**
 * ============================================================================
 * PORTAL STEP UPDATE SCHEMA
 * ============================================================================
 * Schema for updating portal step metadata (status, actionOn, etc.).
 * All fields are optional for partial updates.
 */
export const portalStepUpdateSchema = basePortalStepSchema.partial();

/**
 * ============================================================================
 * PORTAL SETUP SCHEMA
 * ============================================================================
 * Schema for initial portal setup configuration.
 */
export const portalSetupInputSchema = z.object({
  projectId: idSchema,
  enabledSteps: z.array(z.nativeEnum(PortalStepID)).min(1, 'At least one step must be enabled'),
  portalMessage: z.string().max(1000, 'Message is too long').optional(),
  expiryDays: z.number().int().min(1).max(365).default(30),
});

/**
 * ============================================================================
 * PORTAL ACCESS SCHEMAS
 * ============================================================================
 */

/**
 * Schema for portal access token validation.
 */
export const portalAccessSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

/**
 * Schema for portal access validation response.
 */
export const portalAccessValidationSchema = z.object({
  isValid: z.boolean(),
  expiresAt: optionalTimestampSchema.optional(),
  projectId: idSchema.optional(),
});

/**
 * ============================================================================
 * STEP NAVIGATION SCHEMA
 * ============================================================================
 * Schema for portal step navigation information.
 */
export const portalNavigationSchema = z.object({
  currentStepID: z.nativeEnum(PortalStepID),
  nextStepID: z.nativeEnum(PortalStepID).optional(),
  previousStepID: z.nativeEnum(PortalStepID).optional(),
});

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */

// Portal Step Types
export type PortalStep = z.infer<typeof portalStepSchema>;
export type BasePortalStep = z.infer<typeof basePortalStepSchema>;
export type KeyPeopleStep = z.infer<typeof keyPeopleStepSchema>;
export type LocationsStep = z.infer<typeof locationsStepSchema>;
export type GroupShotsStep = z.infer<typeof groupShotsStepSchema>;
export type PhotoRequestsStep = z.infer<typeof photoRequestsStepSchema>;
export type TimelineStep = z.infer<typeof timelineStepSchema>;

// Client Portal Types
export type ClientPortal = z.infer<typeof clientPortalSchema>;
export type ClientPortalInput = z.infer<typeof clientPortalInputSchema>;
export type ClientPortalUpdate = z.infer<typeof clientPortalUpdateSchema>;
export type ClientPortalCreate = z.infer<typeof clientPortalCreateSchema>;

// Portal Step Update Type
export type PortalStepUpdate = z.infer<typeof portalStepUpdateSchema>;

// Portal Setup Type
export type PortalSetupInput = z.infer<typeof portalSetupInputSchema>;

// Portal Access Types
export type PortalAccess = z.infer<typeof portalAccessSchema>;
export type PortalAccessValidation = z.infer<typeof portalAccessValidationSchema>;

// Portal Navigation Type
export type PortalNavigation = z.infer<typeof portalNavigationSchema>;

/**
 * ============================================================================
 * DEFAULT VALUE FACTORIES
 * ============================================================================
 */

/**
 * Creates a default client portal with all required fields initialized.
 *
 * @param projectId - The project ID to associate with the portal
 * @returns A default ClientPortal object with all fields set to their default values
 *
 * @example
 *pescript
 * const portal = defaultClientPortal('project-123');
 *  */
export const defaultClientPortal = (projectId: string): ClientPortal => ({
  id: '', // Generated by Firestore
  projectId,
  isSetup: false,
  isEnabled: false,
  setupDate: undefined,
  expiresAt: undefined,
  portalUrl: undefined,
  accessToken: undefined,
  currentStepID: PortalStepID.WELCOME,
  portalMessage: undefined,
  totalSteps: 0,
  completedSteps: 0,
  completionPercentage: 0,
  lastClientActivity: undefined,
  clientAccessCount: 0,
  steps: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});
