/*---------------------------------------
File: src/hooks/use-user-preferences.ts
Description: React hook for user preferences management (fetch-only with optional real-time)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { UserPreferences, UserPreferencesUpdate } from '@/domain/user/user.schema';
import { AppError } from '@/domain/common/errors';
import {
  LoadingState,
  loading,
  success,
  error as errorState,
  idle,
  getCurrentData,
} from '@/utils/loading-state';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useOptimisticUpdate } from '@/hooks/use-optimistic-update';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { UserPreferencesService } from '@/services/user-preferences-service';
import { Result } from '@/domain/common/result';

interface UseUserPreferencesOptions {
  autoFetch?: boolean;
  enableRealtime?: boolean; // ⚙️ OPTIONAL - only if instant UI reflection needed (e.g., darkMode toggle)
  preferencesId?: string; // Optional: if provided, uses get(), otherwise uses getByUserId()
}

interface UseUserPreferencesResult {
  preferences: UserPreferences | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<UserPreferences | null>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (updates: UserPreferencesUpdate) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing user preferences (fetch-only with optional real-time)
 * ⚙️ OPTIONAL real-time listener - use only if instant UI reflection needed (e.g., darkMode toggle)
 *
 * @param userId - The ID of the user
 * @param service - UserPreferencesService instance
 * @param options - Configuration options
 * @returns Object with preferences state and actions
 */
