/*---------------------------------------
File: src/utils/validation-helpers.ts
Description: Standardized validation utilities for consistent validation patterns.
Provides helpers for Zod schema validation and field validation with consistent error handling.

Author: Kyle Lovesy
Date: 28/10-2025 - 14.00
Version: 2.0.0
---------------------------------------*/

// Third-party libraries
import { z } from 'zod';

// Domain/types
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';

// Utils
import { ErrorMapper } from '@/utils/error-mapper';
import { sanitizeEmail, sanitizePhone } from '@/utils/sanitization-helpers';

// =================================================================================
// MARK: - Core Schema Validation
// =================================================================================

/**
 * Validates data against a Zod schema and returns Result.
 * Uses ErrorMapper.fromZod to convert validation errors to AppError.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param context - Context string for error reporting (required)
 * @returns Result with validated data or AppError (ValidationError)
 *
 * @example
 * ```typescript
 * const result = validateWithSchema(userSchema, inputData, 'UserService.createUser');
 * if (!result.success) {
 *   // Handle validation error
 *   return result;
 * }
 * const validatedUser = result.value;
 * ```
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string,
): Result<T, AppError> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return err(ErrorMapper.fromZod(result.error, context));
  }

  return ok(result.data);
}

/**
 * Validates partial data against a Zod schema.
 * Useful for update operations where only some fields are provided.
 *
 * @param schema - The Zod schema to validate against (must support .partial())
 * @param data - The partial data to validate
 * @param context - Context string for error reporting (required)
 * @returns Result with validated partial data or AppError (ValidationError)
 *
 * @example
 * ```typescript
 * const result = validatePartialWithSchema(
 *   userUpdateSchema,
 *   { displayName: 'New Name' },
 *   'UserService.updateProfile'
 * );
 * ```
 */
export function validatePartialWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string,
): Result<Partial<T>, AppError> {
  // Check if schema supports partial (must be ZodObject)
  const schemaObj = schema as unknown as { partial?: () => z.ZodSchema<Partial<T>> };

  if (typeof schemaObj.partial !== 'function') {
    return err(
      ErrorMapper.createGenericError(
        ErrorCode.VALIDATION_FAILED,
        'Schema does not support partial validation',
        'Validation failed. Please check the form for errors.',
        context,
      ),
    );
  }

  const partialSchema = schemaObj.partial();
  const result = partialSchema.safeParse(data);

  if (!result.success) {
    return err(ErrorMapper.fromZod(result.error, context));
  }

  return ok(result.data);
}

// =================================================================================
// MARK: - Field Validation
// =================================================================================

/**
 * Validates and sanitizes an email address.
 * Sanitizes the email (trim, lowercase) and validates format.
 *
 * @param email - Email string to validate
 * @param context - Context string for error reporting (required)
 * @returns Result with sanitized email string or AppError
 *
 * @example
 * ```typescript
 * const result = validateEmail(inputEmail, 'AuthService.signUp');
 * if (!result.success) {
 *   // Handle validation error
 * }
 * const sanitizedEmail = result.value;
 * ```
 */
export function validateEmail(email: string, context: string): Result<string, AppError> {
  const sanitized = sanitizeEmail(email);

  if (!sanitized) {
    return err(
      ErrorMapper.createGenericError(
        ErrorCode.VALIDATION_FAILED,
        'Invalid email format',
        'Please provide a valid email address.',
        context,
      ),
    );
  }

  return ok(sanitized);
}

/**
 * Validates and sanitizes a phone number.
 * Sanitizes the phone (removes formatting, keeps + prefix) and validates minimum length.
 *
 * @param phone - Phone string to validate
 * @param context - Context string for error reporting (required)
 * @returns Result with sanitized phone string or AppError
 *
 * @example
 * ```typescript
 * const result = validatePhone(inputPhone, 'UserService.updateContact');
 * if (!result.success) {
 *   // Handle validation error
 * }
 * const sanitizedPhone = result.value;
 * ```
 */
