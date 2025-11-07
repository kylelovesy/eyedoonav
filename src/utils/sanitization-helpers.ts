/*---------------------------------------
File: src/utils/sanitization-helpers.ts
Description: Centralized sanitization utilities for consistent input cleaning.
Provides standardized helpers for sanitizing strings, emails, URLs, dates, and domain-specific types.

Author: Kyle Lovesy
Date: 28/10-2025 - 14.00
Version: 2.0.0
---------------------------------------*/

// Domain/types
import { PersonInfo, ContactInfo } from '@/domain/common/shared-schemas';

// =================================================================================
// MARK: - Core String Sanitization
// =================================================================================

/**
 * Sanitizes a string by trimming whitespace and removing null/undefined
 *
 * @param value - String to sanitize
 * @returns Sanitized string or undefined if empty
 *
 * @example
 * ```typescript
 * sanitizeString('  hello  ') // 'hello'
 * sanitizeString(null) // undefined
 * sanitizeString('   ') // undefined
 * ```
 */
export function sanitizeString(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Sanitizes a string and converts to null if empty
 * Useful for optional fields that explicitly use null
 *
 * @param value - String to sanitize
 * @returns Sanitized string or null if empty
 */
export function sanitizeStringOrNull(value: string | null | undefined): string | null {
  const sanitized = sanitizeString(value);
  return sanitized ?? null;
}

/**
 * Sanitizes a string and converts to undefined if empty
 * Useful for optional fields that expect undefined instead of null
 *
 * @param value - String to sanitize
 * @returns Sanitized string or undefined if empty/null
 */
export function sanitizeStringOrUndefined(value: string | null | undefined): string | undefined {
  return sanitizeString(value);
}

// =================================================================================
// MARK: - Email Sanitization
// =================================================================================

/**
 * Sanitizes an email address
 * - Trims whitespace
 * - Converts to lowercase
 * - Validates basic email format
 *
 * @param email - Email to sanitize
 * @returns Lowercase, trimmed email or null if invalid
 *
 * @example
 * ```typescript
 * sanitizeEmail('  John@Example.COM  ') // 'john@example.com'
 * sanitizeEmail('invalid-email') // null
 * sanitizeEmail(null) // null
 * ```
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  const trimmed = sanitizeString(email);
  if (!trimmed) return null;

  const lowercased = trimmed.toLowerCase();

  // Basic email regex (full validation should be done with Zod)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(lowercased)) return null;

  return lowercased;
}

// =================================================================================
// MARK: - Phone Sanitization
// =================================================================================

/**
 * Sanitizes a phone number
 * - Removes all non-digit characters except + at start
 * - Validates minimum digit count
 *
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone or null if invalid
 *
 * @example
 * ```typescript
 * sanitizePhone('+1 (555) 123-4567') // '+15551234567'
 * sanitizePhone('123') // null (too short)
 * sanitizePhone(null) // null
 * ```
 */
export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except + at start
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Basic validation: must have at least 10 digits (excluding +)
  const digitsOnly = cleaned.replace(/\+/g, '');
  if (digitsOnly.length < 10) return null;

  return cleaned;
}

// =================================================================================
// MARK: - URL Sanitization
// =================================================================================

/**
 * Sanitizes a URL
 * - Trims whitespace
 * - Adds https:// protocol if missing
 * - Validates URL format
 *
 * @param url - URL to sanitize
 * @returns Valid URL or null
 *
 * @example
 * ```typescript
 * sanitizeUrl('example.com') // 'https://example.com'
 * sanitizeUrl('https://example.com') // 'https://example.com'
 * sanitizeUrl('invalid url') // null
 * sanitizeUrl(null) // null
 * ```
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  const trimmed = sanitizeString(url);
  if (!trimmed) return null;

  try {
    // Add protocol if missing
    const urlWithProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

    // Validate URL
    new URL(urlWithProtocol);
    return urlWithProtocol;
  } catch {
    return null;
  }
}

// =================================================================================
// MARK: - Array Sanitization
// =================================================================================

/**
 * Sanitizes an array by removing null/undefined/empty items
 *
 * @param array - Array to sanitize
 * @returns Sanitized array
 *
 * @example
 * ```typescript
 * sanitizeArray([1, null, 2, undefined, 3]) // [1, 2, 3]
 * sanitizeArray(null) // []
 * ```
 */
export function sanitizeArray<T>(array: (T | null | undefined)[] | null | undefined): T[] {
  if (!array) return [];
  return array.filter((item): item is T => item != null);
}

// =================================================================================
// MARK: - Domain-Specific Sanitization
// =================================================================================

