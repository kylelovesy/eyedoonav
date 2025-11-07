/*---------------------------------------
File: src/domain/scoped/notes.schema.ts
Description: Notes schemas - refactored to extend list-base.schema.ts

Author: Kyle Lovesy
Date: 06/11-2025 - 12.00
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
  NoteSource,
  NoteScope,
  NoteAudience,
  NoteType,
  ListType,
  ListSource,
} from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * Notes Schemas
 * Unified note management extending base list patterns
 * Supports local (project) and global (user) scopes with role-based visibility
 */

// ============================================================================
// NOTES CONFIGURATION SCHEMA
// ============================================================================

export const noteConfigSchema = listBaseConfigSchema.extend({
  type: z.literal(ListType.NOTES),
  source: z.nativeEnum(ListSource).default(ListSource.USER_LIST),
  totalNotes: z.number().int().min(0).default(0),
});

export const noteConfigInputSchema = noteConfigSchema.omit({
  id: true,
  type: true,
  source: true,
  createdBy: true,
  lastModifiedBy: true,
  totalCategories: true,
  totalItems: true,
  totalNotes: true,
  createdAt: true,
  updatedAt: true,
});

export const noteConfigUpdateSchema = noteConfigInputSchema.partial();

// ============================================================================
// NOTE ITEM SCHEMA
// ============================================================================

export const noteItemSchema = listBaseItemSchema.extend({
  userId: idSchema, // Owner of the note
  projectId: idSchema.optional(), // Local notes only
  title: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.DESCRIPTION, `Title ${DEFAULTS.TEXT_LENGTHS_MSG.DESCRIPTION}`)
    .optional()
    .nullable(),
  content: z
    .string()
    .min(1, `Content ${DEFAULTS.TEXT_LENGTHS_MSG.REQUIRED}`)
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Content ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .trim(),
  type: z.nativeEnum(NoteType).default(NoteType.GENERAL),
  source: z.nativeEnum(NoteSource).default(NoteSource.SYSTEM),
  scope: z.nativeEnum(NoteScope).default(NoteScope.GLOBAL),
  audience: z.nativeEnum(NoteAudience).default(NoteAudience.PHOTOGRAPHER),
  relatedId: idSchema.optional(), // Optional relation to other entities (task, vendor, etc.)
  tags: z.array(z.string().trim()).optional().default([]),
  isPinned: z.boolean().default(false),
  isRead: z.boolean().default(false),
  createdAt: requiredTimestampSchema,
  updatedAt: optionalTimestampSchema,
});

// ============================================================================
// INPUT & UPDATE SCHEMAS
// ============================================================================

export const noteItemInputSchema = listBaseItemInputSchema.extend({
  title: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.DESCRIPTION, `Title ${DEFAULTS.TEXT_LENGTHS_MSG.DESCRIPTION}`)
    .optional()
    .nullable(),
  content: z
    .string()
    .min(1, `Content ${DEFAULTS.TEXT_LENGTHS_MSG.REQUIRED}`)
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Content ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .trim(),
  type: z.nativeEnum(NoteType).optional(),
  source: z.nativeEnum(NoteSource).optional(),
  scope: z.nativeEnum(NoteScope).optional(),
  audience: z.nativeEnum(NoteAudience).optional(),
  relatedId: idSchema.optional(),
  tags: z.array(z.string().trim()).optional(),
  isPinned: z.boolean().optional(),
  isRead: z.boolean().optional(),
});

export const noteItemUpdateSchema = noteItemInputSchema.partial();

// ============================================================================
// NOTE LIST WRAPPER SCHEMA
// ============================================================================

export const noteListSchema = z.object({
  config: noteConfigSchema,
  items: z.array(noteItemSchema).default([]),
  pendingUpdates: z.array(listBasePendingUpdateSchema).optional().default([]),
});

// ============================================================================
// BATCH OPERATIONS SCHEMA
// ============================================================================

export const noteBatchUpdateSchema = z.object({
  noteIds: z.array(idSchema).min(1, 'At least one note must be selected'),
  update: noteItemUpdateSchema,
});

export const notePinnedToggleSchema = z.object({
  noteId: idSchema,
  isPinned: z.boolean(),
});

export const noteReadToggleSchema = z.object({
  noteId: idSchema,
  isRead: z.boolean(),
});

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const noteFilterSchema = z.object({
  scope: z.nativeEnum(NoteScope).optional(),
  source: z.nativeEnum(NoteSource).optional(),
  type: z.nativeEnum(NoteType).optional(),
  audience: z.nativeEnum(NoteAudience).optional(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
  relatedId: z.string().optional(),
  searchTerm: z.string().optional(),
});

export const noteSortSchema = z.object({
  field: z.enum(['createdAt', 'updatedAt', 'title', 'content', 'type']),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type NoteConfig = z.infer<typeof noteConfigSchema>;
export type NoteConfigInput = z.infer<typeof noteConfigInputSchema>;
export type NoteConfigUpdate = z.infer<typeof noteConfigUpdateSchema>;

export type NoteItem = z.infer<typeof noteItemSchema>;
export type NoteItemInput = z.infer<typeof noteItemInputSchema>;
export type NoteItemUpdate = z.infer<typeof noteItemUpdateSchema>;

export type NoteList = z.infer<typeof noteListSchema>;
export type NoteBatchUpdate = z.infer<typeof noteBatchUpdateSchema>;
export type NotePinnedToggle = z.infer<typeof notePinnedToggleSchema>;
export type NoteReadToggle = z.infer<typeof noteReadToggleSchema>;
export type NoteFilter = z.infer<typeof noteFilterSchema>;
export type NoteSort = z.infer<typeof noteSortSchema>;

// ============================================================================
// DEFAULT FACTORY
// ============================================================================

/**
 * Creates a default note item from input
 * Maps note-specific fields to list base fields appropriately
 */
export const defaultNoteItem = (
  input: NoteItemInput,
  options?: {
    userId: string;
    projectId?: string;
  },
): Omit<NoteItem, 'id'> => {
  const now = new Date();
  const title = input.title || null;
  const content = input.content || '';

  return {
    categoryId: '',
    itemName: title || content.substring(0, 50) || '', // Map title to itemName, fallback to content preview
    itemDescription: content, // Map content to itemDescription
    userId: options?.userId || '',
    projectId: options?.projectId,
    title: title,
    content: content,
    type: input.type ?? NoteType.GENERAL,
    source: input.source ?? NoteSource.PHOTOGRAPHER,
    scope: input.scope ?? (options?.projectId ? NoteScope.LOCAL : NoteScope.GLOBAL),
    audience: input.audience ?? NoteAudience.PHOTOGRAPHER,
    relatedId: input.relatedId,
    tags: input.tags ?? [],
    isPinned: input.isPinned ?? DEFAULTS.DISABLED,
    isRead: input.isRead ?? DEFAULTS.DISABLED,
    createdAt: now,
    updatedAt: now,
    isCustom: DEFAULTS.DISABLED,
    isChecked: DEFAULTS.DISABLED,
    isDisabled: DEFAULTS.DISABLED,
  };
};
