/*---------------------------------------
File: src/constants/defaults.ts
Description: Centralized default values for schema configurations
Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.0.0
---------------------------------------*/

// Common default values used across multiple schemas
export const DEFAULTS = {
  // Maximum lengths
  TEXT_LENGTHS: {
    NAME: 50,
    DESCRIPTION: 100,
    NOTES: 500,
    ICON_NAME: 50,
  },
  TEXT_LENGTHS_MSG: {
    REQUIRED: 'is required',
    NAME: 'Must be less than 50 characters',
    DESCRIPTION: 'Must be less than 100 characters',
    NOTES: 'Must be less than 500 characters',
    ICON_NAME: 'Must be less than 50 characters',
  },

  // Version strings
  VERSION: '1.0',
  BUSINESS_CARD_VERSION: '4.0',

  // Status enums
  SECTION_STATUS: 'unlocked',
  NOTIFICATION_STATUS: 'pending',
  TIMELINE_STATUS: 'upcoming',

  // Priority enums
  NOTIFICATION_PRIORITY: 'normal',
  PHOTO_REQUEST_PRIORITY: 'niceToHave',

  // Boolean defaults
  ENABLED: true,
  DISABLED: false,
  REQUIRED: true,
  OPTIONAL: false,

  // Common numeric defaults
  RETRY_COUNT: 10,
  PERCENTAGE_COMPLETE: 0,
  ITEM_COUNT: 0,

  // Portal defaults
  PORTAL_EXPIRATION_DAYS: 14,
  PORTAL_EXTENSION_DAYS: 14,

  // Sorting defaults
  SORT_DIRECTION: 'desc',
  SORT_DIRECTION_ASC: 'asc',

  // Empty arrays (these can't be truly centralized due to TypeScript limitations)
  // But we can define them as functions for type safety
} as const;

// Type-safe empty array creators
export const createEmptyArray = <T>(): T[] => [];
export const createEmptyObject = <T extends Record<string, unknown>>(): T => ({}) as T;
