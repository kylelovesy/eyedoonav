/*---------------------------------------
File: src/stores/store-template.ts
Description: Base store template for Zustand stores with standard state and actions.
Provides a reusable pattern for creating stores with data, loading, and error states.

Author: Kyle Lovesy
Date: 28/10-2025 - 16.00
Version: 1.0.0
---------------------------------------*/

// Third-party libraries
import { create } from 'zustand';

// Domain/types
import { AppError } from '@/domain/common/errors';

// =================================================================================
// MARK: - Types
// =================================================================================

/**
 * Base state interface for stores.
 * Provides standard data, loading, and error state management.
 *
 * @template T - The type of data stored
 */
interface BaseStoreState<T> {
  /** The data value (null when not loaded) */
  data: T | null;

  /** Whether an operation is in progress */
  loading: boolean;

  /** Error that occurred during operation (null if no error) */
  error: AppError | null;
}

/**
 * Base actions interface for stores.
 * Provides standard actions for managing state.
 *
 * @template T - The type of data stored
 */
interface BaseStoreActions<T> {
  /** Sets the data value and clears error */
  setData: (data: T | null) => void;

  /** Sets the loading state */
  setLoading: (loading: boolean) => void;

  /** Sets the error state and clears loading */
  setError: (error: AppError | null) => void;

  /** Resets store to initial state */
  reset: () => void;
}

/**
 * Base store type combining state and actions.
 *
 * @template T - The type of data stored
 */
export type BaseStore<T> = BaseStoreState<T> & BaseStoreActions<T>;

// =================================================================================
// MARK: - Store Factory
// =================================================================================

/**
 * Creates a base store with standard state and actions.
 * Use this as a foundation for creating feature-specific stores.
 *
 * @template T - The type of data stored
 * @param initialData - Initial data value (default: null)
 * @returns A Zustand store hook with base state and actions
 *
 * @example
 * ```typescript
 * // Create a store
 * const useMyStore = createBaseStore<User>(null);
 *
 * // Use in component
 * const data = useMyStore(state => state.data);
 * const loading = useMyStore(state => state.loading);
 * const setData = useMyStore(state => state.setData);
 *
 * // Update state
 * setData(userData);
 * setLoading(true);
 * setError(appError);
 * reset();
 * ```
 */
export function createBaseStore<T>(initialData: T | null = null) {
  return create<BaseStore<T>>(set => ({
    // State
    data: initialData,
    loading: false,
    error: null,

    // Actions
    setData: data => set({ data, error: null }),
    setLoading: loading => set({ loading }),
    setError: error => set({ error, loading: false }),
    reset: () => set({ data: initialData, loading: false, error: null }),
  }));
}