export function validatePhone(phone: string, context: string): Result<string, AppError> {
  const sanitized = sanitizePhone(phone);

  if (!sanitized) {
    return err(
      ErrorMapper.createGenericError(
        ErrorCode.VALIDATION_FAILED,
        'Invalid phone format',
        'Please provide a valid phone number.',
        context,
      ),
    );
  }

  return ok(sanitized);
}

// =================================================================================
// MARK: - Array Validation
// =================================================================================

/**
 * Validates an array of items against a Zod schema.
 * Returns all valid items and collects errors for invalid ones.
 *
 * @param schema - The Zod schema to validate each item against
 * @param items - Array of items to validate
 * @param context - Context string for error reporting (required)
 * @returns Result with array of valid items and array of errors, or AppError
 *
 * @example
 * ```typescript
 * const result = validateArrayWithSchema(userSchema, userArray, 'UserService.batchCreate');
 * if (result.success) {
 *   const { valid, errors } = result.value;
 *   // Process valid items
 * }
 * ```
 */
export function validateArrayWithSchema<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
  context: string,
): Result<{ valid: T[]; errors: z.ZodError[] }, AppError> {
  const valid: T[] = [];
  const errors: z.ZodError[] = [];

  items.forEach(item => {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      errors.push(parsed.error);
    }
  });

  if (errors.length > 0) {
    // Combine all errors into a single ValidationError
    const combinedError = ErrorMapper.fromZod(
      errors[0], // Use first error as base, combine messages
      `${context}[${errors.map((_, i) => i).join(',')}]`,
    );

    // Add field errors from all Zod errors
    errors.forEach((error, index) => {
      error.errors.forEach(err => {
        const field = `${index}.${err.path.join('.')}`;
        combinedError.fieldErrors[field] = err.message;
      });
    });

    return err(combinedError);
  }

  return ok({ valid, errors: [] });
}

// =================================================================================
// MARK: - Conditional Validation
// =================================================================================

/**
 * Validates data conditionally based on a predicate.
 * Returns error if condition is false, otherwise validates with schema.
 *
 * @param condition - Condition to check before validation
 * @param schema - Schema to validate against if condition is true
 * @param data - Data to validate
 * @param context - Context string for error reporting (required)
 * @returns Result with validated data or AppError
 *
 * @example
 * ```typescript
 * const result = validateConditionally(
 *   user.isAdmin,
 *   adminSchema,
 *   inputData,
 *   'UserService.updateAdminSettings'
 * );
 * ```
 */
export function validateConditionally<T>(
  condition: boolean,
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string,
): Result<T, AppError> {
  if (!condition) {
    return err(
      ErrorMapper.createGenericError(
        ErrorCode.VALIDATION_FAILED,
        'Validation condition not met',
        'Validation failed. Please check the form for errors.',
        context,
      ),
    );
  }

  return validateWithSchema(schema, data, context);
}

/**
 * Validates data with custom refinement after base validation.
 * First validates with schema, then applies custom refinement function.
 *
 * @param schema - Base schema to validate against
 * @param data - Data to validate
 * @param refinement - Custom refinement function that returns boolean
 * @param refinementError - Error message if refinement fails
 * @param context - Context string for error reporting (required)
 * @returns Result with validated data or AppError
 *
 * @example
 * ```typescript
 * const result = validateWithRefinement(
 *   dateSchema,
 *   inputDate,
 *   date => date > new Date(),
 *   'Date must be in the future',
 *   'EventService.createEvent'
 * );
 * ```
 */
export function validateWithRefinement<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  refinement: (data: T) => boolean,
  refinementError: string,
  context: string,
): Result<T, AppError> {
  const baseValidation = validateWithSchema(schema, data, context);
  if (!baseValidation.success) {
    return baseValidation;
  }

  if (!refinement(baseValidation.value)) {
    return err(
      ErrorMapper.createGenericError(
        ErrorCode.VALIDATION_FAILED,
        refinementError,
        refinementError,
        context,
      ),
    );
  }

  return baseValidation;
}

