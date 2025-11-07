/*---------------------------------------
File: src/hooks/use-optimistic-update.ts
Description: React hook for optimistic updates with automatic rollback on error.
Provides a clean pattern for implementing optimistic UI updates that automatically
revert if the server operation fails.

Author: Kyle Lovesy
Date: 28/10-2025 - 16.00
Version: 1.0.0
---------------------------------------*/

// React/React Native
import { useCallback, useRef } from 'react';

// Domain/types
import { Result } from '@/domain/common/result';
import { AppError, ValidationError } from '@/domain/common/errors';

// =================================================================================
// MARK: - Types
// =================================================================================

/**
 * Options for optimistic update hook
 *
 * @template T - The type of data being updated
 */
export interface UseOptimisticUpdateOptions<T> {
  /**
   * Called to perform the actual operation
   * Should return a Result<T, AppError>
   *
   * @param optimisticValue - The optimistic value that was applied
   * @returns Result with server response or error
   */
  operation: (optimisticValue: T) => Promise<Result<T, AppError>>;

  /**
   * Called on success with the final server value
   * The server value may differ from the optimistic value
   *
   * @param finalValue - The final value from the server
   */
  onSuccess?: (finalValue: T) => void;

  /**
   * Called on error with the error and rollback value
   * The value has already been rolled back when this is called
   *
   * @param error - The error that occurred
   * @param rollbackValue - The value that was restored (previous value)
   */
  onError?: (error: AppError, rollbackValue: T) => void;
}

/**
 * Return type for optimistic update hook
 *
 * @template T - The type of data being updated
 */
export type OptimisticUpdateFunction<T> = (updates: Partial<T>) => Promise<boolean>;

// =================================================================================
// MARK: - Hook
// =================================================================================

/**
 * Hook for optimistic updates with automatic rollback.
 *
 * This hook provides a clean pattern for implementing optimistic UI updates:
 * 1. Immediately applies updates to the UI (optimistic)
 * 2. Performs the actual operation
 * 3. On success: uses server value (may differ from optimistic)
 * 4. On error: automatically rolls back to previous value
 *
 * @template T - The type of data being updated
 *
 * @param currentValue - Current value of the data
 * @param setValue - Function to update the value
 * @param options - Configuration options including operation, onSuccess, and onError
 * @returns Function to perform optimistic update
 *
 * @example
 * ```typescript
 * const updateProfile = useOptimisticUpdate(
 *   profile,
 *   setProfile,
 *   {
 *     operation: async (optimistic) => {
 *       return await userService.updateUserProfile(userId, optimistic);
 *     },
 *     onSuccess: (final) => {
 *       showToast({ type: 'success', message: 'Profile updated' });
 *     },
 *     onError: (error, rollback) => {
 *       handleError(
 *         error,
 *         ErrorContextBuilder.fromHook('useUserProfile', 'updateProfile')
 *       );
 *     },
 *   }
 * );
 *
 * // Use it
 * const success = await updateProfile({ displayName: 'New Name' });
 * ```
 */
export function useOptimisticUpdate<T extends Record<string, unknown>>(
  currentValue: T,
  setValue: (value: T) => void,
  options: UseOptimisticUpdateOptions<T>,
): OptimisticUpdateFunction<T> {
  const { operation, onSuccess, onError } = options;
  const isMountedRef = useRef(true);

  return useCallback(
    async (updates: Partial<T>): Promise<boolean> => {
      // Store previous value for rollback
      const previousValue = currentValue;

      // Create optimistic value by merging updates
      const optimisticValue = { ...currentValue, ...updates } as T;

      // Apply optimistic update immediately
      setValue(optimisticValue);

      try {
        // Perform actual operation
        const result = await operation(optimisticValue);

        // Check if component is still mounted
        if (!isMountedRef.current) {
          return false;
        }

        if (result.success) {
          // Use server value (may differ from optimistic)
          setValue(result.value);
          onSuccess?.(result.value);
          return true;
        } else {
          // Rollback on error
          setValue(previousValue);
          onError?.(result.error, previousValue);
          return false;
        }
      } catch (error) {
        // Rollback on exception
        if (isMountedRef.current) {
          setValue(previousValue);

          // Convert unknown error to AppError
          const appError: AppError =
            error instanceof Error && 'code' in error && 'userMessage' in error
              ? (error as unknown as AppError)
              : new ValidationError(
                  error instanceof Error ? error.message : 'An unexpected error occurred',
                  { general: 'An unexpected error occurred. Please try again.' },
                  'useOptimisticUpdate',
                  error,
                );

          onError?.(appError, previousValue);
        }
        return false;
      }
    },
    [currentValue, setValue, operation, onSuccess, onError],
  );
}
