/*---------------------------------------
File: src/utils/error-mapper.ts
Description: Error mapper utility for the Eye-Doo application.
Maps errors to AppError instances for consistent error handling.
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

import {
  AppError,
  AggregatedError,
  AuthError,
  FirestoreError,
  NetworkError,
  ValidationError,
} from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ZodError } from 'zod';

export class ErrorMapper {
  static mapToUserMessage(error: AppError): string {
    return error.userMessage;
  }

  static mapToTechnicalMessage(error: AppError): string {
    return error.message;
  }

  static mapToContext(error: AppError): string | undefined {
    return error.context;
  }

  static mapToRetryable(error: AppError): boolean {
    return error.retryable;
  }

  static mapToTimestamp(error: AppError): Date {
    return error.timestamp;
  }

  /**
   * Creates a generic AppError with the specified properties
   * Useful for error recovery utilities that need to create errors dynamically
   */
  static createGenericError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context?: string,
    originalError?: unknown,
    retryable = false,
  ): AppError {
    // Use NetworkError for network-related codes
    if (
      code === ErrorCode.NETWORK_TIMEOUT ||
      code === ErrorCode.NETWORK_CONNECTION_ERROR ||
      code === ErrorCode.NETWORK_SERVER_ERROR ||
      code === ErrorCode.CIRCUIT_BREAKER_OPEN
    ) {
      return new NetworkError(code, message, userMessage, context, originalError, retryable);
    }

    // Use FirestoreError for database-related codes
    if (
      code === ErrorCode.DB_NOT_FOUND ||
      code === ErrorCode.DB_PERMISSION_DENIED ||
      code === ErrorCode.DB_NETWORK_ERROR
    ) {
      return new FirestoreError(code, message, userMessage, context, originalError, retryable);
    }

    // Use AuthError for auth-related codes
    if (
      code === ErrorCode.AUTH_INVALID_CREDENTIALS ||
      code === ErrorCode.AUTH_USER_NOT_FOUND ||
      code === ErrorCode.AUTH_EMAIL_IN_USE ||
      code === ErrorCode.AUTH_WEAK_PASSWORD ||
      code === ErrorCode.AUTH_EMAIL_NOT_VERIFIED ||
      code === ErrorCode.AUTH_SESSION_EXPIRED
    ) {
      return new AuthError(code, message, userMessage, context, originalError, retryable);
    }

    // Default to FirestoreError for unknown cases (or create a GenericError class)
    return new FirestoreError(code, message, userMessage, context, originalError, retryable);
  }

  static fromFirebaseAuth(error: AppError, context: string): AuthError {
    const message = error.message;
    const userMessage = 'An authentication error occurred. Please try again.';
    const code = error.code;
    const retryable = error.retryable;
    return new AuthError(code, message, userMessage, context, error, retryable);
  }

  static fromFirestore(error: unknown, context: string): FirestoreError {
    let message = 'An unknown Firestore error occurred';
    let userMessage = 'A database error occurred. Please try again.';
    let code = ErrorCode.DB_NETWORK_ERROR;
    let retryable = true;

    if (error instanceof Error) {
      message = error.message;

      // Map common Firebase errors
      if (message.includes('permission-denied')) {
        code = ErrorCode.DB_PERMISSION_DENIED;
        userMessage = 'You do not have permission to perform this action.';
        retryable = false;
      } else if (message.includes('not-found')) {
        code = ErrorCode.DB_NOT_FOUND;
        userMessage = 'The requested data was not found.';
        retryable = false;
      } else if (message.includes('unavailable')) {
        code = ErrorCode.DB_NETWORK_ERROR;
        userMessage = 'Service temporarily unavailable. Please try again.';
        retryable = true;
      }
    }

    return new FirestoreError(
      code,
      `Firestore Error: ${message}`,
      userMessage,
      context,
      error,
      retryable,
    );
  }
  static fromZod(error: ZodError, context: string): ValidationError {
    const fieldErrors: Record<string, string> = {};

    error.errors.forEach(err => {
      const field = err.path.join('.');
      fieldErrors[field] = err.message;
    });

    return new ValidationError(`Validation failed: ${error.message}`, fieldErrors, context, error);
  }

  static userNotFound(context: string): AuthError {
    return new AuthError(
      ErrorCode.AUTH_USER_NOT_FOUND,
      'User not found',
      'User not found',
      context,
    );
  }
  static projectNotFound(context: string): FirestoreError {
    return new FirestoreError(
      ErrorCode.DB_NOT_FOUND,
      'Project document not found',
      'Project not found',
      context,
    );
  }

  static listNotFound(context: string): FirestoreError {
    return new FirestoreError(
      ErrorCode.DB_NOT_FOUND,
      'List document not found',
      'List not found',
      context,
    );
  }

  static fromNetwork(
    error: unknown | { code?: string; message?: string },
    context: string,
  ): NetworkError {
    let message = 'A network error occurred';
    let userMessage = 'A network error occurred. Please check your connection and try again.';
    let code = ErrorCode.NETWORK_CONNECTION_ERROR;
    let retryable = true;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as { code?: string; message?: string };
      message = errObj.message || message;
      if (errObj.code === 'API_KEY_MISSING' || errObj.code === 'NO_RESULTS') {
        code = ErrorCode.NETWORK_SERVER_ERROR;
        userMessage = errObj.message || userMessage;
        retryable = false;
      } else if (errObj.code === 'API_ERROR' || errObj.code === 'INVALID_GEOMETRY') {
        code = ErrorCode.NETWORK_SERVER_ERROR;
        retryable = false;
      }
    }

    return new NetworkError(code, message, userMessage, context, error, retryable);
  }

  static fromValidation(
    error: { code?: string; message?: string },
    context: string,
  ): ValidationError {
    const message = error.message || 'Validation failed';
    const fieldErrors: Record<string, string> = {
      general: message,
    };

    return new ValidationError(message, fieldErrors, context);
  }

  static fromUnknown(error: unknown, context: string): NetworkError {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    const userMessage = 'An unexpected error occurred. Please try again.';

    return new NetworkError(
      ErrorCode.NETWORK_CONNECTION_ERROR,
      message,
      userMessage,
      context,
      error,
      true,
    );
  }

  /**
   * Creates an aggregated error for batch operations with multiple failures
   * Used when some operations succeed and others fail (e.g., initializing multiple subcollections)
   *
   * @param code - The error code for the aggregated error
   * @param message - Technical error message for logging
   * @param userMessage - User-friendly message for UI display
   * @param context - Context information about the batch operation
   * @param failures - Array of failed operations with their errors
   * @param successCount - Number of operations that succeeded (default: 0)
   * @returns An AggregatedError instance
   *
   * @example
   * ```typescript
   * const failures = results.filter(r => !r.success).map((r, i) => ({
   *   operation: ['kit', 'task', 'timeline'][i],
   *   error: r.error,
   * }));
   *
   * const aggregatedError = ErrorMapper.createAggregatedError(
   *   ErrorCode.DB_WRITE_ERROR,
   *   'Failed to initialize some subcollections',
   *   'Project created but some features may not be available.',
   *   context,
   *   failures,
   *   results.length - failures.length
   * );
   * ```
   */
  static createAggregatedError(
    code: ErrorCode,
    message: string,
    userMessage: string,
    context: string,
    failures: Array<{ operation: string; error: AppError }>,
    successCount = 0,
  ): AggregatedError {
    return {
      code,
      message,
      userMessage,
      context,
      retryable: failures.some(f => f.error.retryable),
      timestamp: new Date(),
      type: 'aggregated',
      errors: failures,
      successCount,
      failureCount: failures.length,
    };
  }
}
