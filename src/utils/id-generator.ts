/*---------------------------------------
File: src/utils/id-generator.ts
Description: Utility for generating unique IDs
Author: Kyle Lovesy
Date: 31/10-2025 - 10.00
Version: 1.0.0
---------------------------------------*/

/**
 * Generates a unique v4 UUID.
 * This uses the native crypto module available in React Native.
 */
export const generateId = (): string => {
  return crypto.randomUUID();
};
