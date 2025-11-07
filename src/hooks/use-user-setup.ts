/*---------------------------------------
File: src/hooks/use-user-setup.ts
Description: React hook for user setup management (fetch-only with optional temporary real-time)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { UserSetup, UserSetupUpdate } from '@/domain/user/user.schema';
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
import { UserSetupService } from '@/services/user-setup-service';
import { Result } from '@/domain/common/result';

interface UseUserSetupOptions {
  autoFetch?: boolean;
  enableTemporaryListener?: boolean; // ⚙️ OPTIONAL - use during onboarding/setup flow; remove afterward
  setupId?: string; // Optional: if provided, uses get(), otherwise uses getByUserId()
}

interface UseUserSetupResult {
  setup: UserSetup | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<UserSetup | null>;
  fetchSetup: () => Promise<void>;
  updateSetup: (updates: UserSetupUpdate) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing user setup (fetch-only with optional temporary real-time)
 * ⚙️ OPTIONAL temporary listener - use during onboarding/setup flow; remove afterward
 *
 * @param userId - The ID of the user
 * @param service - UserSetupService instance
 * @param options - Configuration options
 * @returns Object with setup state and actions
 */
export function useUserSetup(
  userId: string | null,
  service: UserSetupService,
  options: UseUserSetupOptions = {},
): UseUserSetupResult {
  const { autoFetch = false, enableTemporaryListener = false, setupId } = options;

  const [state, setState] = useState<LoadingState<UserSetup | null>>(
    autoFetch || enableTemporaryListener ? loading() : idle(),
  );
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchSetup = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(prevState => loading(getCurrentData(prevState)));

    const result = setupId ? await service.get(userId, setupId) : await service.getByUserId(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(result.error, ErrorContextBuilder.fromHook('useUserSetup', 'fetchSetup', userId));
    }
  }, [userId, setupId, service, handleError]);

  const currentSetup = state.status === 'success' ? state.data : null;

  // Optimistic update helper
  const updateSetupWithOptimistic = useOptimisticUpdate(
    currentSetup || ({} as UserSetup),
    setup => {
      if (isMountedRef.current && setup && Object.keys(setup).length > 0) {
        setState(success(setup));
      }
    },
    {
      operation: async optimisticValue => {
        if (!userId) {
          throw new Error('User ID is required');
        }

        if (!currentSetup) {
          throw new Error('Setup not loaded. Please fetch setup first.');
        }

        // Extract only updatable fields that have changed
        const updates: UserSetupUpdate = {};

        // Boolean fields
        if (
          'firstTimeSetup' in optimisticValue &&
          optimisticValue.firstTimeSetup !== undefined &&
          optimisticValue.firstTimeSetup !== currentSetup.firstTimeSetup
        ) {
          updates.firstTimeSetup = optimisticValue.firstTimeSetup;
        }
        if (
          'showOnboarding' in optimisticValue &&
          optimisticValue.showOnboarding !== undefined &&
          optimisticValue.showOnboarding !== currentSetup.showOnboarding
        ) {
          updates.showOnboarding = optimisticValue.showOnboarding;
        }
        if (
          'customKitListSetup' in optimisticValue &&
          optimisticValue.customKitListSetup !== undefined &&
          optimisticValue.customKitListSetup !== currentSetup.customKitListSetup
        ) {
          updates.customKitListSetup = optimisticValue.customKitListSetup;
        }
        if (
          'customTaskListSetup' in optimisticValue &&
          optimisticValue.customTaskListSetup !== undefined &&
          optimisticValue.customTaskListSetup !== currentSetup.customTaskListSetup
        ) {
          updates.customTaskListSetup = optimisticValue.customTaskListSetup;
        }
        if (
          'customBusinessCardSetup' in optimisticValue &&
          optimisticValue.customBusinessCardSetup !== undefined &&
          optimisticValue.customBusinessCardSetup !== currentSetup.customBusinessCardSetup
        ) {
          updates.customBusinessCardSetup = optimisticValue.customBusinessCardSetup;
        }
        if (
          'customGroupShotsSetup' in optimisticValue &&
          optimisticValue.customGroupShotsSetup !== undefined &&
          optimisticValue.customGroupShotsSetup !== currentSetup.customGroupShotsSetup
        ) {
          updates.customGroupShotsSetup = optimisticValue.customGroupShotsSetup;
        }
        if (
          'customCoupleShotsSetup' in optimisticValue &&
          optimisticValue.customCoupleShotsSetup !== undefined &&
          optimisticValue.customCoupleShotsSetup !== currentSetup.customCoupleShotsSetup
        ) {
          updates.customCoupleShotsSetup = optimisticValue.customCoupleShotsSetup;
        }

        // Date fields (optional)
        if (
          'onboardingCompletedDate' in optimisticValue &&
          optimisticValue.onboardingCompletedDate !== undefined &&
          optimisticValue.onboardingCompletedDate !== currentSetup.onboardingCompletedDate
        ) {
          updates.onboardingCompletedDate = optimisticValue.onboardingCompletedDate;
        }

        const result = await service.update(userId, currentSetup.id, updates);

        if (result.success) {
          // Fetch updated setup from server
          const fetchResult = setupId
            ? await service.get(userId, setupId)
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
            ErrorContextBuilder.fromHook('useUserSetup', 'updateSetup', userId || undefined),
          );
        }
      },
    },
  );

  // Wrapper for update
  const updateSetup = useCallback(
    async (updates: UserSetupUpdate): Promise<boolean> => {
      if (!userId) return false;
      if (!currentSetup) {
        // If no setup loaded, just update without optimistic UI
        setState(prevState => loading(getCurrentData(prevState)));

        // Need setupId to update - this shouldn't happen if setup isn't loaded
        return false;
      }

      // Use optimistic update when we have existing setup
      return await updateSetupWithOptimistic(updates);
    },
    [userId, currentSetup, updateSetupWithOptimistic, handleError],
  );

  const refresh = useCallback(() => fetchSetup(), [fetchSetup]);

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

  // Set up temporary real-time subscription or auto-fetch
  useEffect(() => {
    if (!userId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    if (enableTemporaryListener && service.subscribeToSetup) {
      // Need setupId for subscription
      if (!currentSetup) {
        // Fetch first to get setupId
        fetchSetup().then(() => {
          if (!isMountedRef.current) return;
          const setup = stateRef.current.status === 'success' ? stateRef.current.data : null;
          if (setup) {
            const handleData = (result: Result<UserSetup, AppError>) => {
              if (!isMountedRef.current) return;

              if (result.success) {
                setState(success(result.value));
              } else {
                const currentData = getCurrentData(stateRef.current);
                setState(errorState(result.error, currentData || null));
                handleError(
                  result.error,
                  ErrorContextBuilder.fromHook('useUserSetup', 'subscribeToSetup', userId),
                );
              }
            };

            unsubscribeRef.current =
              service.subscribeToSetup?.(userId, setup.id, handleData) ?? null;
          }
        });
      } else {
        const handleData = (result: Result<UserSetup, AppError>) => {
          if (!isMountedRef.current) return;

          if (result.success) {
            setState(success(result.value));
          } else {
            const currentData = getCurrentData(stateRef.current);
            setState(errorState(result.error, currentData || null));
            handleError(
              result.error,
              ErrorContextBuilder.fromHook('useUserSetup', 'subscribeToSetup', userId),
            );
          }
        };

        unsubscribeRef.current = service.subscribeToSetup(userId, currentSetup.id, handleData);
      }

      // Cleanup subscription on effect cleanup (REMOVE AFTER ONBOARDING COMPLETE)
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } else if (autoFetch) {
      // Defer fetchSetup to next event loop
      setTimeout(() => {
        fetchSetup();
      }, 0);
    }
  }, [userId, enableTemporaryListener, autoFetch, currentSetup, service, fetchSetup, handleError]);

  return {
    setup: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchSetup,
    updateSetup,
    refresh,
    clearError,
  };
}