/**
 * Sanitizes PersonInfo
 * - Sanitizes firstName and lastName fields
 * - Returns empty strings for invalid values (required fields)
 *
 * @param info - PersonInfo to sanitize
 * @returns Sanitized PersonInfo
 *
 * @example
 * ```typescript
 * sanitizePersonInfo({
 *   firstName: '  John  ',
 *   lastName: '  Doe  '
 * })
 * // { firstName: 'John', lastName: 'Doe' }
 * ```
 */
export function sanitizePersonInfo(info: PersonInfo | null | undefined): PersonInfo {
  if (!info) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  return {
    firstName: sanitizeString(info.firstName) || '',
    lastName: sanitizeString(info.lastName) || '',
  };
}

/**
 * Sanitizes ContactInfo
 * - Sanitizes email, phone, and website fields
 * - Returns undefined for invalid optional fields
 * - Email is required, so invalid email returns empty string
 *
 * @param info - ContactInfo to sanitize
 * @returns Sanitized ContactInfo
 *
 * @example
 * ```typescript
 * sanitizeContactInfo({
 *   email: '  John@Example.COM  ',
 *   phone: '+1 (555) 123-4567',
 *   website: 'example.com'
 * })
 * // {
 * //   email: 'john@example.com',
 * //   phone: '+15551234567',
 * //   website: 'https://example.com'
 * // }
 * ```
 */
export function sanitizeContactInfo(info: ContactInfo | null | undefined): ContactInfo {
  if (!info) {
    return {
      email: '',
      phone: undefined,
      website: undefined,
    };
  }

  const sanitizedEmail = sanitizeEmail(info.email);

  return {
    email: sanitizedEmail || '',
    phone: info.phone ? sanitizePhone(info.phone) || undefined : undefined,
    website: info.website ? sanitizeUrl(info.website) || undefined : undefined,
  };
}

// =================================================================================
// MARK: - Number Sanitization
// =================================================================================

/**
 * Sanitizes a number
 * - Converts string to number
 * - Applies min/max constraints
 *
 * @param value - Value to sanitize
 * @param min - Minimum value
 * @param max - Maximum value
 * @param defaultValue - Default value if invalid
 * @returns Sanitized number or default value
 */
export function sanitizeNumber(
  value: string | number | null | undefined,
  min?: number,
  max?: number,
  defaultValue = 0,
): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return defaultValue;
  }

  if (min !== undefined && num < min) {
    return min;
  }

  if (max !== undefined && num > max) {
    return max;
  }

  return num;
}

/**
 * Sanitizes an integer
 * - Converts to integer
 * - Applies min/max constraints
 *
 * @param value - Value to sanitize
 * @param min - Minimum value
 * @param max - Maximum value
 * @param defaultValue - Default value if invalid
 * @returns Sanitized integer or default value
 */
export function sanitizeInteger(
  value: string | number | null | undefined,
  min?: number,
  max?: number,
  defaultValue = 0,
): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);

  if (isNaN(num)) {
    return defaultValue;
  }

  if (min !== undefined && num < min) {
    return min;
  }

  if (max !== undefined && num > max) {
    return max;
  }

  return num;
}

// =================================================================================
// MARK: - Boolean Sanitization
// =================================================================================

/**
 * Sanitizes a boolean
 * - Converts string 'true'/'false' to boolean
 * - Handles null/undefined
 *
 * @param value - Value to sanitize
 * @param defaultValue - Default value if invalid
 * @returns Sanitized boolean or default value
 */
export function sanitizeBoolean(
  value: string | boolean | null | undefined,
  defaultValue = false,
): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).toLowerCase().trim();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return defaultValue;
}

// =================================================================================
// MARK: - Date Sanitization
// =================================================================================

/**
 * Sanitizes a date
 * - Converts string to Date object
 * - Handles invalid dates
 *
 * @param value - Value to sanitize
 * @param defaultValue - Default date if invalid
 * @returns Sanitized Date or default value
 */
export function sanitizeDate(
  value: string | Date | number | null | undefined,
  defaultValue?: Date,
): Date | undefined {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;

  if (isNaN(date.getTime())) {
    return defaultValue;
  }

  return date;
}

// =================================================================================
// MARK: - Object Sanitization
// =================================================================================

