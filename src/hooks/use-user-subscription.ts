/*---------------------------------------
File: src/hooks/use-user-subscription.ts
Description: React hook for user subscription management with real-time updates
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { UserSubscription, UserSubscriptionUpdate } from '@/domain/user/user.schema';
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
import { UserSubscriptionService } from '@/services/user-subscription-service';
import { Result } from '@/domain/common/result';

interface UseUserSubscriptionOptions {
  autoFetch?: boolean;
  enableRealtime?: boolean; // ✅ RECOMMENDED - needed for plan gating, feature unlocks
  subscriptionId?: string; // Optional: if provided, uses get(), otherwise uses getByUserId()
}

interface UseUserSubscriptionResult {
  subscription: UserSubscription | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<UserSubscription | null>;
  fetchSubscription: () => Promise<void>;
  updateSubscription: (updates: UserSubscriptionUpdate) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing user subscription with real-time updates
 * ✅ RECOMMENDED: Use with enableRealtime=true for plan gating and feature unlocks
 *
 * @param userId - The ID of the user
 * @param service - UserSubscriptionService instance
 * @param options - Configuration options
 * @returns Object with subscription state and actions
 */
export function useUserSubscription(
  userId: string | null,
  service: UserSubscriptionService,
  options: UseUserSubscriptionOptions = {},
): UseUserSubscriptionResult {
  const { autoFetch = false, enableRealtime = false, subscriptionId } = options;

  const [state, setState] = useState<LoadingState<UserSubscription | null>>(
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

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(prevState => loading(getCurrentData(prevState)));

    const result = subscriptionId
      ? await service.get(userId, subscriptionId)
      : await service.getByUserId(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useUserSubscription', 'fetchSubscription', userId),
      );
    }
  }, [userId, subscriptionId, service, handleError]);

  const currentSubscription = state.status === 'success' ? state.data : null;

  // Optimistic update helper
  const updateSubscriptionWithOptimistic = useOptimisticUpdate(
    currentSubscription || ({} as UserSubscription),
    subscription => {
      if (isMountedRef.current && subscription && Object.keys(subscription).length > 0) {
        setState(success(subscription));
      }
    },
    {
      operation: async optimisticValue => {
        if (!userId) {
          throw new Error('User ID is required');
        }

        if (!currentSubscription) {
          throw new Error('Subscription not loaded. Please fetch subscription first.');
        }

        // Extract only updatable fields that have changed
        const updates: UserSubscriptionUpdate = {};

        // Enum fields
        if (
          'plan' in optimisticValue &&
          optimisticValue.plan !== undefined &&
          optimisticValue.plan !== currentSubscription.plan
        ) {
          updates.plan = optimisticValue.plan;
        }
        if (
          'status' in optimisticValue &&
          optimisticValue.status !== undefined &&
          optimisticValue.status !== currentSubscription.status
        ) {
          updates.status = optimisticValue.status;
        }
        if (
          'billingCycle' in optimisticValue &&
          optimisticValue.billingCycle !== undefined &&
          optimisticValue.billingCycle !== currentSubscription.billingCycle
        ) {
          updates.billingCycle = optimisticValue.billingCycle;
        }

        // Boolean fields
        if (
          'autoRenew' in optimisticValue &&
          optimisticValue.autoRenew !== undefined &&
          optimisticValue.autoRenew !== currentSubscription.autoRenew
        ) {
          updates.autoRenew = optimisticValue.autoRenew;
        }

        const result = await service.update(userId, currentSubscription.id, updates);

        if (result.success) {
          // Fetch updated subscription from server
          const fetchResult = subscriptionId
            ? await service.get(userId, subscriptionId)
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
              'useUserSubscription',
              'updateSubscription',
              userId || undefined,
            ),
          );
        }
      },
    },
  );

  // Wrapper for update
  const updateSubscription = useCallback(
    async (updates: UserSubscriptionUpdate): Promise<boolean> => {
      if (!userId) return false;
      if (!currentSubscription) {
        // If no subscription loaded, just update without optimistic UI
        setState(prevState => loading(getCurrentData(prevState)));

        // Need subscriptionId to update - this shouldn't happen if subscription isn't loaded
        return false;
      }

      // Use optimistic update when we have existing subscription
      return await updateSubscriptionWithOptimistic(updates);
    },
    [userId, currentSubscription, updateSubscriptionWithOptimistic, handleError],
  );

  const refresh = useCallback(() => fetchSubscription(), [fetchSubscription]);

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

    if (enableRealtime) {
      // Need subscriptionId for subscription
      if (!currentSubscription) {
        // Fetch first to get subscriptionId
        fetchSubscription().then(() => {
          if (!isMountedRef.current) return;
          const sub = stateRef.current.status === 'success' ? stateRef.current.data : null;
          if (sub) {
            const handleData = (result: Result<UserSubscription, AppError>) => {
              if (!isMountedRef.current) return;

              if (result.success) {
                setState(success(result.value));
              } else {
                const currentData = getCurrentData(stateRef.current);
                setState(errorState(result.error, currentData || null));
                handleError(
                  result.error,
                  ErrorContextBuilder.fromHook(
                    'useUserSubscription',
                    'subscribeToSubscription',
                    userId,
                  ),
                );
              }
            };

            unsubscribeRef.current = service.subscribeToSubscription(userId, sub.id, handleData);
          }
        });
      } else {
        const handleData = (result: Result<UserSubscription, AppError>) => {
          if (!isMountedRef.current) return;

          if (result.success) {
            setState(success(result.value));
          } else {
            const currentData = getCurrentData(stateRef.current);
            setState(errorState(result.error, currentData || null));
            handleError(
              result.error,
              ErrorContextBuilder.fromHook(
                'useUserSubscription',
                'subscribeToSubscription',
                userId,
              ),
            );
          }
        };

        unsubscribeRef.current = service.subscribeToSubscription(
          userId,
          currentSubscription.id,
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
      // Defer fetchSubscription to next event loop
      setTimeout(() => {
        fetchSubscription();
      }, 0);
    }
  }, [
    userId,
    enableRealtime,
    autoFetch,
    currentSubscription,
    service,
    fetchSubscription,
    handleError,
  ]);

  return {
    subscription: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchSubscription,
    updateSubscription,
    refresh,
    clearError,
  };
}
