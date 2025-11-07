/*---------------------------------------
File: src/hooks/use-base-user.ts
Description: React hook for base user management with real-time updates
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { BaseUser, BaseUserUpdate } from '@/domain/user/user.schema';
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
import { BaseUserService } from '@/services/base-user-service';
import { Result } from '@/domain/common/result';

interface UseBaseUserOptions {
  autoFetch?: boolean;
  enableRealtime?: boolean; // ✅ Recommended for baseUser - always active after login
}

interface UseBaseUserResult {
  user: BaseUser | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<BaseUser | null>;
  fetchUser: () => Promise<void>;
  updateUser: (updates: BaseUserUpdate) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing base user with optional real-time updates
 * ✅ Recommended: Use with enableRealtime=true after login
 *
 * @param userId - The ID of the user to manage
 * @param service - BaseUserService instance
 * @param options - Configuration options
 * @returns Object with user state and actions
 */
export function useBaseUser(
  userId: string | null,
  service: BaseUserService,
  options: UseBaseUserOptions = {},
): UseBaseUserResult {
  const { autoFetch = false, enableRealtime = false } = options;

  const [state, setState] = useState<LoadingState<BaseUser | null>>(
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

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.getById(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(result.error, ErrorContextBuilder.fromHook('useBaseUser', 'fetchUser', userId));
    }
  }, [userId, service, handleError]);

  const currentUser = state.status === 'success' ? state.data : null;

  // Optimistic update helper
  const updateUserWithOptimistic = useOptimisticUpdate(
    currentUser || ({} as BaseUser),
    user => {
      if (isMountedRef.current && user && Object.keys(user).length > 0) {
        setState(success(user));
      }
    },
    {
      operation: async optimisticValue => {
        if (!userId) {
          throw new Error('User ID is required');
        }

        if (!currentUser) {
          throw new Error('User not loaded. Please fetch user first.');
        }

        // Extract only updatable fields
        const updates: BaseUserUpdate = {};

        if (
          'displayName' in optimisticValue &&
          optimisticValue.displayName !== undefined &&
          optimisticValue.displayName !== currentUser.displayName
        ) {
          updates.displayName = optimisticValue.displayName;
        }
        if (
          'email' in optimisticValue &&
          optimisticValue.email !== undefined &&
          optimisticValue.email !== currentUser.email
        ) {
          updates.email = optimisticValue.email;
        }
        if (
          'phone' in optimisticValue &&
          optimisticValue.phone !== undefined &&
          optimisticValue.phone !== currentUser.phone
        ) {
          updates.phone = optimisticValue.phone;
        }

        const result = await service.update(userId, updates);

        if (result.success) {
          // Fetch updated user from server
          const fetchResult = await service.getById(userId);
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
            ErrorContextBuilder.fromHook('useBaseUser', 'updateUser', userId || undefined),
          );
        }
      },
    },
  );

  // Wrapper for update
  const updateUser = useCallback(
    async (updates: BaseUserUpdate): Promise<boolean> => {
      if (!userId) return false;
      if (!currentUser) {
        // If no user loaded, just update without optimistic UI
        setState(prevState => loading(getCurrentData(prevState)));

        const result = await service.update(userId, updates);

        if (!isMountedRef.current) return false;

        if (result.success) {
          await fetchUser();
          return true;
        } else {
          setState(prevState => errorState(result.error, getCurrentData(prevState)));
          handleError(
            result.error,
            ErrorContextBuilder.fromHook('useBaseUser', 'updateUser', userId),
          );
          return false;
        }
      }

      // Use optimistic update when we have existing user
      return await updateUserWithOptimistic(updates);
    },
    [userId, currentUser, updateUserWithOptimistic, fetchUser, service, handleError],
  );

  const refresh = useCallback(() => fetchUser(), [fetchUser]);

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
      const handleData = (result: Result<BaseUser, AppError>) => {
        if (!isMountedRef.current) return;

        if (result.success) {
          setState(success(result.value));
        } else {
          const currentData = getCurrentData(stateRef.current);
          setState(errorState(result.error, currentData || null));
          handleError(
            result.error,
            ErrorContextBuilder.fromHook('useBaseUser', 'subscribeToUser', userId),
          );
        }
      };

      unsubscribeRef.current = service.subscribeToUser(userId, handleData);

      // Cleanup subscription on effect cleanup
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } else if (autoFetch) {
      // Defer fetchUser to next event loop
      setTimeout(() => {
        fetchUser();
      }, 0);
    }
  }, [userId, enableRealtime, autoFetch, fetchUser, service, handleError]);

  return {
    user: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchUser,
    updateUser,
    refresh,
    clearError,
  };
}
