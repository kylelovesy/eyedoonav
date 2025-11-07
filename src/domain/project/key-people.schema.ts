/*---------------------------------------
File: src/domain/project/key-people.schema.ts
Description: Key people list schemas used throughout the application.
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { z } from 'zod';
import {
  idSchema,
  displayNameSchema,
  optionalTimestampSchema,
  requiredTimestampSchema,
  contactInfoSchema,
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
  KeyPeopleRole,
  CreatedBy,
  ListSource,
} from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * ============================================================================
 * KEY PEOPLE CONFIG SCHEMA
 * ============================================================================
 */
export const keyPeopleConfigSchema = listBaseConfigSchema.extend({
  type: z.literal(ListType.KEY_PEOPLE),
  source: z.nativeEnum(ListSource).default(ListSource.PROJECT_LIST),
  status: z.nativeEnum(SectionStatus).default(SectionStatus.UNLOCKED),
  skipped: z.boolean().default(DEFAULTS.DISABLED),
  actionOn: z.nativeEnum(ActionOn).default(ActionOn.PHOTOGRAPHER),
  clientLastViewed: optionalTimestampSchema.optional(),
  finalized: z.boolean().default(DEFAULTS.DISABLED),
});

export const keyPeopleConfigInputSchema = keyPeopleConfigSchema.omit({
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

export const keyPeopleConfigUpdateSchema = keyPeopleConfigInputSchema.partial();

/**
 * ============================================================================
 * KEY PEOPLE ITEM SCHEMA
 * ============================================================================
 */
export const keyPeopleItemSchema = listBaseItemSchema.extend({
  displayName: displayNameSchema,
  role: z.nativeEnum(KeyPeopleRole).nullable(),
  isVIP: z.boolean().default(DEFAULTS.DISABLED),
  canRallyPeople: z.boolean().default(DEFAULTS.DISABLED),
  mustPhotograph: z.boolean().default(DEFAULTS.DISABLED),
  dontPhotograph: z.boolean().default(DEFAULTS.DISABLED),
  notes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  involvement: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Involvement description ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  avatar: z.string().optional().nullable(),
  contact: contactInfoSchema.optional().nullable(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
  createdAt: requiredTimestampSchema,
});

/**
 * ============================================================================
 * INPUT SCHEMAS
 * ============================================================================
 */
export const keyPeopleItemInputSchema = listBaseItemInputSchema.extend({
  displayName: displayNameSchema.optional(),
  role: z.nativeEnum(KeyPeopleRole).optional().nullable(),
  isVIP: z.boolean().optional(),
  canRallyPeople: z.boolean().optional(),
  mustPhotograph: z.boolean().optional(),
  dontPhotograph: z.boolean().optional(),
  notes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  involvement: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Involvement description ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  avatar: z.string().optional().nullable(),
  contact: contactInfoSchema.optional().nullable(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
  updatedBy: z.nativeEnum(CreatedBy).optional(),
});

export const keyPeopleItemUpdateSchema = keyPeopleItemInputSchema.partial();

/**
 * ============================================================================
 * KEY PEOPLE LIST SCHEMA - Flattened structure
 * ============================================================================
 */
export const keyPeopleListSchema = z.object({
  config: keyPeopleConfigSchema,
  items: z.array(keyPeopleItemSchema).default([]),
  pendingUpdates: z.array(listBasePendingUpdateSchema).optional().default([]),
});

/**
 * ============================================================================
 * VALIDATION REFINEMENTS
 * ============================================================================
 */
export const keyPeopleItemWithContactSchema = keyPeopleItemInputSchema.refine(
  data => {
    if (data.isVIP && !data.contact?.email && !data.contact?.phone) {
      return false;
    }
    return true;
  },
  {
    message: 'VIP contacts must have at least email or phone',
    path: ['contact'],
  },
);

/**
 * ============================================================================
 * BATCH OPERATIONS SCHEMA
 * ============================================================================
 */
export const keyPeopleBatchUpdateSchema = z.object({
  itemIds: z.array(idSchema).min(1, 'At least one person must be selected'),
  update: keyPeopleItemUpdateSchema,
});

export const keyPeopleRoleAssignmentSchema = z.object({
  itemId: idSchema,
  role: z.nativeEnum(KeyPeopleRole),
});

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */
export type KeyPeopleConfig = z.infer<typeof keyPeopleConfigSchema>;
export type KeyPeopleConfigInput = z.infer<typeof keyPeopleConfigInputSchema>;
export type KeyPeopleConfigUpdate = z.infer<typeof keyPeopleConfigUpdateSchema>;
export type KeyPeopleItem = z.infer<typeof keyPeopleItemSchema>;
export type KeyPeopleItemInput = z.infer<typeof keyPeopleItemInputSchema>;
export type KeyPeopleItemUpdate = z.infer<typeof keyPeopleItemUpdateSchema>;
export type KeyPeopleList = z.infer<typeof keyPeopleListSchema>;
export type KeyPeopleItemWithContact = z.infer<typeof keyPeopleItemWithContactSchema>;
export type KeyPeopleBatchUpdate = z.infer<typeof keyPeopleBatchUpdateSchema>;
export type KeyPeopleRoleAssignment = z.infer<typeof keyPeopleRoleAssignmentSchema>;

// Backward compatibility aliases
export type KeyPersonItem = KeyPeopleItem;
export type KeyPersonInput = KeyPeopleItemInput;
export type KeyPersonConfig = KeyPeopleConfig;
export type KeyPeopleDomainSnapshot = KeyPeopleList;

/**
 * ============================================================================
 * DEFAULT VALUE FACTORY
 * ============================================================================
 */
export const defaultKeyPeopleItem = (
  input: KeyPeopleItemInput,
  options?: {
    createdBy?: CreatedBy;
  },
): Omit<KeyPeopleItem, 'id'> => ({
  categoryId: '',
  itemName: input.itemName || '',
  itemDescription: input.itemDescription || '',
  displayName: input.displayName || input.itemName || '',
  role: input.role ?? null,
  isVIP: input.isVIP ?? DEFAULTS.DISABLED,
  canRallyPeople: input.canRallyPeople ?? DEFAULTS.DISABLED,
  mustPhotograph: input.mustPhotograph ?? DEFAULTS.DISABLED,
  dontPhotograph: input.dontPhotograph ?? DEFAULTS.DISABLED,
  notes: input.notes ?? null,
  involvement: input.involvement ?? null,
  avatar: input.avatar ?? null,
  contact: input.contact ?? null,
  createdBy: options?.createdBy,
  createdAt: new Date(),
  isCustom: DEFAULTS.DISABLED,
  isChecked: DEFAULTS.DISABLED,
  isDisabled: DEFAULTS.DISABLED,
});
