/*---------------------------------------
File: src/utils/loading-state.ts
Description: Enhanced loading state management utilities for consistent state handling.
Provides type-safe loading states with support for optimistic updates, error recovery,
and operation stage tracking with progress indicators.

Author: Kyle Lovesy
Date: 28/10-2025 - 14.00
Version: 2.0.0
---------------------------------------*/

// Domain/types
import { AppError } from '@/domain/common/errors';

// =================================================================================
// MARK: - Loading State Type
// =================================================================================

/**
 * Loading state type with discriminated union for type safety.
 * Supports idle, loading, success, and error states with optional optimistic updates,
 * operation stages, and progress tracking.
 *
 * @template T - The type of data being loaded
 */
export type LoadingState<T> =
  | { status: 'idle' }
  | {
      status: 'loading';
      data?: T;
      isOptimistic?: boolean;
      stage?: string;
      progress?: number;
    }
  | { status: 'success'; data: T }
  | {
      status: 'error';
      error: AppError;
      data?: T;
      isOptimistic?: boolean;
    };

// =================================================================================
// MARK: - Type Guards
// =================================================================================

/**
 * Type guard to check if state is idle
 *
 * @param state - Loading state to check
 * @returns True if state is idle
 */
export function isIdle<T>(state: LoadingState<T>): state is { status: 'idle' } {
  return state.status === 'idle';
}

/**
 * Type guard to check if state is loading
 *
 * @param state - Loading state to check
 * @returns True if state is loading
 */
export function isLoading<T>(state: LoadingState<T>): state is {
  status: 'loading';
  data?: T;
  isOptimistic?: boolean;
  stage?: string;
  progress?: number;
} {
  return state.status === 'loading';
}

/**
 * Type guard to check if state is success
 *
 * @param state - Loading state to check
 * @returns True if state is success
 */
export function isSuccess<T>(state: LoadingState<T>): state is { status: 'success'; data: T } {
  return state.status === 'success';
}

/**
 * Type guard to check if state is error
 *
 * @param state - Loading state to check
 * @returns True if state is error
 */
export function hasError<T>(state: LoadingState<T>): state is {
  status: 'error';
  error: AppError;
  data?: T;
  isOptimistic?: boolean;
} {
  return state.status === 'error';
}

/**
 * Check if state has data (success or loading/error with data)
 *
 * @param state - Loading state to check
 * @returns True if state has data
 */
export function hasData<T>(
  state: LoadingState<T>,
): state is
  | { status: 'success'; data: T }
  | { status: 'loading'; data: T; isOptimistic?: boolean; stage?: string; progress?: number }
  | { status: 'error'; error: AppError; data: T; isOptimistic?: boolean } {
  return 'data' in state && state.data !== undefined;
}

/**
 * Check if state is optimistic (loading or error with optimistic flag)
 *
 * @param state - Loading state to check
 * @returns True if state is optimistic
 */
export function isOptimistic<T>(state: LoadingState<T>): boolean {
  return 'isOptimistic' in state && state.isOptimistic === true;
}

/**
 * Check if state is loading but not optimistic (initial load)
 *
 * @param state - Loading state to check
 * @returns True if state is initial loading
 */
export function isInitialLoading<T>(state: LoadingState<T>): boolean {
  return state.status === 'loading' && !state.isOptimistic;
}

/**
 * Check if state is loading with optimistic update
 *
 * @param state - Loading state to check
 * @returns True if state is optimistic loading
 */
export function isOptimisticLoading<T>(state: LoadingState<T>): boolean {
  return state.status === 'loading' && state.isOptimistic === true;
}

// =================================================================================
// MARK: - State Creators
// =================================================================================

/**
 * Create an idle state
 *
 * @returns LoadingState in idle status
 *
 * @example
 * ```typescript
 * const state = idle<User>();
 * ```
 */
export function idle<T>(): LoadingState<T> {
  return { status: 'idle' };
}

