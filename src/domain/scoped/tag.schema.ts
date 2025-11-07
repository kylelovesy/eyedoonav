/*---------------------------------------
File: src/domain/scoped/tag.schema.ts
Description: Tag schemas used throughout the application
Author: Kyle Lovesy
Date: 28/10-2025
Version: 2.0.0
---------------------------------------*/

import { z } from 'zod';
import {
  idSchema,
  requiredTimestampSchema,
  optionalTimestampSchema,
} from '@/domain/common/shared-schemas';
import {
  listBaseConfigSchema,
  listBaseItemSchema,
  listBaseItemInputSchema,
  listBasePendingUpdateSchema,
} from '@/domain/common/list-base.schema';
import {
  TagColor,
  TagCategory,
  TagLinkType,
  ListType,
  ListSource,
  CreatedBy,
} from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * Tag Schemas
 * Content organization and labeling system
 * Supports user-level and project-level tags with entity linking
 * Extends list-base patterns for consistency with other list-based modules
 */

// ============================================================================
// Tag Configuration Schema
// ============================================================================

export const tagConfigSchema = listBaseConfigSchema.extend({
  type: z.literal(ListType.TAGS),
  source: z.nativeEnum(ListSource).default(ListSource.USER_LIST),
  totalTags: z.number().int().min(0).default(0),
});

export const tagConfigInputSchema = tagConfigSchema.omit({
  id: true,
  type: true,
  source: true,
  createdBy: true,
  lastModifiedBy: true,
  totalCategories: true,
  totalItems: true,
  totalTags: true,
  createdAt: true,
  updatedAt: true,
});

export const tagConfigUpdateSchema = tagConfigInputSchema.partial();

// ============================================================================
// Tag Item Schema
// ============================================================================

export const tagItemSchema = listBaseItemSchema.extend({
  // Tag-specific fields
  userId: idSchema, // Owner of this tag
  projectId: idSchema.optional().nullable(), // Project-specific tags
  title: z
    .string()
    .min(1, 'Title is required')
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Title ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .trim(),
  description: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Description ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  color: z.nativeEnum(TagColor).optional().nullable(),
  category: z.nativeEnum(TagCategory).default(TagCategory.OTHER),
  linkUri: z.string().min(1, 'Link URI is required').optional().nullable(),
  photoId: idSchema.optional().nullable(),
  usage: z.number().int().min(0).default(DEFAULTS.ITEM_COUNT),
  isGlobal: z.boolean().default(DEFAULTS.DISABLED), // Global = user-level, not project-specific
  createdBy: z.nativeEnum(CreatedBy).optional(),
  createdAt: requiredTimestampSchema,
  updatedAt: optionalTimestampSchema.optional(),
});

/**
 * ============================================================================
 * INPUT SCHEMAS
 * ============================================================================
 */

