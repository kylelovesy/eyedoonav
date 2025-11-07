/*---------------------------------------
File: src/services/error-handler-service.ts
Description: A centralized service for handling application errors
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

// Domain/types
import { AggregatedError, AppError, LogContext } from '@/domain/common/errors';

// Utils
import { ErrorContextBuilder } from '@/utils/error-context-builder';

// Services
import { LoggingService } from '@/services/logging-service';

// Stores
import { useUIStore } from '@/stores/use-ui-store';

/**
 * @class AppErrorHandler
 * @description A static class responsible for handling side-effects of errors,
 * such as logging and displaying user-facing notifications.
 */
export class AppErrorHandler {
  private static toastHistory = new Map<string, number>();
  private static cleanupTimer: NodeJS.Timeout | null = null;
  private static readonly TOAST_DEDUP_WINDOW = 5000; // 5 seconds
  private static readonly MAX_TOAST_HISTORY = 100;
  private static readonly TOAST_HISTORY_TTL = 60000; // 1 minute

  /**
   * The single entry point for handling caught application errors.
   * @param error - The AppError object caught in a store action.
   * @param context - Additional context for logging (can be string or LogContext object).
   * @param retryAction - Optional retry function for retryable errors.
   */
  static handle(error: AppError, context?: string | LogContext, retryAction?: () => void): void {
    // Initialize cleanup timer on first use
    if (!this.cleanupTimer) {
      this.startCleanupTimer();
    }

    // Check if aggregated error
    if (this.isAggregatedError(error)) {
      this.handleAggregatedError(error, context, retryAction);
      return;
    }

    // Build context using ErrorContextBuilder (according to error-flow-mermaid.md Sequence 1)
    const contextData: LogContext =
      typeof context === 'string'
        ? ErrorContextBuilder.fromString(context)
        : context || ErrorContextBuilder.fromService('AppErrorHandler', 'handle');

    // 1. Log the structured error for debugging and monitoring
    LoggingService.error(error, {
      component: contextData.component || 'AppErrorHandler',
      method: contextData.method || 'handle',
      userId: contextData.userId,
      metadata: {
        errorCode: error.code,
        retryable: error.retryable,
        context: error.context,
        ...contextData.metadata,
      },
    });

    // 2. Create toast key for deduplication
    const toastKey = `${error.code}-${error.userMessage}`;
    const now = Date.now();
    const lastShown = this.toastHistory.get(toastKey);

    // Skip if shown recently (deduplication)
    if (lastShown && now - lastShown < this.TOAST_DEDUP_WINDOW) {
      return;
    }

    this.toastHistory.set(toastKey, now);

    // 3. Display a user-friendly toast message with retry support
    const toastConfig = {
      title: 'Error',
      message: error.userMessage,
      type: 'error' as const,
      action:
        error.retryable && retryAction
          ? {
              label: 'Retry',
              onPress: retryAction,
            }
          : undefined,
    };

    useUIStore.getState().showToast(toastConfig);
  }

  /**
   * Type guard to check if an error is an AggregatedError
   * @param error - The error to check
   * @returns True if the error is an AggregatedError
   */
  private static isAggregatedError(error: AppError): error is AggregatedError {
    return 'type' in error && error.type === 'aggregated';
  }

  /**
   * Handles aggregated errors with multiple operation failures
   * Shows a toast with expandable details for each failed operation
   *
   * @param error - The aggregated error to handle
   * @param context - Additional context for logging
   * @param retryAction - Optional retry function for retryable errors
   */
  private static handleAggregatedError(
    error: AggregatedError,
    context?: string | LogContext,
    retryAction?: () => void,
  ): void {
    // Build context for logging
    const contextData: LogContext =
      typeof context === 'string'
        ? ErrorContextBuilder.fromString(context)
        : context || ErrorContextBuilder.fromService('AppErrorHandler', 'handleAggregatedError');

    // 1. Log the aggregated error
    LoggingService.error(error, {
      component: contextData.component || 'AppErrorHandler',
      method: contextData.method || 'handleAggregatedError',
      userId: contextData.userId,
      metadata: {
        errorCode: error.code,
        retryable: error.retryable,
        context: error.context,
        failureCount: error.failureCount,
        successCount: error.successCount,
        operations: error.errors.map(e => e.operation),
        ...contextData.metadata,
      },
    });

    // 2. Create toast key for deduplication
    const toastKey = `${error.code}-aggregated-${error.failureCount}`;
    const now = Date.now();
    const lastShown = this.toastHistory.get(toastKey);

    // Skip if shown recently (deduplication)
    if (lastShown && now - lastShown < this.TOAST_DEDUP_WINDOW) {
      return;
    }

    this.toastHistory.set(toastKey, now);

    // 3. Display toast with expandable details
    const toastConfig = {
      title: error.successCount > 0 ? 'Partial Success' : 'Error',
      message: error.userMessage || 'One or more operations failed.',
      type: (error.successCount > 0 ? 'warning' : 'error') as 'warning' | 'error',
      details: error.errors.map(
        e =>
          `${e.operation || 'Unknown Operation'}: ${e.error?.userMessage || e.error?.message || 'An error occurred.'}`,
      ),
      action:
        error.retryable && typeof retryAction === 'function'
          ? {
              label: 'Retry Failed',
              onPress: retryAction,
            }
          : undefined,
    };

    useUIStore.getState().showToast(toastConfig);
  }

  /**
   * Clear toast history (useful for testing or memory management)
   */
  static clearToastHistory(): void {
    this.toastHistory.clear();
  }

  /**
   * Cleans up stale entries from toast history and enforces max size
   */
  private static cleanupToastHistory(): void {
    const now = Date.now();
    const staleEntries: string[] = [];

    // Find stale entries (older than TTL)
    this.toastHistory.forEach((timestamp, key) => {
      if (now - timestamp > this.TOAST_HISTORY_TTL) {
        staleEntries.push(key);
      }
    });

    // Remove stale entries
    staleEntries.forEach(key => this.toastHistory.delete(key));

    // Enforce max size by removing oldest entries
    if (this.toastHistory.size > this.MAX_TOAST_HISTORY) {
      const entries = Array.from(this.toastHistory.entries()).sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, entries.length - this.MAX_TOAST_HISTORY);
      toRemove.forEach(([key]) => this.toastHistory.delete(key));
    }
  }

  /**
   * Starts the periodic cleanup timer for toast history
   */
  private static startCleanupTimer(): void {
    if (this.cleanupTimer) {
      return; // Already started
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupToastHistory();
    }, this.TOAST_HISTORY_TTL);
  }

  /**
   * Stops the cleanup timer (useful for testing)
   */
  static stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
