/*---------------------------------------
File: src/utils/error-classifier.ts
Description: Utility for classifying and categorizing errors
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';

export type ErrorSeverity = 'critical' | 'non-critical' | 'recoverable';

export interface ErrorCategory {
  severity: ErrorSeverity;
  canRecover: boolean;
  shouldShowFullScreen: boolean;
  requiresUserAction: boolean;
}

/**
 * Classifies errors based on their type and code to determine handling strategy
 */
export class ErrorClassifier {
  /**
   * Classify an error to determine its severity and handling requirements
   */
  static classify(error: Error | AppError): ErrorCategory {
    // Check if it's an AppError
    const isAppError = 'code' in error && 'userMessage' in error;

    if (isAppError) {
      return this.classifyAppError(error as AppError);
    }

    // For regular JavaScript errors, check message patterns
    return this.classifyGenericError(error);
  }

  /**
   * Classify AppError based on error code
   */
  private static classifyAppError(error: AppError): ErrorCategory {
    // Critical errors - require full screen fallback
    const criticalCodes: ErrorCode[] = [
      ErrorCode.AUTH_SESSION_EXPIRED,
      ErrorCode.SUBSCRIPTION_EXPIRED,
      ErrorCode.DB_PERMISSION_DENIED,
      ErrorCode.FIREBASE_STORAGE_PERMISSION_DENIED,
    ];

    // Non-critical errors - can show inline
    const nonCriticalCodes: ErrorCode[] = [
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.LIST_NOT_FOUND,
      ErrorCode.DB_NOT_FOUND,
      ErrorCode.IMAGE_NOT_FOUND,
      ErrorCode.QR_CODE_EMPTY,
    ];

    if (criticalCodes.includes(error.code)) {
      return {
        severity: 'critical',
        canRecover: false,
        shouldShowFullScreen: true,
        requiresUserAction: true,
      };
    }

    if (nonCriticalCodes.includes(error.code)) {
      return {
        severity: 'non-critical',
        canRecover: true,
        shouldShowFullScreen: false,
        requiresUserAction: false,
      };
    }

    // Recoverable errors - can retry
    if (error.retryable) {
      return {
        severity: 'recoverable',
        canRecover: true,
        shouldShowFullScreen: false,
        requiresUserAction: false,
      };
    }

    // Default to non-critical for unknown errors
    return {
      severity: 'non-critical',
      canRecover: false,
      shouldShowFullScreen: false,
      requiresUserAction: false,
    };
  }

  /**
   * Classify generic JavaScript errors
   */
  private static classifyGenericError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    // Critical patterns
    if (
      message.includes('out of memory') ||
      message.includes('maximum call stack') ||
      message.includes('cannot read property') ||
      message.includes('undefined is not')
    ) {
      return {
        severity: 'critical',
        canRecover: false,
        shouldShowFullScreen: true,
        requiresUserAction: true,
      };
    }

    // Network errors are usually recoverable
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return {
        severity: 'recoverable',
        canRecover: true,
        shouldShowFullScreen: false,
        requiresUserAction: false,
      };
    }

    // Default to non-critical
    return {
      severity: 'non-critical',
      canRecover: false,
      shouldShowFullScreen: false,
      requiresUserAction: false,
    };
  }

  /**
   * Determine if error should trigger full screen fallback
   */
  static shouldShowFullScreen(error: Error | AppError): boolean {
    return this.classify(error).shouldShowFullScreen;
  }

  /**
   * Determine if error can be recovered from
   */
  static canRecover(error: Error | AppError): boolean {
    return this.classify(error).canRecover;
  }
}
