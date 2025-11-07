/*---------------------------------------
File: src/utils/date-time-utils.ts
Description: Date and timestamp utility functions for Firestore data conversion
Author: Kyle Lovesy
Date: 28/10-2025
Version: 1.0.0
---------------------------------------*/

import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { timestampPreprocessor } from '@/domain/common/shared-schemas';

/**
 * Converts a single Firestore Timestamp to a JavaScript Date object
 * Uses the existing timestampPreprocessor for consistency
 * @param val - The value to convert
 * @returns A Date object or undefined if conversion fails
 */
export function convertTimestampToDate(val: unknown): Date | undefined {
  return timestampPreprocessor(val);
}

/**
 * Recursively converts all Firestore Timestamps in an object/array to JavaScript Date objects
 * Handles nested structures, arrays, and preserves all other data types
 * @param data - The data structure to process (object, array, or primitive)
 * @returns The same structure with all Timestamps converted to Dates
 */
export function convertAllTimestamps<T>(data: T): T {
  // Handle null or undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Firestore Timestamp objects
  if (data instanceof Timestamp) {
    return data.toDate() as T;
  }

  // Handle Timestamp-like objects (plain objects with seconds/nanoseconds)
  if (
    typeof data === 'object' &&
    data !== null &&
    'seconds' in data &&
    'nanoseconds' in data &&
    typeof (data as Record<string, unknown>).seconds === 'number' &&
    typeof (data as Record<string, unknown>).nanoseconds === 'number'
  ) {
    const timestamp = data as unknown as { seconds: number; nanoseconds: number };
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate() as T;
  }

  // Handle arrays - recursively process each element
  if (Array.isArray(data)) {
    return data.map(item => convertAllTimestamps(item)) as T;
  }

  // Handle Date objects - return as-is (already converted)
  if (data instanceof Date) {
    return data;
  }

  // Handle plain objects - recursively process each property
  if (typeof data === 'object' && data !== null) {
    const converted = {} as T;
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        (converted as Record<string, unknown>)[key] = convertAllTimestamps(
          (data as Record<string, unknown>)[key],
        );
      }
    }
    return converted;
  }

  // Return primitives (string, number, boolean) unchanged
  return data;
}

/**
 * Formats a Date, date string, or timestamp into a consistent, readable format.
 * Returns a placeholder if the date is null or invalid.
 * @param date The date to format (Date, string, number, or null/undefined).
 * @param formatString The 'date-fns' format string.
 * @returns A formatted date string or placeholder.
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  formatString: string = 'MM/dd/yyyy',
): string => {
  if (!date) {
    return 'N/A';
  }

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return format(dateObj, formatString);
  } catch (error) {
    console.error('[formatDate] Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Add these exports at the end of date-time-utils.ts

// =================================================================================
// TODO: Remove this once we have a proper testing framework
// MARK: - Boolean Testing Helpers (for testing)
// =================================================================================

/**
 * Tests if a value can be successfully converted to a Date using convertTimestampToDate.
 * Uses convertTimestampToDate internally but returns boolean for testing convenience.
 *
 * @param val - The value to test for conversion
 * @returns true if conversion succeeds and returns a valid Date, false otherwise
 */
export const canConvertTimestampToDate = (val: unknown): boolean => {
  try {
    const result = convertTimestampToDate(val);
    return result instanceof Date && !isNaN(result.getTime());
  } catch {
    return false;
  }
};

/**
 * Tests if convertAllTimestamps can process a data structure without errors.
 * Uses convertAllTimestamps internally but returns boolean for testing convenience.
 *
 * @param data - The data structure to test
 * @returns true if conversion succeeds without throwing, false otherwise
 */
export const canConvertAllTimestamps = <T>(data: T): boolean => {
  try {
    const result = convertAllTimestamps(data);
    return result !== undefined; // Basic check that it returns something
  } catch {
    return false;
  }
};

/**
 * Tests if a date can be successfully formatted using formatDate.
 * Uses formatDate internally but returns boolean for testing convenience.
 *
 * @param date - The date to test for formatting
 * @param formatString - Optional format string to test
 * @returns true if formatting succeeds and returns a non-placeholder string, false otherwise
 */
export const canFormatDate = (
  date: Date | string | number | null | undefined,
  formatString: string = 'MM/dd/yyyy',
): boolean => {
  const result = formatDate(date, formatString);
  return result !== 'N/A' && result !== 'Invalid Date';
};
