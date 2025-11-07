/*---------------------------------------
File: src/domain/project/timeline.schema.ts
Description: Timeline list schemas - event scheduling and timeline management
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { z } from 'zod';
import {
  listBaseConfigSchema,
  listBaseItemSchema,
  listBaseItemInputSchema,
  listBasePendingUpdateSchema,
} from '@/domain/common/list-base.schema';
import {
  idSchema,
  optionalTimestampSchema,
  weatherDataSchema,
  notificationDataSchema,
} from '@/domain/common/shared-schemas';
import {
  ListType,
  ListSource,
  TimelineMode,
  TimelineEventType,
  TimelineEventStatus,
  CreatedBy,
  ActionOn,
  SectionStatus,
} from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

/**
 * ============================================================================
 * TIMELINE CONFIG SCHEMA
 * ============================================================================
 */
export const timelineConfigSchema = listBaseConfigSchema.extend({
  type: z.literal(ListType.TIMELINE),
  source: z.nativeEnum(ListSource).default(ListSource.PROJECT_LIST),
  status: z.nativeEnum(SectionStatus).default(SectionStatus.UNLOCKED),
  actionOn: z.nativeEnum(ActionOn).default(ActionOn.PHOTOGRAPHER),
  clientLastViewed: optionalTimestampSchema.optional(),
  mode: z.nativeEnum(TimelineMode).default(TimelineMode.SETUP),
  totalEvents: z.number().int().min(0).default(0),
  officialStartTime: optionalTimestampSchema.optional(),
  officialEndTime: optionalTimestampSchema.optional(),
  finalized: z.boolean().default(DEFAULTS.DISABLED),
});

export const timelineConfigInputSchema = timelineConfigSchema.omit({
  id: true,
  type: true,
  source: true,
  status: true,
  actionOn: true,
  createdBy: true,
  lastModifiedBy: true,
  totalEvents: true,
  officialStartTime: true,
  officialEndTime: true,
  createdAt: true,
  updatedAt: true,
});

export const timelineConfigUpdateSchema = timelineConfigInputSchema.partial();

/**
 * ============================================================================
 * TIMELINE EVENT (ITEM) SCHEMA
 * ============================================================================
 */
export const timelineEventSchema = listBaseItemSchema.extend({
  // Domain-specific fields
  type: z.nativeEnum(TimelineEventType),
  description: z.string().max(500, 'Description is too long').optional(),
  notes: z.string().max(500, 'Notes are too long').optional(),
  status: z.nativeEnum(TimelineEventStatus),
  startTime: optionalTimestampSchema.optional(),
  endTime: optionalTimestampSchema.optional(),
  duration: z.number().int().min(0).optional(),
  locationId: idSchema.optional(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
  updatedBy: z.nativeEnum(CreatedBy).optional(),
  notification: notificationDataSchema.optional(),
  weather: weatherDataSchema.optional(),
});

export const timelineEventInputSchema = listBaseItemInputSchema.extend({
  type: z.nativeEnum(TimelineEventType).optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  notes: z.string().max(500, 'Notes are too long').optional(),
  status: z.nativeEnum(TimelineEventStatus).optional(),
  startTime: optionalTimestampSchema.optional(),
  endTime: optionalTimestampSchema.optional(),
  duration: z.number().int().min(0).optional(),
  locationId: idSchema.optional(),
  createdBy: z.nativeEnum(CreatedBy).optional(),
  updatedBy: z.nativeEnum(CreatedBy).optional(),
  notification: notificationDataSchema.optional(),
});

export const timelineEventUpdateSchema = timelineEventInputSchema.partial();

/**
 * ============================================================================
 * TIMELINE LIST WRAPPER SCHEMA
 * ============================================================================
 */
export const timelineListSchema = z.object({
  config: timelineConfigSchema,
  items: z.array(timelineEventSchema).default([]),
  pendingUpdates: z.array(listBasePendingUpdateSchema).optional().default([]),
});

/**
 * ============================================================================
 * VALIDATION REFINEMENTS
 * ============================================================================
 */
export const timelineEventWithTimesSchema = timelineEventInputSchema.refine(
  data => {
    if (data.startTime && data.endTime) {
      return data.endTime > data.startTime;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  },
);

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */
export type TimelineConfig = z.infer<typeof timelineConfigSchema>;
export type TimelineConfigInput = z.infer<typeof timelineConfigInputSchema>;
export type TimelineConfigUpdate = z.infer<typeof timelineConfigUpdateSchema>;

export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type TimelineEventInput = z.infer<typeof timelineEventInputSchema>;
export type TimelineEventUpdate = z.infer<typeof timelineEventUpdateSchema>;

export type TimelineList = z.infer<typeof timelineListSchema>;
export type TimelineEventWithTimes = z.infer<typeof timelineEventWithTimesSchema>;

/**
 * ============================================================================
 * DEFAULT VALUE FACTORY
 * ============================================================================
 */
export const defaultTimelineEvent = (input: TimelineEventInput): Omit<TimelineEvent, 'id'> => ({
  categoryId: undefined,
  itemName: input.itemName,
  itemDescription: input.itemDescription,
  type: input.type ?? TimelineEventType.OTHER,
  description: input.description,
  notes: input.notes,
  status: input.status ?? TimelineEventStatus.UPCOMING,
  startTime: input.startTime,
  endTime: input.endTime,
  duration: input.duration,
  locationId: undefined,
  createdBy: undefined,
  updatedBy: undefined,
  notification: input.notification,
  weather: undefined,
  isCustom: false,
  isChecked: false,
  isDisabled: false,
});
