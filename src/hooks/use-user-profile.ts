/*---------------------------------------
File: src/hooks/use-user-profile.ts
Description: React hook for user profile management (fetch-only, no real-time)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { UserProfile, UserProfileUpdate } from '@/domain/user/user.schema';
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
import { UserProfileService } from '@/services/user-profile-service';

interface UseUserProfileOptions {
  autoFetch?: boolean;
  profileId?: string; // Optional: if provided, uses get(), otherwise uses getByUserId()
}

interface UseUserProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<UserProfile | null>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: UserProfileUpdate) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing user profile (fetch-only, no real-time)
 * ❌ NO real-time listener - fetch only when needed
 *
 * @param userId - The ID of the user
 * @param service - UserProfileService instance
 * @param options - Configuration options
 * @returns Object with profile state and actions
 */
export function useUserProfile(
  userId: string | null,
  service: UserProfileService,
  options: UseUserProfileOptions = {},
): UseUserProfileResult {
  const { autoFetch = false, profileId } = options;

  const [state, setState] = useState<LoadingState<UserProfile | null>>(
    autoFetch ? loading() : idle(),
  );
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(prevState => loading(getCurrentData(prevState)));

    const result = profileId
      ? await service.get(userId, profileId)
      : await service.getByUserId(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useUserProfile', 'fetchProfile', userId),
      );
    }
  }, [userId, profileId, service, handleError]);

  const currentProfile = state.status === 'success' ? state.data : null;

  // Optimistic update helper
  const updateProfileWithOptimistic = useOptimisticUpdate(
    currentProfile || ({} as UserProfile),
    profile => {
      if (isMountedRef.current && profile && Object.keys(profile).length > 0) {
        setState(success(profile));
      }
    },
    {
      operation: async optimisticValue => {
        if (!userId) {
          throw new Error('User ID is required');
        }

        if (!currentProfile) {
          throw new Error('Profile not loaded. Please fetch profile first.');
        }

        // Extract only updatable fields
        const updates: UserProfileUpdate = {};

        if (
          'name' in optimisticValue &&
          optimisticValue.name !== undefined &&
          optimisticValue.name !== currentProfile.name
        ) {
          updates.name = optimisticValue.name;
        }
        if (
          'bio' in optimisticValue &&
          optimisticValue.bio !== undefined &&
          optimisticValue.bio !== currentProfile.bio
        ) {
          updates.bio = optimisticValue.bio;
        }
        if (
          'website' in optimisticValue &&
          optimisticValue.website !== undefined &&
          optimisticValue.website !== currentProfile.website
        ) {
          updates.website = optimisticValue.website;
        }
        if (
          'businessName' in optimisticValue &&
          optimisticValue.businessName !== undefined &&
          optimisticValue.businessName !== currentProfile.businessName
        ) {
          updates.businessName = optimisticValue.businessName;
        }

        const result = await service.update(userId, currentProfile.id, updates);

        if (result.success) {
          // Fetch updated profile from server
          const fetchResult = profileId
            ? await service.get(userId, profileId)
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
            ErrorContextBuilder.fromHook('useUserProfile', 'updateProfile', userId || undefined),
          );
        }
      },
    },
  );

  // Wrapper for update
  const updateProfile = useCallback(
    async (updates: UserProfileUpdate): Promise<boolean> => {
      if (!userId) return false;
      if (!currentProfile) {
        // If no profile loaded, just update without optimistic UI
        setState(prevState => loading(getCurrentData(prevState)));

        // Need profileId to update - this shouldn't happen if profile isn't loaded
        return false;
      }

      // Use optimistic update when we have existing profile
      return await updateProfileWithOptimistic(updates);
    },
    [userId, currentProfile, updateProfileWithOptimistic, handleError],
  );

  const refresh = useCallback(() => fetchProfile(), [fetchProfile]);

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
      // Defer fetchProfile to next event loop
      setTimeout(() => {
        fetchProfile();
      }, 0);
    }
  }, [userId, autoFetch, fetchProfile]);

  return {
    profile: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchProfile,
    updateProfile,
    refresh,
    clearError,
  };
}
