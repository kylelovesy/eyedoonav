/*---------------------------------------
File: src/hooks/use-user-customizations.ts
Description: React hook for user customizations management (fetch-only, no real-time)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { UserCustomizations, UserCustomizationsUpdate } from '@/domain/user/user.schema';
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
import { UserCustomizationsService } from '@/services/user-customizations-service';

interface UseUserCustomizationsOptions {
  autoFetch?: boolean;
  customizationsId?: string; // Optional: if provided, uses get(), otherwise uses getByUserId()
}

interface UseUserCustomizationsResult {
  customizations: UserCustomizations | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<UserCustomizations | null>;
  fetchCustomizations: () => Promise<void>;
  updateCustomizations: (updates: UserCustomizationsUpdate) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing user customizations (fetch-only, no real-time)
 * ❌ NO real-time listener - fetch once and cache (AsyncStorage or Zustand persist)
 *
 * @param userId - The ID of the user
 * @param service - UserCustomizationsService instance
 * @param options - Configuration options
 * @returns Object with customizations state and actions
 */
export function useUserCustomizations(
  userId: string | null,
  service: UserCustomizationsService,
  options: UseUserCustomizationsOptions = {},
): UseUserCustomizationsResult {
  const { autoFetch = false, customizationsId } = options;

  const [state, setState] = useState<LoadingState<UserCustomizations | null>>(
    autoFetch ? loading() : idle(),
  );
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);

  const fetchCustomizations = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(prevState => loading(getCurrentData(prevState)));

    const result = customizationsId
      ? await service.get(userId, customizationsId)
      : await service.getByUserId(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useUserCustomizations', 'fetchCustomizations', userId),
      );
    }
  }, [userId, customizationsId, service, handleError]);

  const currentCustomizations = state.status === 'success' ? state.data : null;

  // Optimistic update helper
  const updateCustomizationsWithOptimistic = useOptimisticUpdate(
    currentCustomizations || ({} as UserCustomizations),
    customizations => {
      if (isMountedRef.current && customizations && Object.keys(customizations).length > 0) {
        setState(success(customizations));
      }
    },
    {
      operation: async optimisticValue => {
        if (!userId) {
          throw new Error('User ID is required');
        }

        if (!currentCustomizations) {
          throw new Error('Customizations not loaded. Please fetch customizations first.');
        }

        // Extract only updatable fields that have changed
        const updates: UserCustomizationsUpdate = {};

        if (
          'primaryColor' in optimisticValue &&
          optimisticValue.primaryColor !== undefined &&
          optimisticValue.primaryColor !== currentCustomizations.primaryColor
        ) {
          updates.primaryColor = optimisticValue.primaryColor;
        }
        if (
          'secondaryColor' in optimisticValue &&
          optimisticValue.secondaryColor !== undefined &&
          optimisticValue.secondaryColor !== currentCustomizations.secondaryColor
        ) {
          updates.secondaryColor = optimisticValue.secondaryColor;
        }
        if (
          'accentColor' in optimisticValue &&
          optimisticValue.accentColor !== undefined &&
          optimisticValue.accentColor !== currentCustomizations.accentColor
        ) {
          updates.accentColor = optimisticValue.accentColor;
        }
        if (
          'backgroundColor' in optimisticValue &&
          optimisticValue.backgroundColor !== undefined &&
          optimisticValue.backgroundColor !== currentCustomizations.backgroundColor
        ) {
          updates.backgroundColor = optimisticValue.backgroundColor;
        }
        if (
          'textColor' in optimisticValue &&
          optimisticValue.textColor !== undefined &&
          optimisticValue.textColor !== currentCustomizations.textColor
        ) {
          updates.textColor = optimisticValue.textColor;
        }
        if (
          'logo' in optimisticValue &&
          optimisticValue.logo !== undefined &&
          optimisticValue.logo !== currentCustomizations.logo
        ) {
          updates.logo = optimisticValue.logo;
        }

        const result = await service.update(userId, currentCustomizations.id, updates);

        if (result.success) {
          // Fetch updated customizations from server
          const fetchResult = customizationsId
            ? await service.get(userId, customizationsId)
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
              'useUserCustomizations',
              'updateCustomizations',
              userId || undefined,
            ),
          );
        }
      },
    },
  );

  // Wrapper for update
  const updateCustomizations = useCallback(
    async (updates: UserCustomizationsUpdate): Promise<boolean> => {
      if (!userId) return false;
      if (!currentCustomizations) {
        // If no customizations loaded, just update without optimistic UI
        setState(prevState => loading(getCurrentData(prevState)));

        // Need customizationsId to update - this shouldn't happen if customizations aren't loaded
        return false;
      }

      // Use optimistic update when we have existing customizations
      return await updateCustomizationsWithOptimistic(updates);
    },
    [userId, currentCustomizations, updateCustomizationsWithOptimistic, handleError],
  );

  const refresh = useCallback(() => fetchCustomizations(), [fetchCustomizations]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && userId) {
      // Defer fetchCustomizations to next event loop
      setTimeout(() => {
        fetchCustomizations();
      }, 0);
    }
  }, [userId, autoFetch, fetchCustomizations]);

  return {
    customizations: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchCustomizations,
    updateCustomizations,
    refresh,
    clearError,
  };
}