/**
 * Create a loading state
 *
 * @param data - Optional data to display while loading (e.g., for optimistic updates)
 * @param isOptimistic - Whether this is an optimistic update
 * @returns LoadingState in loading status
 *
 * @example
 * ```typescript
 * const state = loading<User>(currentUser, false);
 * ```
 */
export function loading<T>(data?: T, isOptimistic = false): LoadingState<T> {
  return { status: 'loading', data, isOptimistic };
}

/**
 * Helper to create loading state with stage/progress tracking.
 * Useful for multi-step operations where you want to show progress to users.
 *
 * @param data - Optional data to display while loading
 * @param isOptimistic - Whether this is an optimistic update (default: false)
 * @param stage - Optional operation stage description (e.g., 'Validating', 'Saving', 'Uploading')
 * @param progress - Optional progress percentage (0-100)
 * @returns LoadingState in loading status with stage and progress
 *
 * @example
 * ```typescript
 * // Show progress for file upload
 * const state = loadingWithProgress<File>(
 *   currentFile,
 *   false,
 *   'Uploading',
 *   45
 * );
 *
 * // Show stage for multi-step operation
 * const state = loadingWithProgress<Project>(
 *   undefined,
 *   false,
 *   'Initializing subcollections',
 *   undefined
 * );
 * ```
 */
export function loadingWithProgress<T>(
  data?: T,
  isOptimistic = false,
  stage?: string,
  progress?: number,
): LoadingState<T> {
  return {
    status: 'loading',
    data,
    isOptimistic,
    stage,
    progress: progress !== undefined ? Math.max(0, Math.min(100, progress)) : undefined,
  };
}

/**
 * Create a success state
 *
 * @param data - The successful data
 * @returns LoadingState in success status
 *
 * @example
 * ```typescript
 * const state = success<User>(userData);
 * ```
 */
export function success<T>(data: T): LoadingState<T> {
  return { status: 'success', data };
}

/**
 * Create an error state
 *
 * @param error - The error that occurred
 * @param data - Optional previous data to restore (for rollback)
 * @param isOptimistic - Whether this error occurred during an optimistic update
 * @returns LoadingState in error status
 *
 * @example
 * ```typescript
 * const state = error<User>(appError, previousUser, true);
 * ```
 */
export function error<T>(error: AppError, data?: T, isOptimistic = false): LoadingState<T> {
  return { status: 'error', error, data, isOptimistic };
}

// =================================================================================
// MARK: - Data Extractors
// =================================================================================

/**
 * Extract data from loading state (if available)
 * Returns undefined if no data is available
 *
 * @param state - Loading state to extract data from
 * @returns Data if available, undefined otherwise
 */
export function getData<T>(state: LoadingState<T>): T | undefined {
  return 'data' in state ? state.data : undefined;
}

/**
 * Extract error from loading state (if available)
 *
 * @param state - Loading state to extract error from
 * @returns Error if available, undefined otherwise
 */
export function getError<T>(state: LoadingState<T>): AppError | undefined {
  return hasError(state) ? state.error : undefined;
}

/**
 * Get the current data from any state.
 * Useful for optimistic updates where you want to show previous data.
 *
 * @param state - Loading state to get data from
 * @returns Current data if available, undefined otherwise
 *
 * @example
 * ```typescript
 * const currentData = getCurrentData(state);
 * // Returns data from success, loading, or error states
 * // Returns undefined for idle state
 * ```
 */
export function getCurrentData<T>(state: LoadingState<T>): T | undefined {
  if (state.status === 'idle') return undefined;
  if (state.status === 'loading') return state.data;
  if (state.status === 'success') return state.data;
  if (state.status === 'error') return state.data;
  return undefined;
}

/**
 * Get the operation stage from loading state (if available)
 *
 * @param state - Loading state to get stage from
 * @returns Stage string if available, undefined otherwise
 */
export function getStage<T>(state: LoadingState<T>): string | undefined {
  return isLoading(state) ? state.stage : undefined;
}

/**
 * Get the progress percentage from loading state (if available)
 *
 * @param state - Loading state to get progress from
 * @returns Progress (0-100) if available, undefined otherwise
 */
