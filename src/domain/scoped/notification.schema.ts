/*---------------------------------------
File: src/domain/user-owned/notification.schema.ts
Description: Notification schemas used throughout the application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
import { z } from 'zod';
import { idSchema, optionalTimestampSchema } from '@/domain/common/shared-schemas';
import { NotificationType, NotificationPriority, NotificationStatus } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';
/**
 * Notification Schemas
 * Notification settings and preferences management
 */

export const notificationSettingsSchema = z.object({
  id: idSchema,
  enabled: z.boolean().default(DEFAULTS.ENABLED),
  minutesBefore: z
    .number()
    .int()
    .min(1, 'Must be at least 1 minute')
    .max(1440, 'Must be less than 24 hours')
    .default(10),
  type: z.nativeEnum(NotificationType).default(NotificationType.PUSH),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
  sound: z.boolean().default(DEFAULTS.ENABLED),
  vibration: z.boolean().default(DEFAULTS.ENABLED),
  status: z.nativeEnum(NotificationStatus).default(NotificationStatus.PENDING),
  customMessage: z.string().max(200, 'Custom message must be less than 200 characters').optional(),
});

export const globalNotificationSettingsSchema = z
  .object({
    enabled: z.boolean(),
    type: z.nativeEnum(NotificationType),
    minutesBefore: z
      .number()
      .int()
      .min(1, 'Must be at least 1 minute')
      .max(1440, 'Must be less than 24 hours')
      .default(10),
    priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
    sound: z.boolean().default(DEFAULTS.ENABLED),
    vibration: z.boolean().default(DEFAULTS.ENABLED),
    applyToAll: z.boolean(),
  })
  .strict();

export const notificationDataSchema = z.object({
  scheduledTime: optionalTimestampSchema,
  hasBeenSent: z.boolean().default(DEFAULTS.DISABLED),
  message: z.string().max(500, 'Message is too long').optional(),
});

export const notificationSettingsInputSchema = notificationSettingsSchema.omit({
  id: true,
  status: true,
});

export const notificationSettingsUpdateSchema = notificationSettingsSchema
  .omit({
    id: true,
  })
  .partial();

export const globalNotificationSettingsInputSchema = globalNotificationSettingsSchema;

export const globalNotificationSettingsUpdateSchema = globalNotificationSettingsSchema.partial();

// ============================================================================
// Batch Operations Schema
// ============================================================================

export const notificationBatchUpdateSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1, 'At least one notification must be selected'),
  update: notificationSettingsUpdateSchema,
});

export const notificationBatchEnableSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1, 'At least one notification must be selected'),
  enabled: z.boolean(),
});

// ============================================================================
// Schedule Schema
// ============================================================================

export const notificationScheduleSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  notificationSettings: notificationSettingsInputSchema,
});

export const notificationScheduleUpdateSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
  scheduledTime: optionalTimestampSchema,
  status: z.nativeEnum(NotificationStatus).optional(),
});

// ============================================================================
// Validation Refinements
// ============================================================================

export const notificationWithScheduleSchema = notificationSettingsInputSchema.refine(
  data => {
    if (data.enabled) {
      return data.minutesBefore > 0;
    }
    return true;
  },
  {
    message: 'Enabled notifications must have a valid schedule time',
    path: ['minutesBefore'],
  },
);

// ============================================================================
// Delivery Schema
// ============================================================================

export const notificationDeliverySchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
  recipientId: z.string().min(1, 'Recipient ID is required'),
  channel: z.nativeEnum(NotificationType),
  deliveryTime: optionalTimestampSchema,
  delivered: z.boolean().default(DEFAULTS.DISABLED),
  error: z.string().optional(),
});

export const notificationDeliveryResultSchema = z.object({
  success: z.boolean(),
  notificationId: z.string().min(1),
  deliveredAt: optionalTimestampSchema,
  error: z.string().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsInputSchema>;
export type NotificationSettingsUpdate = z.infer<typeof notificationSettingsUpdateSchema>;
export type GlobalNotificationSettings = z.infer<typeof globalNotificationSettingsSchema>;
export type GlobalNotificationSettingsInput = z.infer<typeof globalNotificationSettingsInputSchema>;
export type GlobalNotificationSettingsUpdate = z.infer<
  typeof globalNotificationSettingsUpdateSchema
>;
export type NotificationData = z.infer<typeof notificationDataSchema>;
export type NotificationBatchUpdate = z.infer<typeof notificationBatchUpdateSchema>;
export type NotificationBatchEnable = z.infer<typeof notificationBatchEnableSchema>;
export type NotificationSchedule = z.infer<typeof notificationScheduleSchema>;
export type NotificationScheduleUpdate = z.infer<typeof notificationScheduleUpdateSchema>;
export type NotificationWithSchedule = z.infer<typeof notificationWithScheduleSchema>;
export type NotificationDelivery = z.infer<typeof notificationDeliverySchema>;
export type NotificationDeliveryResult = z.infer<typeof notificationDeliveryResultSchema>;
