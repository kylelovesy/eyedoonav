/*---------------------------------------
File: src/services/logging-service.ts
Description: A centralized service for logging application events, warnings, and errors.
Author: Kyle Lovesy
Date: 28/10-2025 - 11.00
Version: 1.1.0
---------------------------------------*/

// Domain/types
import { AppError, LogContext } from '@/domain/common/errors';

export class LoggingService {
  // Prevent re-entrant error logging that can cause infinite loops when console.error is hooked
  // Track specific errors by key to allow different errors while preventing duplicate reporting
  private static reportingErrors = new Set<string>();
  private static readonly ERROR_CLEANUP_DELAY = 1000; // 1 second

  /**
   * Logs a standard informational message - Only logs in development to avoid cluttering production console.
   * @param message - The message to log
   * @param context - Optional context information
   */
  static log(message: string, context?: string | LogContext): void {
    const contextData = typeof context === 'string' ? { context } : context || {};

    if (__DEV__) {
      console.log(`[INFO]${contextData.component ? ` [${contextData.component}]` : ''}:`, message);
    }

    // Sentry.addBreadcrumb({
    //   category: 'log',
    //   message,
    //   level: 'info',
    //   data: contextData,
    // });
  }

  /**
   * Logs a warning message - Only logs in development.
   * @param message - The warning message to log
   * @param context - Optional context information
   */
  static warn(message: string, context?: string | LogContext): void {
    const contextData = typeof context === 'string' ? { context } : context || {};

    if (__DEV__) {
      console.warn(`[WARN]${contextData.component ? ` [${contextData.component}]` : ''}:`, message);
    }

    // Sentry.addBreadcrumb({
    //   category: 'warn',
    //   message,
    //   level: 'warning',
    //   data: contextData,
    // });
  }

  /**
   * Logs an error. This is the most critical logging method - In production, this method should send the error to a remote service.
   * Prevents re-entrant logging of the same error using error-specific keys.
   *
   * @param error - The error to log (AppError or any Error)
   * @param context - Optional context information for logging
   */
  static error(error: unknown, context?: string | LogContext): void {
    const contextData = typeof context === 'string' ? { context } : context || {};
    const contextLabel = contextData.component || contextData.context || 'No context provided';
    const isFromGlobalHandler =
      contextLabel.includes('GlobalExceptionHandler') ||
      contextLabel.includes('NativeExceptionHandler');

    // Generate error key for deduplication (code + message for AppError, type + message for others)
    const errorKey = this.getErrorKey(error);

    // Skip if already reporting this specific error
    if (this.reportingErrors.has(errorKey)) {
      return;
    }

    // Mark this error as being reported
    this.reportingErrors.add(errorKey);

    try {
      // Avoid console.error because some global handlers hook it and re-trigger error flows
      if (__DEV__ && !isFromGlobalHandler) {
        const errorMessage = this.getErrorMessage(error);
        console.warn(
          `[ERROR]${contextData.component ? ` [${contextData.component}]` : ''}:`,
          errorMessage,
          contextData,
        );
      }

      // Add user context if available
      // const user = useAuthStore.getState().user;
      // if (user) {
      //   Sentry.setUser({ id: user.id, email: user.email });
      // }

      // // Add environment tags
      // Sentry.setTag('platform', Constants.platform?.ios ? 'ios' : 'android');
      // Sentry.setTag('appVersion', Constants.expoConfig?.version || 'unknown');
      // Sentry.setTag(
      //   'buildNumber',
      //   Constants.expoConfig?.ios?.buildNumber ||
      //     Constants.expoConfig?.android?.versionCode ||
      //     'unknown',
      // );

      // Sentry.captureException(error, {
      //   extra: contextData as Extras,
      //   tags: {
      //     errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      //   },
      // });
    } finally {
      // Cleanup after delay to allow async operations to complete
      setTimeout(() => {
        this.reportingErrors.delete(errorKey);
      }, this.ERROR_CLEANUP_DELAY);
    }
  }

  /**
   * Generates a unique key for an error to prevent duplicate reporting
   * @param error - The error object
   * @returns A unique string key for the error
   */
  private static getErrorKey(error: unknown): string {
    if (this.isAppError(error)) {
      return `${error.code}-${error.message}`;
    }

    if (error instanceof Error) {
      return `${error.constructor.name}-${error.message}`;
    }

    return `unknown-${String(error)}`;
  }

  /**
   * Extracts a user-friendly error message from an error object
   * @param error - The error object
   * @returns A string error message
   */
  private static getErrorMessage(error: unknown): string {
    if (this.isAppError(error)) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  /**
   * Type guard to check if an error is an AppError
   * @param error - The error to check
   * @returns True if the error is an AppError
   */
  private static isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'userMessage' in error &&
      'retryable' in error
    );
  }

  /**
   * Structured logging method for tracking service call performance
   * @param service - The service name
   * @param method - The method name
   * @param duration - Duration in milliseconds
   * @param success - Whether the call was successful
   */
  static logServiceCall(service: string, method: string, duration: number, success: boolean): void {
    const context: LogContext = {
      component: service,
      method,
      duration,
      metadata: { success },
    };

    this.log(`Service call: ${service}.${method}`, context);

    // if (success) {
    //   Sentry.addBreadcrumb({
    //     category: 'service',
    //     message: `Service call completed: ${service}.${method}`,
    //     level: 'info',
    //     data: { duration, success },
    //   });
    // } else {
    //   Sentry.addBreadcrumb({
    //     category: 'service',
    //     message: `Service call failed: ${service}.${method}`,
    //     level: 'error',
    //     data: { duration, success },
    //   });
    // }
  }

  /**
   * Logs user actions for analytics and debugging
   * @param action - The action name
   * @param metadata - Optional metadata about the action
   */
  static logUserAction(action: string, metadata?: Record<string, unknown>): void {
    const context: LogContext = {
      component: 'UserAction',
      method: action,
      metadata,
    };

    this.log(`User action: ${action}`, context);

    // Sentry.addBreadcrumb({
    //   category: 'user',
    //   message: `User action: ${action}`,
    //   level: 'info',
    //   data: metadata as Extras,
    // });
  }

  /**
   * Logs state changes in stores for debugging
   * @param store - The store name
   * @param change - Description of the state change
   */
  static logStateChange(store: string, change: string): void {
    const context: LogContext = {
      component: store,
      method: 'stateChange',
      metadata: { change },
    };

    this.log(`State change: ${store}`, context);

    // Sentry.addBreadcrumb({
    //   category: 'state',
    //   message: `State change: ${store}`,
    //   level: 'info',
    //   data: { change },
    // });
  }
}