/**
 * Sanitizes an object by removing null/undefined values
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object without null/undefined values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T | null | undefined,
): Partial<T> {
  if (!obj) {
    return {};
  }

  const sanitized: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Sanitizes all string values in an object recursively
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObjectStrings<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj } as Record<string, unknown>;

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value) ?? value; // Keep original if sanitization returns undefined
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObjectStrings(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string'
          ? (sanitizeString(item) ?? item)
          : typeof item === 'object' && item !== null
            ? sanitizeObjectStrings(item as Record<string, unknown>)
            : item,
      );
    }
  }

  return sanitized as T;
}

// =================================================================================
// MARK: - Specialized String Sanitization
// =================================================================================

/**
 * Sanitizes a string and limits its length
 *
 * @param value - String to sanitize
 * @param maxLength - Maximum length
 * @returns Sanitized string trimmed to maxLength or undefined
 */
export function sanitizeStringWithMaxLength(
  value: string | null | undefined,
  maxLength: number,
): string | undefined {
  const sanitized = sanitizeString(value);
  if (!sanitized) return undefined;

  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes a display name
 * - Trims whitespace
 * - Removes excessive spaces
 * - Limits length
 *
 * @param name - Name to sanitize
 * @param maxLength - Maximum length
 * @returns Sanitized display name or undefined
 */
export function sanitizeDisplayName(
  name: string | null | undefined,
  maxLength = 100,
): string | undefined {
  const sanitized = sanitizeString(name);
  if (!sanitized) return undefined;

  // Remove excessive spaces
  const normalized = sanitized.replace(/\s+/g, ' ');

  if (normalized.length > maxLength) {
    return normalized.substring(0, maxLength).trim();
  }

  return normalized;
}

/**
 * Sanitizes a text field (description, notes, etc.)
 * - Trims whitespace
 * - Removes excessive line breaks
 * - Normalizes whitespace
 *
 * @param text - Text to sanitize
 * @param maxLength - Maximum length
 * @returns Sanitized text or undefined
 */
export function sanitizeText(
  text: string | null | undefined,
  maxLength?: number,
): string | undefined {
  const sanitized = sanitizeString(text);
  if (!sanitized) return undefined;

  // Normalize line breaks
  let normalized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive line breaks (more than 2 consecutive)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // Trim each line
  normalized = normalized
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  if (maxLength && normalized.length > maxLength) {
    return normalized.substring(0, maxLength).trim();
  }

  return normalized;
}

/**
 * Sanitizes a UUID
 * - Trims whitespace
 * - Converts to lowercase
 * - Validates format (basic check)
 *
 * @param uuid - UUID to sanitize
 * @returns Sanitized UUID or null if invalid
 */
export function sanitizeUuid(uuid: string | null | undefined): string | null {
  const sanitized = sanitizeString(uuid);
  if (!sanitized) return null;

  const normalized = sanitized.toLowerCase();

  // Basic UUID format check (full validation should be done with Zod)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(normalized)) return null;

  return normalized;
}

/**
 * Sanitizes a password (basic sanitization, does not validate strength)
 * - Trims whitespace
 * - Removes leading/trailing whitespace only
 *
 * @param password - Password to sanitize
 * @returns Sanitized password or undefined
 */
export function sanitizePassword(password: string | null | undefined): string | undefined {
  if (password === null || password === undefined) return undefined;
  // Only trim, don't normalize - passwords may intentionally have spaces
  const trimmed = String(password).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Sanitizes a URL slug
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 *
 * @param slug - Slug to sanitize
 * @returns Sanitized slug or undefined
 */
export function sanitizeSlug(slug: string | null | undefined): string | undefined {
  const sanitized = sanitizeString(slug);
  if (!sanitized) return undefined;

  return sanitized
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Sanitizes a search query
 * - Trims whitespace
 * - Removes excessive spaces
 * - Limits length
 *
 * @param query - Search query to sanitize
 * @param maxLength - Maximum length
 * @returns Sanitized search query or undefined
 */
export function sanitizeSearchQuery(
  query: string | null | undefined,
  maxLength = 500,
): string | undefined {
  const sanitized = sanitizeString(query);
  if (!sanitized) return undefined;

  // Remove excessive spaces
  const normalized = sanitized.replace(/\s+/g, ' ');

  if (normalized.length > maxLength) {
    return normalized.substring(0, maxLength).trim();
  }

  return normalized;
}

// =================================================================================
// MARK: - Undefined Value Removal
// =================================================================================

/**
 * Removes keys with 'undefined' values from an object.
 * Firestore updateDoc errors with 'undefined', but 'null' is fine.
 *
 * @param obj - Object to sanitize
 * @returns Object without undefined values
 *
 * @example
 * ```typescript
 * removeUndefinedValues({ a: 1, b: undefined, c: null })
 * // { a: 1, c: null }
 * ```
 */
export function removeUndefinedValues<T extends object>(obj: T): Partial<T> {
  const newObj: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}