// =================================================================================
// MARK: - Field Presence Validation
// =================================================================================

/**
 * Validates that required fields are present and not empty.
 *
 * @param data - Object to check
 * @param requiredFields - Array of required field names
 * @param context - Context string for error reporting (required)
 * @returns Result<void> or AppError with field-specific errors
 *
 * @example
 * ```typescript
 * const result = validateRequiredFields(
 *   formData,
 *   ['email', 'password'],
 *   'AuthService.signUp'
 * );
 * ```
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredFields: Array<keyof T>,
  context: string,
): Result<void, AppError> {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(String(field));
    }
  }

  if (missingFields.length > 0) {
    const fieldErrors: Record<string, string> = {};
    missingFields.forEach(field => {
      fieldErrors[field] = 'This field is required';
    });

    const error = ErrorMapper.createGenericError(
      ErrorCode.VALIDATION_FAILED,
      `Missing required fields: ${missingFields.join(', ')}`,
      'Please fill in all required fields.',
      context,
    );

    // Add field errors if error is ValidationError
    if ('fieldErrors' in error) {
      (error as { fieldErrors: Record<string, string> }).fieldErrors = fieldErrors;
    }

    return err(error);
  }

  return ok(undefined);
}

/**
 * Validates that at least one field is present.
 * Useful for partial updates where at least one field must be provided.
 *
 * @param data - Object to check
 * @param fields - Array of field names to check
 * @param context - Context string for error reporting (required)
 * @returns Result<void> or AppError
 *
 * @example
 * ```typescript
 * const result = validateAtLeastOneField(
 *   updateData,
 *   ['email', 'phone', 'displayName'],
 *   'UserService.updateProfile'
 * );
 * ```
 */
export function validateAtLeastOneField<T extends Record<string, unknown>>(
  data: T,
  fields: Array<keyof T>,
  context: string,
): Result<void, AppError> {
  const hasAtLeastOne = fields.some(
    field => data[field] !== undefined && data[field] !== null && data[field] !== '',
  );

  if (!hasAtLeastOne) {
    return err(
      ErrorMapper.createGenericError(
        ErrorCode.VALIDATION_FAILED,
        `At least one of the following fields must be provided: ${fields.join(', ')}`,
        `Please provide at least one of: ${fields.join(', ')}.`,
        context,
      ),
    );
  }

  return ok(undefined);
}

// =================================================================================
// MARK: - Validator Factory
// =================================================================================

/**
 * Creates a validation helper for a specific schema.
 * Useful for creating reusable validation functions.
 *
 * @param schema - The Zod schema to create a validator for
 * @returns A validator function that takes data and context
 *
 * @example
 * ```typescript
 * const validateUser = createValidator(userSchema);
 * const result = validateUser(inputData, 'UserService.create');
 * ```
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown, context: string): Result<T, AppError> => {
    return validateWithSchema(schema, data, context);
  };
}

// =================================================================================
// TODO: Remove this once we have a proper testing framework
// MARK: - Boolean Validation Helpers (for testing)
// =================================================================================

/**
 * Checks if an email address is valid.
 * Uses validateEmail internally but returns boolean for testing convenience.
 *
 * @param email - Email string to validate
 * @returns true if email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  const result = validateEmail(email, 'validation-helpers.isValidEmail');
  return result.success;
};

/**
 * Checks if a phone number is valid.
 * Uses validatePhone internally but returns boolean for testing convenience.
 *
 * @param phone - Phone string to validate
 * @returns true if phone is valid, false otherwise
 */
export const isValidPhone = (phone: string): boolean => {
  const result = validatePhone(phone, 'validation-helpers.isValidPhone');
  return result.success;
};

/**
 * Checks if data is valid against a Zod schema.
 * Uses validateWithSchema internally but returns boolean for testing convenience.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns true if data is valid, false otherwise
 */
