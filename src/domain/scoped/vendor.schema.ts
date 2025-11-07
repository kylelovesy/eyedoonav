/*---------------------------------------
File: src/domain/scoped/vendor.schema.ts
Description: Vendor schemas used throughout the application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 2.0.0
---------------------------------------*/
import { z } from 'zod';
import {
  idSchema,
  urlSchema,
  contactInfoSchema,
  socialMediaSchema,
  requiredTimestampSchema,
} from '@/domain/common/shared-schemas';
import {
  listBaseConfigSchema,
  listBaseItemSchema,
  listBaseItemInputSchema,
  listBasePendingUpdateSchema,
} from '@/domain/common/list-base.schema';
import { VendorType, ListType, ListSource, CreatedBy } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * Vendor Schemas
 * Professional vendor and service provider management
 */

// ============================================================================
// Vendor Configuration Schema
// ============================================================================

export const vendorConfigSchema = listBaseConfigSchema.extend({
  type: z.literal(ListType.VENDORS),
  source: z.nativeEnum(ListSource).default(ListSource.USER_LIST),
  totalVendors: z.number().int().min(0).default(0),
});

export const vendorConfigInputSchema = vendorConfigSchema.omit({
  id: true,
  type: true,
  source: true,
  createdBy: true,
  lastModifiedBy: true,
  totalCategories: true,
  totalItems: true,
  totalVendors: true,
  createdAt: true,
  updatedAt: true,
});

export const vendorConfigUpdateSchema = vendorConfigInputSchema.partial();

// ============================================================================
// Vendor Item Schema
// ============================================================================

export const vendorItemSchema = listBaseItemSchema.extend({
  // Vendor-specific fields
  userId: idSchema, // Owner of this vendor entry
  projectId: idSchema.optional(), // Project-specific vendors
  name: z
    .string()
    .min(1, 'Vendor name is required')
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Name ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .trim(),
  businessName: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Business name ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .optional()
    .nullable(),
  category: z.nativeEnum(VendorType),
  contact: contactInfoSchema.optional().nullable(),
  socialMedia: socialMediaSchema.optional().nullable(),
  website: urlSchema.optional().nullable(),
  notes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  isPreferred: z.boolean().default(DEFAULTS.DISABLED),
  isGlobal: z.boolean().default(DEFAULTS.DISABLED), // Global = user-level, not project-specific
  hasQRCode: z.boolean().default(DEFAULTS.DISABLED).optional(),
  qrCodePath: z.string().optional().nullable(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
  createdAt: requiredTimestampSchema,
});

/**
 * ============================================================================
 * INPUT SCHEMAS
 * ============================================================================
 */

export const vendorItemInputSchema = listBaseItemInputSchema.extend({
  name: z
    .string()
    .min(1, 'Vendor name is required')
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Name ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .trim()
    .optional(),
  businessName: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Business name ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .optional()
    .nullable(),
  category: z.nativeEnum(VendorType).optional(),
  contact: contactInfoSchema.optional().nullable(),
  socialMedia: socialMediaSchema.optional().nullable(),
  website: urlSchema.optional().nullable(),
  notes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional()
    .nullable(),
  isPreferred: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  qrCodePath: z.string().optional().nullable(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
});

export const vendorItemUpdateSchema = vendorItemInputSchema.partial();

/**
 * ============================================================================
 * VENDOR LIST SCHEMA - Flattened structure
 * ============================================================================
 */

export const vendorListSchema = z.object({
  config: vendorConfigSchema,
  items: z.array(vendorItemSchema).default([]),
  pendingUpdates: z.array(listBasePendingUpdateSchema).optional().default([]),
});

/**
 * ============================================================================
 * BATCH OPERATIONS SCHEMA
 * ============================================================================
 */

export const vendorBatchUpdateSchema = z.object({
  vendorIds: z.array(idSchema).min(1, 'At least one vendor must be selected'),
  update: vendorItemUpdateSchema,
});

export const vendorPreferredToggleSchema = z.object({
  vendorId: idSchema,
  isPreferred: z.boolean(),
});

/**
 * ============================================================================
 * QUERY SCHEMAS
 * ============================================================================
 */

export const vendorFilterSchema = z.object({
  category: z.nativeEnum(VendorType).optional(),
  isPreferred: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  projectId: z.string().optional(),
  searchTerm: z.string().optional(),
});

export const vendorSortSchema = z.object({
  field: z.enum(['name', 'businessName', 'category', 'createdAt']),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * ============================================================================
 * VALIDATION REFINEMENTS
 * ============================================================================
 */

export const vendorWithContactSchema = vendorItemInputSchema.refine(
  data => {
    if (!data.contact?.email && !data.contact?.phone && !data.website) {
      return false;
    }
    return true;
  },
  {
    message: 'At least one contact method (email, phone, or website) is required',
    path: ['contact'],
  },
);

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */

export type VendorConfig = z.infer<typeof vendorConfigSchema>;
export type VendorConfigInput = z.infer<typeof vendorConfigInputSchema>;
export type VendorConfigUpdate = z.infer<typeof vendorConfigUpdateSchema>;
export type VendorItem = z.infer<typeof vendorItemSchema>;
export type VendorItemInput = z.infer<typeof vendorItemInputSchema>;
export type VendorItemUpdate = z.infer<typeof vendorItemUpdateSchema>;
export type VendorList = z.infer<typeof vendorListSchema>;
export type VendorBatchUpdate = z.infer<typeof vendorBatchUpdateSchema>;
export type VendorPreferredToggle = z.infer<typeof vendorPreferredToggleSchema>;
export type VendorFilter = z.infer<typeof vendorFilterSchema>;
export type VendorSort = z.infer<typeof vendorSortSchema>;
export type VendorWithContact = z.infer<typeof vendorWithContactSchema>;

// Backward compatibility aliases
export type VendorsConfig = VendorConfig;
export type VendorsList = VendorList;

/**
 * ============================================================================
 * DEFAULT VALUE FACTORY
 * ============================================================================
 */

export const defaultVendorItem = (
  input: VendorItemInput,
  options?: {
    userId: string;
    projectId?: string;
    createdBy?: CreatedBy;
  },
): Omit<VendorItem, 'id'> => ({
  categoryId: '',
  itemName: input.name || input.itemName || '',
  itemDescription: input.notes || input.itemDescription || '',
  name: input.name || input.itemName || '',
  businessName: input.businessName ?? null,
  category: input.category || VendorType.OTHER,
  contact: input.contact ?? null,
  socialMedia: input.socialMedia ?? null,
  website: input.website ?? null,
  notes: input.notes ?? null,
  isPreferred: input.isPreferred ?? DEFAULTS.DISABLED,
  isGlobal: input.isGlobal ?? DEFAULTS.DISABLED,
  hasQRCode: DEFAULTS.DISABLED,
  qrCodePath: input.qrCodePath ?? null,
  userId: options?.userId || '',
  projectId: options?.projectId,
  createdBy: options?.createdBy,
  createdAt: new Date(),
  isCustom: DEFAULTS.DISABLED,
  isChecked: DEFAULTS.DISABLED,
  isDisabled: DEFAULTS.DISABLED,
});
