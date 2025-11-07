/*---------------------------------------
File: src/services/global-error-handler-service.ts
Description: Global error handler for unhandled errors and promise rejections
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

import { ErrorUtils } from 'react-native';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ErrorMapper } from '@/utils/error-mapper';
import { AppErrorHandler } from '@/services/error-handler-service';
import { LoggingService } from '@/services/logging-service';
import { ErrorContextCapture } from '@/utils/error-context-capture';

export class GlobalErrorHandler {
  private static isInitialized = false;

  /**
   * Initialize global error handlers
   * Call this once at app startup
   */
  static initialize(): void {
    if (this.isInitialized) {
      LoggingService.warn('GlobalErrorHandler already initialized', {
        component: 'GlobalErrorHandler',
        method: 'initialize',
      });
      return;
    }

    // Handle JavaScript errors - only if ErrorUtils is available
    if (
      ErrorUtils &&
      typeof ErrorUtils.getGlobalHandler === 'function' &&
      typeof ErrorUtils.setGlobalHandler === 'function'
    ) {
      const originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        this.handleGlobalError(error, isFatal);
        // Call original handler as fallback
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    } else {
      LoggingService.warn('ErrorUtils not available, skipping global error handler setup', {
        component: 'GlobalErrorHandler',
        method: 'initialize',
      });
    }

    // Handle unhandled promise rejections
    if (typeof global !== 'undefined' && global.Promise) {
      const originalUnhandledRejection = global.onunhandledrejection;
      global.onunhandledrejection = (event: PromiseRejectionEvent) => {
        this.handleUnhandledRejection(event.reason);
        if (originalUnhandledRejection && typeof originalUnhandledRejection === 'function') {
          (originalUnhandledRejection as (event: PromiseRejectionEvent) => void)(event);
        }
      };
    }

    this.isInitialized = true;
    LoggingService.log('GlobalErrorHandler initialized', {
      component: 'GlobalErrorHandler',
      method: 'initialize',
    });
  }

  /**
   * Handle unhandled promise rejections
   * Sequence 3 flow from error-flow-mermaid.md:
   * 1. handleUnhandledRejection
   * 2. mapToAppError
   * 3. handle (which logs and shows toast)
   */
  static handleUnhandledRejection(reason: unknown): void {
    // Convert to Error for context capture
    const error = reason instanceof Error ? reason : new Error(String(reason));

    // Map to AppError first
    const appError = this.mapToAppError(reason, 'GlobalErrorHandler.handleUnhandledRejection');

    // Capture error context
    const errorContext = ErrorContextCapture.capture(error);

    // Build context with captured error information
    const context = {
      component: 'GlobalErrorHandler',
      method: 'handleUnhandledRejection',
      metadata: {
        type: 'unhandledRejection',
        timestamp: errorContext.timestamp,
        platform: errorContext.platform,
        appVersion: errorContext.appVersion,
        userActions: errorContext.userActions,
        route: errorContext.route,
      },
    };

    // Handle via AppErrorHandler (will log and show toast)
    AppErrorHandler.handle(appError, context);
  }

  /**
   * Handle global JavaScript errors
   * Sequence 3 flow from error-flow-mermaid.md:
   * 1. handleNativeCrash
   * 2. mapToAppError
   * 3. handle (which logs and shows toast)
   */
  static handleNativeCrash(error: Error, isFatal?: boolean): void {
    // Map to AppError first
    const appError = this.mapToAppError(error, 'GlobalErrorHandler.handleNativeCrash');

    // Capture error context
    const errorContext = ErrorContextCapture.capture(error);

    // Build context with captured error information
    const context = {
      component: 'GlobalErrorHandler',
      method: 'handleNativeCrash',
      metadata: {
        isFatal,
        timestamp: errorContext.timestamp,
        platform: errorContext.platform,
        appVersion: errorContext.appVersion,
        userActions: errorContext.userActions,
        route: errorContext.route,
      },
    };

    // Handle via AppErrorHandler (will log and show toast)
    AppErrorHandler.handle(appError, context);
  }

  /**
   * Handle global errors (called by ErrorUtils.setGlobalHandler)
   */
  private static handleGlobalError(error: Error, isFatal?: boolean): void {
    this.handleNativeCrash(error, isFatal);
  }

  /**
   * Type guard to check if an error is an AppError
   */
  private static isAppError(error: unknown): error is AppError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      'message' in error &&
      'userMessage' in error &&
      'retryable' in error &&
      'timestamp' in error &&
      typeof (error as AppError).code === 'string' &&
      typeof (error as AppError).message === 'string' &&
      typeof (error as AppError).userMessage === 'string' &&
      typeof (error as AppError).retryable === 'boolean' &&
      (error as AppError).timestamp instanceof Date
    );
  }

  /**
   * Map unknown errors to AppError
   */
  private static mapToAppError(error: unknown, context: string): AppError {
    if (error instanceof Error) {
      // Check if it's already an AppError using type guard
      if (this.isAppError(error)) {
        return error;
      }

      // Map common error types
      if (error.message.includes('Network')) {
        return ErrorMapper.createGenericError(
          ErrorCode.NETWORK_CONNECTION_ERROR,
          error.message,
          'Network connection failed. Please check your internet connection.',
          context,
          error,
          true,
        );
      }

      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        return ErrorMapper.createGenericError(
          ErrorCode.NETWORK_TIMEOUT,
          error.message,
          'The request took too long. Please try again.',
          context,
          error,
          true,
        );
      }
    }

    // Default to unknown error
    return ErrorMapper.createGenericError(
      ErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred',
      'An unexpected error occurred. Please try again.',
      context,
      error,
      false,
    );
  }
}