export function getProgress<T>(state: LoadingState<T>): number | undefined {
  return isLoading(state) ? state.progress : undefined;
}

// =================================================================================
// MARK: - State Transformers
// =================================================================================

/**
 * Create loading state from result.
 * Converts Result<T, AppError> to LoadingState<T>
 *
 * @param result - Result to convert
 * @param previousData - Optional previous data to preserve on error
 * @returns LoadingState converted from result
 */
export function fromResult<T>(
  result: { success: true; value: T } | { success: false; error: AppError },
  previousData?: T,
): LoadingState<T> {
  if (result.success) {
    return success(result.value);
  }
  return error(result.error, previousData);
}

/**
 * Map loading state to another type.
 * Useful for transforming data within loading states.
 *
 * @param state - Loading state to transform
 * @param mapper - Function to map data from T to U
 * @returns Transformed LoadingState
 */
export function mapLoadingState<T, U>(
  state: LoadingState<T>,
  mapper: (data: T) => U,
): LoadingState<U> {
  if (isIdle(state)) {
    return idle<U>();
  }
  if (isLoading(state)) {
    return state.data !== undefined
      ? loadingWithProgress<U>(mapper(state.data), state.isOptimistic, state.stage, state.progress)
      : loadingWithProgress<U>(undefined, state.isOptimistic, state.stage, state.progress);
  }
  if (isSuccess(state)) {
    return success<U>(mapper(state.data));
  }
  if (hasError(state)) {
    return state.data !== undefined
      ? error<U>(state.error, mapper(state.data), state.isOptimistic)
      : error<U>(state.error, undefined, state.isOptimistic);
  }
  return idle<U>();
}

/**
 * Combine multiple loading states into one.
 * Returns error if any state has error, loading if any is loading, success if all are success.
 *
 * @param states - Array of loading states to combine
 * @returns Combined LoadingState
 */
export function combineLoadingStates<T>(states: LoadingState<T>[]): LoadingState<T[]> {
  // Check for errors first
  const errorState = states.find(hasError);
  if (errorState) {
    return error(errorState.error);
  }

  // Check if any are loading
  const loadingState = states.find(isLoading);
  if (loadingState) {
    const data = states.map(getData).filter((d): d is T => d !== undefined);
    return loading(data.length > 0 ? (data as T[]) : undefined);
  }

  // All must be success - extract all data
  const allData = states.map(getData).filter((d): d is T => d !== undefined);

  // If we have no data at all, return empty array (all states were idle or had no data)
  if (allData.length === 0) {
    return success([] as T[]);
  }

  return success(allData as T[]);
}

// =================================================================================
// MARK: - Utility Helpers
// =================================================================================

/**
 * Helper to check if operation can be retried.
 * Returns true if state is error and error is retryable.
 *
 * @param state - Loading state to check
 * @returns True if operation can be retried
 */
export function canRetry<T>(state: LoadingState<T>): boolean {
  return hasError(state) && state.error.retryable;
}

// =================================================================================
// MARK: - Mutation State
// =================================================================================

/**
 * Helper to get loading state for mutations.
 * Separate from fetch loading states.
 */
export type MutationState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Creates a mutation state manager.
 * Useful for simple mutation operations that don't need full LoadingState complexity.
 *
 * @returns Mutation state manager object
 *
 * @example
 * ```typescript
 * const mutation = createMutationState();
 * mutation.setLoading();
 * // ... perform operation
 * mutation.setSuccess();
 * ```
 */
export function createMutationState(): {
  state: MutationState;
  error: AppError | null;
  setLoading: () => void;
  setSuccess: () => void;
  setError: (error: AppError) => void;
  reset: () => void;
} {
  let state: MutationState = 'idle';
  let error: AppError | null = null;

  return {
    get state() {
      return state;
    },
    get error() {
      return error;
    },
    setLoading: () => {
      state = 'loading';
      error = null;
    },
    setSuccess: () => {
      state = 'success';
      error = null;
    },
    setError: (err: AppError) => {
      state = 'error';
      error = err;
    },
    reset: () => {
      state = 'idle';
      error = null;
    },
  };
}
