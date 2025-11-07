/*---------------------------------------
File: src/utils/error-recovery.ts
Description: Error recovery utilities for handling transient failures
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ErrorMapper } from '@/utils/error-mapper';
import { LoggingService } from '@/services/logging-service';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  exponential?: boolean;
}

export interface FallbackOptions<T> {
  fallbackValue: T;
}

export interface TimeoutOptions {
  timeoutMs: number;
}

/**
 *
 * @param ms - The number of milliseconds to sleep for
 * @returns A promise that resolves after the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility that attempts an operation multiple times with configurable delays
 * @param operation - The operation to retry
 * @param options - The retry options
 * @returns A promise that resolves to the result of the operation
 */
export async function withRetry<T, E extends AppError>(
  operation: () => Promise<Result<T, E>>,
  options: RetryOptions,
): Promise<Result<T, E>> {
  const { maxAttempts, delayMs, exponential = false } = options;
  let lastError: E;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await operation();

    if (result.success) {
      if (attempt > 1) {
        LoggingService.log(`Operation succeeded on attempt ${attempt}`, {
          component: 'ErrorRecovery',
          method: 'withRetry',
          metadata: { attempts: attempt, maxAttempts },
        });
      }
      return result;
    }

    lastError = result.error;

    // Don't retry if error is not retryable
    if (!lastError.retryable) {
      LoggingService.log(`Operation failed with non-retryable error on attempt ${attempt}`, {
        component: 'ErrorRecovery',
        method: 'withRetry',
        metadata: { attempts: attempt, errorCode: lastError.code },
      });
      break;
    }

    // Don't delay on the last attempt
    if (attempt < maxAttempts) {
      const delay = exponential ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      LoggingService.log(
        `Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`,
        {
          component: 'ErrorRecovery',
          method: 'withRetry',
          metadata: { attempts: attempt, delay, maxAttempts },
        },
      );
      await sleep(delay);
    }
  }

  LoggingService.log(`Operation failed after ${maxAttempts} attempts`, {
    component: 'ErrorRecovery',
    method: 'withRetry',
    metadata: { attempts: maxAttempts, finalErrorCode: lastError!.code },
  });

  return err(lastError!);
}

/**
 * Fallback utility that returns a default value if operation fails
 * @param operation - The operation to fallback
 * @param fallbackValue - The default value to return if the operation fails
 * @returns A promise that resolves to the result of the operation
 */
export async function withFallback<T, E extends AppError>(
  operation: () => Promise<Result<T, E>>,
  fallbackValue: T,
): Promise<Result<T, E>> {
  const result = await operation();

  if (result.success) {
    return result;
  }

  LoggingService.log(`Operation failed, using fallback value`, {
    component: 'ErrorRecovery',
    method: 'withFallback',
    metadata: { errorCode: result.error.code },
  });

  return ok(fallbackValue);
}

/**
 * Timeout utility that cancels operation if it takes too long
 * @param operation - The operation to timeout
 * @param timeoutMs - The number of milliseconds to timeout the operation
 * @returns A promise that resolves to the result of the operation
 */
export async function withTimeout<T, E extends AppError>(
  operation: () => Promise<Result<T, E>>,
  timeoutMs: number,
): Promise<Result<T, E>> {
  return new Promise(resolve => {
    const timeoutId = setTimeout(() => {
      LoggingService.log(`Operation timed out after ${timeoutMs}ms`, {
        component: 'ErrorRecovery',
        method: 'withTimeout',
        metadata: { timeoutMs },
      });

      const timeoutError = ErrorMapper.createGenericError(
        ErrorCode.NETWORK_TIMEOUT,
        `Operation timed out after ${timeoutMs}ms`,
        'The operation took too long to complete. Please try again.',
        'ErrorRecovery.withTimeout',
        undefined,
        true,
      ) as E;

      resolve(err(timeoutError));
    }, timeoutMs);

    operation()
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        LoggingService.error(error, 'ErrorRecovery.withTimeout');

        const appError = ErrorMapper.createGenericError(
          ErrorCode.UNKNOWN_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
          'An unexpected error occurred.',
          'ErrorRecovery.withTimeout',
          error,
          true,
        ) as E;

        resolve(err(appError));
      });
  });
}