export function useUserPreferences(
  userId: string | null,
  service: UserPreferencesService,
  options: UseUserPreferencesOptions = {},
): UseUserPreferencesResult {
  const { autoFetch = false, enableRealtime = false, preferencesId } = options;

  const [state, setState] = useState<LoadingState<UserPreferences | null>>(
    autoFetch || enableRealtime ? loading() : idle(),
  );
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchPreferences = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(prevState => loading(getCurrentData(prevState)));

    const result = preferencesId
      ? await service.get(userId, preferencesId)
      : await service.getByUserId(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useUserPreferences', 'fetchPreferences', userId),
      );
    }
  }, [userId, preferencesId, service, handleError]);

  const currentPreferences = state.status === 'success' ? state.data : null;

  // Optimistic update helper
  const updatePreferencesWithOptimistic = useOptimisticUpdate(
    currentPreferences || ({} as UserPreferences),
    preferences => {
      if (isMountedRef.current && preferences && Object.keys(preferences).length > 0) {
        setState(success(preferences));
      }
    },
    {
      operation: async optimisticValue => {
        if (!userId) {
          throw new Error('User ID is required');
        }

        if (!currentPreferences) {
          throw new Error('Preferences not loaded. Please fetch preferences first.');
        }

        // Extract only updatable fields that have changed
        const updates: UserPreferencesUpdate = {};

        // Boolean fields
        if (
          'notifications' in optimisticValue &&
          optimisticValue.notifications !== undefined &&
          optimisticValue.notifications !== currentPreferences.notifications
        ) {
          updates.notifications = optimisticValue.notifications;
        }
        if (
          'darkMode' in optimisticValue &&
          optimisticValue.darkMode !== undefined &&
          optimisticValue.darkMode !== currentPreferences.darkMode
        ) {
          updates.darkMode = optimisticValue.darkMode;
        }
        if (
          'marketingConsent' in optimisticValue &&
          optimisticValue.marketingConsent !== undefined &&
          optimisticValue.marketingConsent !== currentPreferences.marketingConsent
        ) {
          updates.marketingConsent = optimisticValue.marketingConsent;
        }

        // Enum fields
        if (
          'language' in optimisticValue &&
          optimisticValue.language !== undefined &&
          optimisticValue.language !== currentPreferences.language
        ) {
          updates.language = optimisticValue.language;
        }
        if (
          'weatherUnits' in optimisticValue &&
          optimisticValue.weatherUnits !== undefined &&
          optimisticValue.weatherUnits !== currentPreferences.weatherUnits
        ) {
          updates.weatherUnits = optimisticValue.weatherUnits;
        }
        if (
          'timeFormat' in optimisticValue &&
          optimisticValue.timeFormat !== undefined &&
          optimisticValue.timeFormat !== currentPreferences.timeFormat
        ) {
          updates.timeFormat = optimisticValue.timeFormat;
        }

        // Number fields
        if (
          'weekStartsOn' in optimisticValue &&
          optimisticValue.weekStartsOn !== undefined &&
          optimisticValue.weekStartsOn !== currentPreferences.weekStartsOn
        ) {
          updates.weekStartsOn = optimisticValue.weekStartsOn;
        }

        // String fields
        if (
          'timezone' in optimisticValue &&
          optimisticValue.timezone !== undefined &&
          optimisticValue.timezone !== currentPreferences.timezone
        ) {
          updates.timezone = optimisticValue.timezone;
        }
        if (
          'dateFormat' in optimisticValue &&
          optimisticValue.dateFormat !== undefined &&
          optimisticValue.dateFormat !== currentPreferences.dateFormat
        ) {
          updates.dateFormat = optimisticValue.dateFormat;
        }

        const result = await service.update(userId, currentPreferences.id, updates);

        if (result.success) {
          // Fetch updated preferences from server
          const fetchResult = preferencesId
            ? await service.get(userId, preferencesId)
            : await service.getByUserId(userId);
          return fetchResult;
        }

        return result;
      },
      onSuccess: () => {
        // Success handled by hook
      },
      onError: (error, rollback) => {
        if (isMountedRef.current) {
          const currentData = rollback && Object.keys(rollback).length > 0 ? rollback : null;
          setState(errorState(error, currentData));
          handleError(
            error,
            ErrorContextBuilder.fromHook(
              'useUserPreferences',
              'updatePreferences',
              userId || undefined,
            ),
          );
        }
      },
    },
  );

  // Wrapper for update
  const updatePreferences = useCallback(
    async (updates: UserPreferencesUpdate): Promise<boolean> => {
      if (!userId) return false;
      if (!currentPreferences) {
        // If no preferences loaded, just update without optimistic UI
        setState(prevState => loading(getCurrentData(prevState)));

        // Need preferencesId to update - this shouldn't happen if preferences aren't loaded
        return false;
      }

      // Use optimistic update when we have existing preferences
      return await updatePreferencesWithOptimistic(updates);
    },
    [userId, currentPreferences, updatePreferencesWithOptimistic, handleError],
  );

  const refresh = useCallback(() => fetchPreferences(), [fetchPreferences]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Set up real-time subscription or auto-fetch
  useEffect(() => {
    if (!userId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    if (enableRealtime && service.subscribeToPreferences) {
      // Need preferencesId for subscription
      if (!currentPreferences) {
        // Fetch first to get preferencesId
        fetchPreferences().then(() => {
          if (!isMountedRef.current) return;
          const prefs = stateRef.current.status === 'success' ? stateRef.current.data : null;
          if (prefs) {
            const handleData = (result: Result<UserPreferences, AppError>) => {
              if (!isMountedRef.current) return;

              if (result.success) {
                setState(success(result.value));
              } else {
                const currentData = getCurrentData(stateRef.current);
                setState(errorState(result.error, currentData || null));
                handleError(
                  result.error,
                  ErrorContextBuilder.fromHook(
                    'useUserPreferences',
                    'subscribeToPreferences',
                    userId,
                  ),
                );
              }
            };

            unsubscribeRef.current =
              service.subscribeToPreferences?.(userId, prefs.id, handleData) ?? null;
          }
        });
      } else {
        const handleData = (result: Result<UserPreferences, AppError>) => {
          if (!isMountedRef.current) return;

          if (result.success) {
            setState(success(result.value));
          } else {
            const currentData = getCurrentData(stateRef.current);
            setState(errorState(result.error, currentData || null));
            handleError(
              result.error,
              ErrorContextBuilder.fromHook('useUserPreferences', 'subscribeToPreferences', userId),
            );
          }
        };

        unsubscribeRef.current = service.subscribeToPreferences(
          userId,
          currentPreferences.id,
          handleData,
        );
      }

      // Cleanup subscription on effect cleanup
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } else if (autoFetch) {
      // Defer fetchPreferences to next event loop
      setTimeout(() => {
        fetchPreferences();
      }, 0);
    }
  }, [
    userId,
    enableRealtime,
    autoFetch,
    currentPreferences,
    service,
    fetchPreferences,
    handleError,
  ]);

  return {
    preferences: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchPreferences,
    updatePreferences,
    refresh,
    clearError,
  };
}