export const tagItemInputSchema = listBaseItemInputSchema.extend({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Title ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .trim()
    .optional(),
  description: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Description ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  color: z.nativeEnum(TagColor).optional().nullable(),
  category: z.nativeEnum(TagCategory).optional(),
  linkUri: z.string().min(1, 'Link URI is required').optional().nullable(),
  photoId: idSchema.optional().nullable(),
  isGlobal: z.boolean().optional(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
});

export const tagItemUpdateSchema = tagItemInputSchema.partial();

/**
 * ============================================================================
 * TAG LIST SCHEMA - Flattened structure
 * ============================================================================
 */

export const tagListSchema = z.object({
  config: tagConfigSchema,
  items: z.array(tagItemSchema).default([]),
  pendingUpdates: z.array(listBasePendingUpdateSchema).optional().default([]),
});

// ============================================================================
// TAG ASSIGNMENT SCHEMAS
// ============================================================================

export const tagEntitySchema = z.object({
  id: idSchema,
  type: z.nativeEnum(TagLinkType),
});

export const tagAssignmentSchema = z.object({
  id: idSchema,
  tagId: idSchema,
  photoId: idSchema,
  userId: idSchema,
  entity: tagEntitySchema,
  createdAt: optionalTimestampSchema.optional(),
});

export const tagAssignmentInputSchema = tagAssignmentSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const tagAssignmentUpdateSchema = tagAssignmentSchema
  .omit({
    id: true,
    userId: true,
    createdAt: true,
  })
  .partial();

// ============================================================================
// PHOTO TAG LINK SCHEMAS
// ============================================================================

export const photoTagLinkSchema = z.object({
  id: idSchema,
  photoUri: z.string().min(1, 'Photo URI is required'),
  tagIds: z.array(idSchema).default([]),
  projectId: idSchema,
  createdAt: optionalTimestampSchema.optional(),
});

export const photoTagLinkInputSchema = photoTagLinkSchema.omit({
  id: true,
  createdAt: true,
});

export const photoTagLinkUpdateSchema = photoTagLinkSchema
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();

/**
 * ============================================================================
 * BATCH OPERATION SCHEMAS
 * ============================================================================
 */

export const tagBatchAssignSchema = z.object({
  tagIds: z.array(idSchema).min(1, 'At least one tag must be selected'),
  entityIds: z.array(idSchema).min(1, 'At least one entity must be selected'),
  entityType: z.nativeEnum(TagLinkType),
});

export const tagBatchRemoveSchema = z.object({
  tagIds: z.array(idSchema).min(1, 'At least one tag must be selected'),
  entityIds: z.array(idSchema).min(1, 'At least one entity must be selected'),
});

export const tagBulkCreateSchema = z.object({
  tags: z.array(tagItemInputSchema).min(1, 'At least one tag must be provided'),
});

/**
 * ============================================================================
 * QUERY SCHEMAS
 * ============================================================================
 */

export const tagFilterSchema = z.object({
  category: z.nativeEnum(TagCategory).optional(),
  color: z.nativeEnum(TagColor).optional(),
  projectId: idSchema.optional(),
  isGlobal: z.boolean().optional(),
  searchTerm: z.string().optional(),
  entityType: z.nativeEnum(TagLinkType).optional(),
  entityId: idSchema.optional(),
});

export const tagSortSchema = z.object({
  field: z.enum(['title', 'category', 'usage', 'createdAt']),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * ============================================================================
 * VALIDATION REFINEMENTS
 * ============================================================================
 */

export const tagWithColorSchema = tagItemInputSchema.extend({
  color: z.nativeEnum(TagColor),
});

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */

export type TagConfig = z.infer<typeof tagConfigSchema>;
export type TagConfigInput = z.infer<typeof tagConfigInputSchema>;
export type TagConfigUpdate = z.infer<typeof tagConfigUpdateSchema>;
export type TagItem = z.infer<typeof tagItemSchema>;
export type TagItemInput = z.infer<typeof tagItemInputSchema>;
export type TagItemUpdate = z.infer<typeof tagItemUpdateSchema>;
export type TagList = z.infer<typeof tagListSchema>;
export type TagEntity = z.infer<typeof tagEntitySchema>;
export type TagAssignment = z.infer<typeof tagAssignmentSchema>;
export type TagAssignmentInput = z.infer<typeof tagAssignmentInputSchema>;
export type TagAssignmentUpdate = z.infer<typeof tagAssignmentUpdateSchema>;
export type PhotoTagLink = z.infer<typeof photoTagLinkSchema>;
export type PhotoTagLinkInput = z.infer<typeof photoTagLinkInputSchema>;
export type PhotoTagLinkUpdate = z.infer<typeof photoTagLinkUpdateSchema>;
export type TagBatchAssign = z.infer<typeof tagBatchAssignSchema>;
export type TagBatchRemove = z.infer<typeof tagBatchRemoveSchema>;
export type TagBulkCreate = z.infer<typeof tagBulkCreateSchema>;
export type TagFilter = z.infer<typeof tagFilterSchema>;
export type TagSort = z.infer<typeof tagSortSchema>;
export type TagWithColor = z.infer<typeof tagWithColorSchema>;

// Backward compatibility aliases
export type Tag = TagItem;
export type TagInput = TagItemInput;
export type TagUpdate = TagItemUpdate;

/**
 * ============================================================================
 * DEFAULT VALUE FACTORY
 * ============================================================================
 */

export const defaultTagItem = (
  input: TagItemInput,
  options?: {
    userId: string;
    projectId?: string;
    createdBy?: CreatedBy;
  },
): Omit<TagItem, 'id'> => ({
  categoryId: '',
  itemName: input.title || input.itemName || '',
  itemDescription: input.description || input.itemDescription || '',
  title: input.title || input.itemName || '',
  description: input.description ?? null,
  color: input.color ?? null,
  category: input.category ?? TagCategory.OTHER,
  linkUri: input.linkUri ?? null,
  photoId: input.photoId ?? null,
  usage: DEFAULTS.ITEM_COUNT,
  isGlobal: input.isGlobal ?? DEFAULTS.DISABLED,
  userId: options?.userId || '',
  projectId: options?.projectId ?? null,
  createdBy: options?.createdBy,
  createdAt: new Date(),
  updatedAt: undefined,
  isCustom: DEFAULTS.DISABLED,
  isChecked: DEFAULTS.DISABLED,
  isDisabled: DEFAULTS.DISABLED,
});

// Backward compatibility alias
export const defaultTag = defaultTagItem;
