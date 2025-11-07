/*---------------------------------------
File: src/domain/common/errors.ts
Description: Comprehensive error handling system for the Eye-Doo application.
Provides structured error types, error codes, and domain-specific error classes
for consistent error handling across all application layers.

Key Features:
- Structured error codes with categorization (LIST_001, AUTH_001, etc.)
- Domain-specific error classes (AuthError, PaymentError, etc.)
- User-friendly error messages alongside technical details
- Type-safe error handling with AppError base interface
- Retry logic support and error context tracking

Author: Kyle Lovesy
Date: 27/10-2025 - 09.45
Version: 1.1.0
---------------------------------------*/

import { ErrorCode } from '@/constants/error-code-registry';

// =================================================================================
// MARK: - Logging Context
// =================================================================================

/**
 * Context information for error logging and debugging
 * Used throughout the application to track where errors occur
 */
export interface LogContext {
  /** Component, service, or module name where the error occurred */
  component?: string;

  /** Method, function, or action name where the error occurred */
  method?: string;

  /** User ID associated with the error (if applicable) */
  userId?: string;

  /** Project ID associated with the error (if applicable) */
  projectId?: string;

  /** Duration of the operation in milliseconds (for performance tracking) */
  duration?: number;

  /** Additional metadata for debugging */
  metadata?: Record<string, unknown>;

  /** String context for backward compatibility */
  context?: string;
}

// =================================================================================
// MARK: - Base Error Interface
// =================================================================================

/**
 * Base interface for all application-specific errors
 * Provides consistent error structure across the entire application
 */
export interface AppError {
  /** Unique error code for identification and internationalization */
  readonly code: ErrorCode;

  /** Developer-facing technical message for logging and debugging */
  readonly message: string;

  /** User-friendly message safe for display in UI toasts and alerts */
  readonly userMessage: string;

  /** Optional context information about where/when the error occurred */
  readonly context?: string;

  /** Whether this error can be retried (affects UI retry options) */
  readonly retryable: boolean;

  /** Original error object for stack traces and debugging */
  readonly originalError?: unknown;

  /** Timestamp when the error was created */
  readonly timestamp: Date;
}

// =================================================================================
// MARK: - Aggregated Errors
// =================================================================================

/**
 * Interface for aggregated errors that contain multiple operation failures
 * Used when a batch operation has partial failures (e.g., initializing multiple subcollections)
 */
export interface AggregatedError extends AppError {
  /** Type discriminator to identify aggregated errors */
  readonly type: 'aggregated';

  /** Array of failed operations with their associated errors */
  readonly errors: Array<{
    /** Name/identifier of the operation that failed */
    operation: string;
    /** The error that occurred for this operation */
    error: AppError;
  }>;

  /** Number of operations that succeeded */
  readonly successCount: number;

  /** Number of operations that failed */
  readonly failureCount: number;
}

// =================================================================================
// MARK: - Domain-Specific Error Classes
// =================================================================================

// ============================================================================
// AUTHENTICATION ERRORS
// ============================================================================

/**
 * Error class for authentication and user account related failures
 * Used for login, registration, and account management operations
 */
