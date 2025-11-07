/*---------------------------------------
File: src/domain/project/photo-request.schema.ts
Description: Photo request list schemas used throughout the application.
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
import {
  listBaseConfigSchema,
  listBaseItemSchema,
  listBaseItemInputSchema,
  listBasePendingUpdateSchema,
} from '@/domain/common/list-base.schema';
import {
  ListType,
  SectionStatus,
  ActionOn,
  PhotoRequestPriority,
  PhotoRequestStatus,
  ListSource,
  CreatedBy,
} from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * ============================================================================
 * PHOTO REQUEST CONFIG SCHEMA
 * ============================================================================
 */
export const photoRequestConfigSchema = listBaseConfigSchema.extend({
  type: z.literal(ListType.PHOTO_REQUEST),
  source: z.nativeEnum(ListSource).default(ListSource.PROJECT_LIST),
  status: z.nativeEnum(SectionStatus).default(SectionStatus.UNLOCKED),
  skipped: z.boolean().default(DEFAULTS.DISABLED),
  actionOn: z.nativeEnum(ActionOn).default(ActionOn.PHOTOGRAPHER),
  clientLastViewed: optionalTimestampSchema.optional(),
  finalized: z.boolean().default(DEFAULTS.DISABLED),
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

export const photoRequestConfigInputSchema = photoRequestConfigSchema.omit({
  id: true,
  type: true,
  source: true,
  status: true,
  actionOn: true,
  createdBy: true,
  lastModifiedBy: true,
  totalCategories: true,
  totalItems: true,
  createdAt: true,
  updatedAt: true,
});

export const photoRequestConfigUpdateSchema = photoRequestConfigInputSchema.partial();

/**
 * ============================================================================
 * PHOTO REQUEST ITEM SCHEMA
 * ============================================================================
 */
export const photoRequestItemSchema = listBaseItemSchema.extend({
  description: z
    .string()
    .min(1, 'A description is required for the photo request')
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Description ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`),
  imageUrl: urlSchema.optional(),
  priority: z.nativeEnum(PhotoRequestPriority).default(PhotoRequestPriority.NICE_TO_HAVE),
  status: z.nativeEnum(PhotoRequestStatus).default(PhotoRequestStatus.REQUESTED),
  photographerNotes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Photographer notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional(),
  createdBy: z
    .union([z.nativeEnum(CreatedBy), z.string()])
    .optional()
    .nullable(),
  updatedBy: z
    .union([z.nativeEnum(CreatedBy), z.string()])
    .optional()
    .nullable(),
  createdAt: requiredTimestampSchema,
  updatedAt: optionalTimestampSchema.optional(),
});

/**
 * ============================================================================
 * INPUT SCHEMAS
 * ============================================================================
 */
export const photoRequestItemInputSchema = listBaseItemInputSchema.extend({
  description: z
    .string()
    .min(1, 'A description is required for the photo request')
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Description ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional(),
  imageUrl: urlSchema.optional(),
  priority: z.nativeEnum(PhotoRequestPriority).optional(),
  status: z.nativeEnum(PhotoRequestStatus).optional(),
  photographerNotes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Photographer notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional(),
  createdBy: z
    .union([z.nativeEnum(CreatedBy), z.string()])
    .optional()
    .nullable(),
  updatedBy: z
    .union([z.nativeEnum(CreatedBy), z.string()])
    .optional()
    .nullable(),
});

export const photoRequestItemUpdateSchema = photoRequestItemInputSchema.partial();

/**
 * ============================================================================
 * PHOTO REQUEST LIST SCHEMA - Flattened structure
 * ============================================================================
 */
export const photoRequestListSchema = z.object({
  config: photoRequestConfigSchema,
  items: z.array(photoRequestItemSchema).default([]),
  pendingUpdates: z.array(listBasePendingUpdateSchema).optional().default([]),
});

/**
 * ============================================================================
 * PHOTOGRAPHER RESPONSE SCHEMA
 * ============================================================================
 */
export const photographerResponseSchema = z.object({
  itemId: idSchema,
  status: z.enum(['Approved', 'Not Feasible']),
  photographerNotes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Photographer notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional(),
});

export const batchPhotographerResponseSchema = z.object({
  responses: z.array(photographerResponseSchema).min(1, 'At least one response is required'),
});

/**
 * ============================================================================
 * QUERY SCHEMAS
 * ============================================================================
 */
export const photoRequestFilterSchema = z.object({
  priority: z.nativeEnum(PhotoRequestPriority).optional(),
  status: z.nativeEnum(PhotoRequestStatus).optional(),
  hasImage: z.boolean().optional(),
});

export const photoRequestSortSchema = z.object({
  field: z.enum(['createdAt', 'priority', 'status', 'type']),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */
export type PhotoRequestConfig = z.infer<typeof photoRequestConfigSchema>;
export type PhotoRequestConfigInput = z.infer<typeof photoRequestConfigInputSchema>;
export type PhotoRequestConfigUpdate = z.infer<typeof photoRequestConfigUpdateSchema>;
export type PhotoRequestItem = z.infer<typeof photoRequestItemSchema>;
export type PhotoRequestItemInput = z.infer<typeof photoRequestItemInputSchema>;
export type PhotoRequestItemUpdate = z.infer<typeof photoRequestItemUpdateSchema>;
export type PhotoRequestList = z.infer<typeof photoRequestListSchema>;
export type PhotographerResponse = z.infer<typeof photographerResponseSchema>;
export type BatchPhotographerResponse = z.infer<typeof batchPhotographerResponseSchema>;
export type PhotoRequestFilter = z.infer<typeof photoRequestFilterSchema>;
export type PhotoRequestSort = z.infer<typeof photoRequestSortSchema>;

/**
 * ============================================================================
 * DEFAULT VALUE FACTORY
 * ============================================================================
 */
export const defaultPhotoRequestItem = (
  input: PhotoRequestItemInput,
  options?: {
    createdBy?: CreatedBy | string;
  },
): Omit<PhotoRequestItem, 'id'> => ({
  categoryId: '',
  itemName: input.itemName || '',
  itemDescription: input.itemDescription || '',
  description: input.description || input.itemDescription || '',
  imageUrl: input.imageUrl,
  priority: input.priority ?? PhotoRequestPriority.NICE_TO_HAVE,
  status: input.status ?? PhotoRequestStatus.REQUESTED,
  photographerNotes: input.photographerNotes,
  createdBy: options?.createdBy ?? null,
  updatedBy: options?.createdBy ?? null,
  createdAt: new Date(),
  updatedAt: undefined,
  isCustom: DEFAULTS.DISABLED,
  isChecked: DEFAULTS.DISABLED,
  isDisabled: DEFAULTS.DISABLED,
});