/**
 * Circuit breaker utility that prevents cascading failures
 * @param operation - The operation to execute
 * @param options - The circuit breaker options
 * @returns A promise that resolves to the result of the operation
 */
export class CircuitBreaker<T, E extends AppError> {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private operation: () => Promise<Result<T, E>>,
    private options: {
      failureThreshold: number;
      resetTimeoutMs: number;
    },
  ) {}

  async execute(): Promise<Result<T, E>> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        LoggingService.log('Circuit breaker transitioning to HALF_OPEN', {
          component: 'ErrorRecovery',
          method: 'CircuitBreaker.execute',
        });
      } else {
        const circuitOpenError = ErrorMapper.createGenericError(
          ErrorCode.CIRCUIT_BREAKER_OPEN,
          'Circuit breaker is open',
          'Service is temporarily unavailable. Please try again later.',
          'ErrorRecovery.CircuitBreaker',
          undefined,
          true,
        ) as E;

        return err(circuitOpenError);
      }
    }

    const result = await this.operation();

    if (result.success) {
      this.onSuccess();
    } else {
      this.onFailure();
    }

    return result;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      LoggingService.log(`Circuit breaker opened after ${this.failureCount} failures`, {
        component: 'ErrorRecovery',
        method: 'CircuitBreaker.onFailure',
        metadata: {
          failureCount: this.failureCount,
          threshold: this.options.failureThreshold,
        },
      });
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Bulkhead utility that isolates operations to prevent resource exhaustion
 * @param maxConcurrency - The maximum number of concurrent operations
 * @param operation - The operation to execute
 * @returns A promise that resolves to the result of the operation
 */
export class Bulkhead<T, E extends AppError> {
  private activeOperations = 0;
  private queue: Array<() => Promise<Result<T, E>>> = [];

  constructor(
    private maxConcurrency: number,
    private operation: () => Promise<Result<T, E>>,
  ) {}

  async execute(): Promise<Result<T, E>> {
    if (this.activeOperations >= this.maxConcurrency) {
      return new Promise<Result<T, E>>(resolve => {
        this.queue.push(async (): Promise<Result<T, E>> => {
          return this.executeOperation();
        });
        return resolve(ok(undefined as T));
      });
    }

    return this.executeOperation();
  }

  private async executeOperation(): Promise<Result<T, E>> {
    this.activeOperations++;

    try {
      const result = await this.operation();
      return result;
    } finally {
      this.activeOperations--;

      // Process next queued operation
      const nextOperation = this.queue.shift();
      if (nextOperation) {
        nextOperation();
      }
    }
  }

  getActiveOperations(): number {
    return this.activeOperations;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

/**
 * Compose multiple recovery strategies
 * @param operation - The operation to execute
 * @param strategies - The recovery strategies to apply
 * @returns A promise that resolves to the result of the operation
 */
export async function withRecoveryStrategies<T, E extends AppError>(
  operation: () => Promise<Result<T, E>>,
  strategies: {
    retry?: RetryOptions;
    fallback?: T;
    timeout?: number;
  },
): Promise<Result<T, E>> {
  let resultFn = operation;

  // Apply timeout if specified
  if (strategies.timeout) {
    const originalResult = resultFn;
    resultFn = () => withTimeout(originalResult, strategies.timeout!);
  }

  // Apply retry if specified
  if (strategies.retry) {
    const originalResult = resultFn;
    resultFn = () => withRetry(originalResult, strategies.retry!);
  }

  // Apply fallback if specified
  if (strategies.fallback !== undefined) {
    const originalResult = resultFn;
    resultFn = () => withFallback(originalResult, strategies.fallback!);
  }

  return resultFn();
}