export class AuthError implements AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly context?: string;
  readonly retryable: boolean;
  readonly timestamp = new Date();
  readonly originalError?: unknown;

  /**
   * Creates an authentication error
   *
   * @param code - The specific error code from ErrorCode enum
   * @param message - Technical error message for logging
   * @param userMessage - User-friendly message for UI display
   * @param context - Optional context about where the error occurred
   * @param originalError - Optional original error object
   * @param retryable - Whether the operation can be retried (default: false)
   */
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context?: string,
    originalError?: unknown,
    retryable = false,
  ) {
    this.code = code;
    this.message = message;
    this.userMessage = userMessage;
    this.context = context;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

// ============================================================================
// SUBSCRIPTION & BILLING ERRORS
// ============================================================================

/**
 * Error class for subscription and billing related failures
 * Used for payment processing, subscription management, and billing operations
 */
export class SubscriptionError implements AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly context?: string;
  readonly retryable: boolean;
  readonly timestamp = new Date();
  readonly originalError?: unknown;

  /**
   * Creates a subscription error
   *
   * @param code - The specific error code from ErrorCode enum
   * @param message - Technical error message for logging
   * @param userMessage - User-friendly message for UI display
   * @param context - Optional context about the subscription operation
   * @param originalError - Optional original error object
   * @param retryable - Whether the operation can be retried (default: false)
   */
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context?: string,
    originalError?: unknown,
    retryable = false,
  ) {
    this.code = code;
    this.message = message;
    this.userMessage = userMessage;
    this.context = context;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

// ============================================================================
// DATABASE ERRORS
// ============================================================================

/**
 * Error class for Firestore database operation failures
 * Used for document CRUD operations, queries, and database connectivity issues
 */
export class FirestoreError implements AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly context?: string;
  readonly retryable: boolean;
  readonly timestamp = new Date();
  readonly originalError?: unknown;

  /**
   * Creates a Firestore database error
   *
   * @param code - The specific error code from ErrorCode enum
   * @param message - Technical error message for logging
   * @param userMessage - User-friendly message for UI display
   * @param context - Optional context about the database operation
   * @param originalError - Optional original Firebase error object
   * @param retryable - Whether the operation can be retried (default: false)
   */
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context?: string,
    originalError?: unknown,
    retryable = false,
  ) {
    this.code = code;
    this.message = message;
    this.userMessage = userMessage;
    this.context = context;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

// ============================================================================
// FILE STORAGE ERRORS
// ============================================================================

/**
 * Error class for Firebase Storage operation failures
 * Used for file uploads, downloads, and storage management operations
 */
export class FirebaseStorageError implements AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly context?: string;
  readonly retryable: boolean;
  readonly timestamp = new Date();
  readonly originalError?: unknown;

  /**
   * Creates a Firebase Storage error
   *
   * @param code - The specific error code from ErrorCode enum
   * @param message - Technical error message for logging
   * @param userMessage - User-friendly message for UI display
   * @param context - Optional context about the storage operation
   * @param originalError - Optional original Firebase Storage error object
   * @param retryable - Whether the operation can be retried (default: false)
   */
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context?: string,
    originalError?: unknown,
    retryable = false,
  ) {
    this.code = code;
    this.message = message;
    this.userMessage = userMessage;
    this.context = context;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

// ============================================================================
// NETWORK ERRORS
// ============================================================================

/**
 * Error class for network and API communication failures
 * Used for HTTP requests, API calls, and network connectivity issues
 */
export class NetworkError implements AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly context?: string;
  readonly retryable: boolean;
  readonly timestamp = new Date();
  readonly originalError?: unknown;

  /**
   * Creates a network error
   *
   * @param code - The specific error code from ErrorCode enum
   * @param message - Technical error message for logging
   * @param userMessage - User-friendly message for UI display
   * @param context - Optional context about the network operation
   * @param originalError - Optional original network error object
   * @param retryable - Whether the operation can be retried (default: false)
   */
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context?: string,
    originalError?: unknown,
    retryable = false,
  ) {
    this.code = code;
    this.message = message;
    this.userMessage = userMessage;
    this.context = context;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}

// ============================================================================
// PAYMENT ERRORS
// ============================================================================

/**
 * Error class for payment processing failures
 * Used for credit card processing, billing operations, and payment gateway errors
 * Includes field-specific error details for form validation feedback
 */
export class PaymentError implements AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly context?: string;
  readonly retryable = false;
  readonly timestamp = new Date();
  readonly fieldErrors: Record<string, string>;
  readonly originalError?: unknown;

  /**
   * Creates a payment processing error
   *
   * @param code - The specific error code from ErrorCode enum
   * @param message - Technical error message for logging
   * @param fieldErrors - Field-specific error messages for form validation
   * @param context - Optional context about the payment operation
   * @param originalError - Optional original payment gateway error object
   */
  constructor(
    code: ErrorCode,
    message: string,
    fieldErrors: Record<string, string>,
    context?: string,
    originalError?: unknown,
  ) {
    this.code = code;
    this.message = message;
    this.userMessage = 'Please check the form for errors.';
    this.fieldErrors = fieldErrors;
    this.context = context;
    this.originalError = originalError;
  }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Error class for input validation failures
 * Used for form validation errors, typically from Zod schema validation
 * Provides field-specific error messages for user feedback
 */
export class ValidationError implements AppError {
  readonly code = ErrorCode.VALIDATION_FAILED;
  readonly message: string;
  readonly userMessage: string;
  readonly context?: string;
  readonly retryable = false;
  readonly timestamp = new Date();
  readonly fieldErrors: Record<string, string>;
  readonly originalError?: unknown;

  /**
   * Creates a validation error
   *
   * @param message - Technical error message for logging
   * @param fieldErrors - Field-specific validation error messages
   * @param context - Optional context about what was being validated
   * @param originalError - Optional original validation error object (e.g., ZodError)
   */
  constructor(
    message: string,
    fieldErrors: Record<string, string>,
    context?: string,
    originalError?: unknown,
  ) {
    this.message = message;
    this.userMessage = 'Please check the form for errors.';
    this.fieldErrors = fieldErrors;
    this.context = context;
    this.originalError = originalError;
  }
}

// ============================================================================
// LOCATION ERRORS
// ============================================================================

/**
 * Error class for location and geocoding service failures
 * Used for GPS, maps API, and location-based operations
 */
export class LocationError implements AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly userMessage: string;
  readonly context?: string;
  readonly retryable: boolean;
  readonly timestamp = new Date();
  readonly originalError?: unknown;

  /**
   * Creates a location service error
   *
   * @param code - The specific error code from ErrorCode enum
   * @param message - Technical error message for logging
   * @param userMessage - User-friendly message for UI display
   * @param context - Optional context about the location operation
   * @param originalError - Optional original location API error object
   * @param retryable - Whether the operation can be retried (default: false)
   */
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context?: string,
    originalError?: unknown,
    retryable = false,
  ) {
    this.code = code;
    this.message = message;
    this.userMessage = userMessage;
    this.context = context;
    this.originalError = originalError;
    this.retryable = retryable;
  }
}