export const isValidData = <T>(schema: z.ZodSchema<T>, data: unknown): boolean => {
  const result = validateWithSchema(schema, data, 'validation-helpers.isValidData');
  return result.success;
};

/**
 * Checks if partial data is valid against a Zod schema.
 * Uses validatePartialWithSchema internally but returns boolean for testing convenience.
 *
 * @param schema - The Zod schema to validate against (must support .partial())
 * @param data - The partial data to validate
 * @returns true if partial data is valid, false otherwise
 */
export const isValidPartialData = <T>(schema: z.ZodSchema<T>, data: unknown): boolean => {
  const result = validatePartialWithSchema(schema, data, 'validation-helpers.isValidPartialData');
  return result.success;
};

/**
 * Checks if an array of items is valid against a Zod schema.
 * Uses validateArrayWithSchema internally but returns boolean for testing convenience.
 *
 * @param schema - The Zod schema to validate each item against
 * @param items - Array of items to validate
 * @returns true if all items are valid, false otherwise
 */
export const isValidArray = <T>(schema: z.ZodSchema<T>, items: unknown[]): boolean => {
  const result = validateArrayWithSchema(schema, items, 'validation-helpers.isValidArray');
  return result.success;
};

/**
 * Checks if data is valid under a conditional requirement.
 * Uses validateConditionally internally but returns boolean for testing convenience.
 *
 * @param condition - Condition to check before validation
 * @param schema - Schema to validate against if condition is true
 * @param data - Data to validate
 * @returns true if condition is met and data is valid, false otherwise
 */
export const isValidConditional = <T>(
  condition: boolean,
  schema: z.ZodSchema<T>,
  data: unknown,
): boolean => {
  const result = validateConditionally(
    condition,
    schema,
    data,
    'validation-helpers.isValidConditional',
  );
  return result.success;
};

/**
 * Checks if data passes validation with a custom refinement.
 * Uses validateWithRefinement internally but returns boolean for testing convenience.
 *
 * @param schema - Base schema to validate against
 * @param data - Data to validate
 * @param refinement - Custom refinement function that returns boolean
 * @param refinementError - Error message if refinement fails
 * @returns true if data validates and passes refinement, false otherwise
 */
export const isValidWithRefinement = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  refinement: (data: T) => boolean,
  refinementError: string,
): boolean => {
  const result = validateWithRefinement(
    schema,
    data,
    refinement,
    refinementError,
    'validation-helpers.isValidWithRefinement',
  );
  return result.success;
};

/**
 * Checks if required fields are present and not empty.
 * Uses validateRequiredFields internally but returns boolean for testing convenience.
 *
 * @param data - Object to check
 * @param requiredFields - Array of required field names
 * @returns true if all required fields are present, false otherwise
 */
export const hasRequiredFields = <T extends Record<string, unknown>>(
  data: T,
  requiredFields: Array<keyof T>,
): boolean => {
  const result = validateRequiredFields(
    data,
    requiredFields,
    'validation-helpers.hasRequiredFields',
  );
  return result.success;
};

/**
 * Checks if at least one field is present.
 * Uses validateAtLeastOneField internally but returns boolean for testing convenience.
 *
 * @param data - Object to check
 * @param fields - Array of field names to check
 * @returns true if at least one field is present, false otherwise
 */
export const hasAtLeastOneField = <T extends Record<string, unknown>>(
  data: T,
  fields: Array<keyof T>,
): boolean => {
  const result = validateAtLeastOneField(data, fields, 'validation-helpers.hasAtLeastOneField');
  return result.success;
};

/**
 * Checks if data is valid using a created validator function.
 * Uses createValidator internally but returns boolean for testing convenience.
 *
 * @param validator - Validator function created with createValidator
 * @param data - Data to validate
 * @returns true if data is valid, false otherwise
 */
export const isValidWithValidator = <T>(
  validator: (data: unknown, context: string) => Result<T, AppError>,
  data: unknown,
): boolean => {
  const result = validator(data, 'validation-helpers.isValidWithValidator');
  return result.success;
};
