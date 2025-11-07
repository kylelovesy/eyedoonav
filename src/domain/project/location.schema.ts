/*---------------------------------------
File: src/domain/project/location.schema.ts
Description: Location list schemas - event venue and location management
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { z } from 'zod';
import {
  personInfoSchema,
  contactInfoSchema,
  geoPointSchema,
  optionalTimestampSchema,
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
  LocationType,
  CreatedBy,
  ListSource,
} from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * ============================================================================
 * LOCATION CONFIG SCHEMA
 * ============================================================================
 */
export const locationConfigSchema = listBaseConfigSchema.extend({
  type: z.literal(ListType.LOCATION),
  source: z.nativeEnum(ListSource).default(ListSource.PROJECT_LIST),
  multipleLocations: z.boolean().default(DEFAULTS.DISABLED),
  status: z.nativeEnum(SectionStatus).default(SectionStatus.UNLOCKED),
  actionOn: z.nativeEnum(ActionOn).default(ActionOn.PHOTOGRAPHER),
  clientLastViewed: optionalTimestampSchema.optional(),
  finalized: z.boolean().default(DEFAULTS.DISABLED),
});

export const locationConfigInputSchema = locationConfigSchema.omit({
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

export const locationConfigUpdateSchema = locationConfigInputSchema.partial();

/**
 * ============================================================================
 * LOCATION ITEM SCHEMA
 * ============================================================================
 */
export const locationItemSchema = listBaseItemSchema.extend({
  // Domain-specific fields
  locationType: z.nativeEnum(LocationType),
  locationName: z
    .string()
    .min(1, 'Location name is required')
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Name ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .trim(),
  locationAddress1: z.string().min(1, 'Address is required').max(200, 'Address is too long').trim(),
  locationPostcode: z
    .string()
    .min(1, 'Postcode is required')
    .max(20, 'Postcode is too long')
    .trim(),
  locationNotes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional(),
  locationContactPerson: personInfoSchema.optional().nullable(),
  locationContactInfo: contactInfoSchema.optional().nullable(),
  arriveTime: optionalTimestampSchema.optional(),
  leaveTime: optionalTimestampSchema.optional(),
  nextLocationTravelTimeEstimate: z.number().int().min(0).optional(),
  nextLocationTravelArrangements: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Travel arrangements ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
  updatedBy: z.nativeEnum(CreatedBy).optional().nullable(),
  geopoint: geoPointSchema.optional().nullable(),
  notes: z.string().max(1000, 'Notes are too long').optional().nullable(),
});

/**
 * ============================================================================
 * INPUT SCHEMAS
 * ============================================================================
 */
export const locationItemInputSchema = listBaseItemInputSchema.extend({
  locationType: z.nativeEnum(LocationType).optional(),
  locationName: z
    .string()
    .min(1, 'Location name is required')
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Name ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .trim()
    .optional(),
  locationAddress1: z
    .string()
    .min(1, 'Address is required')
    .max(200, 'Address is too long')
    .trim()
    .optional(),
  locationPostcode: z
    .string()
    .min(1, 'Postcode is required')
    .max(20, 'Postcode is too long')
    .trim()
    .optional(),
  locationNotes: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Notes ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional(),
  locationContactPerson: personInfoSchema.optional().nullable(),
  locationContactInfo: contactInfoSchema.optional().nullable(),
  arriveTime: optionalTimestampSchema.optional(),
  leaveTime: optionalTimestampSchema.optional(),
  nextLocationTravelTimeEstimate: z.number().int().min(0).optional(),
  nextLocationTravelArrangements: z
    .string()
    .max(DEFAULTS.TEXT_LENGTHS.NOTES, `Travel arrangements ${DEFAULTS.TEXT_LENGTHS_MSG.NOTES}`)
    .optional(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
  updatedBy: z.nativeEnum(CreatedBy).optional().nullable(),
  notes: z.string().max(1000, 'Notes are too long').optional().nullable(),
});

export const locationItemUpdateSchema = locationItemInputSchema.partial();

// For form handling with string time inputs
export const locationItemFormSchema = locationItemInputSchema.extend({
  arriveTime: z.string().optional().nullable(),
  leaveTime: z.string().optional().nullable(),
});

/**
 * ============================================================================
 * LOCATION LIST SCHEMA
 * ============================================================================
 */
export const locationListSchema = z.object({
  config: locationConfigSchema,
  items: z.array(locationItemSchema).default([]),
  pendingUpdates: z.array(listBasePendingUpdateSchema).optional().default([]),
});

/**
 * ============================================================================
 * VALIDATION REFINEMENTS
 * ============================================================================
 */
export const locationItemWithTimesSchema = locationItemInputSchema.refine(
  data => {
    if (data.arriveTime && data.leaveTime) {
      return data.leaveTime > data.arriveTime;
    }
    return true;
  },
  {
    message: 'Leave time must be after arrive time',
    path: ['leaveTime'],
  },
);

/**
 * ============================================================================
 * QUERY SCHEMAS
 * ============================================================================
 */
export const locationFilterSchema = z.object({
  locationType: z.nativeEnum(LocationType).optional(),
  hasContact: z.boolean().optional(),
  date: optionalTimestampSchema.optional(),
});

export const locationSortSchema = z.object({
  field: z.enum(['arriveTime', 'locationName', 'itemName', 'createdAt']),
  direction: z.enum(['asc', 'desc']).default(DEFAULTS.SORT_DIRECTION_ASC),
});

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */
export type LocationConfig = z.infer<typeof locationConfigSchema>;
export type LocationConfigInput = z.infer<typeof locationConfigInputSchema>;
export type LocationConfigUpdate = z.infer<typeof locationConfigUpdateSchema>;

export type LocationItem = z.infer<typeof locationItemSchema>;
export type LocationItemInput = z.infer<typeof locationItemInputSchema>;
export type LocationItemUpdate = z.infer<typeof locationItemUpdateSchema>;
export type LocationItemForm = z.infer<typeof locationItemFormSchema>;

export type LocationList = z.infer<typeof locationListSchema>;
export type LocationItemWithTimes = z.infer<typeof locationItemWithTimesSchema>;
export type LocationFilter = z.infer<typeof locationFilterSchema>;
export type LocationSort = z.infer<typeof locationSortSchema>;

/**
 * ============================================================================
 * DEFAULT VALUE FACTORY
 * ============================================================================
 */
export const defaultLocationItem = (
  input: LocationItemInput,
  options?: {
    createdBy?: CreatedBy;
    geopoint?: LocationItem['geopoint'];
  },
): Omit<LocationItem, 'id'> => ({
  categoryId: undefined,
  itemName: input.locationName || input.itemName || '',
  itemDescription: input.locationNotes || input.itemDescription || '',
  isCustom: DEFAULTS.DISABLED,
  isChecked: DEFAULTS.DISABLED,
  isDisabled: DEFAULTS.DISABLED,
  locationType: input.locationType ?? LocationType.SINGLE_LOCATION,
  locationName: input.locationName || '',
  locationAddress1: input.locationAddress1 || '',
  locationPostcode: input.locationPostcode || '',
  locationNotes: input.locationNotes,
  locationContactPerson: input.locationContactPerson ?? null,
  locationContactInfo: input.locationContactInfo ?? null,
  arriveTime: input.arriveTime,
  leaveTime: input.leaveTime,
  nextLocationTravelTimeEstimate: input.nextLocationTravelTimeEstimate,
  nextLocationTravelArrangements: input.nextLocationTravelArrangements,
  createdBy: options?.createdBy,
  updatedBy: options?.createdBy ?? null,
  geopoint: options?.geopoint ?? null,
  notes: input.notes ?? null,
});
