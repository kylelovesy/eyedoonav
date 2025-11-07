import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Zod preprocessor to safely convert Firestore Timestamps,
 * date strings, or existing Date objects into a Date.
 *
 * This should be used on any schema field that expects a Date
 * and might be reading data from Firestore.
 */
export const dateSchema = z.preprocess(arg => {
  // 1. Check for Firestore Timestamp
  if (arg instanceof Timestamp) {
    return arg.toDate();
  }

  // 2. Check for custom object with toDate (like mock Timestamps)
  if (arg && typeof (arg as unknown as { toDate: () => Date }).toDate === 'function') {
    return (arg as unknown as { toDate: () => Date }).toDate();
  }

  // 3. Check for string or existing Date
  if (typeof arg === 'string' || arg instanceof Date) {
    try {
      const date = new Date(arg);
      // Check if the date is valid
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      console.error('[dateSchema] Error converting date:', error);
      // Fall through to let Zod handle the invalid type
      return arg;
    }
  }

  // 4. Return the original argument if conversion failed
  return arg;
}, z.date()); // Finally, validate that it is a Date
