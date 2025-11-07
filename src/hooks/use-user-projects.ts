/*---------------------------------------
File: src/hooks/use-user-projects.ts
Description: React hook for user projects management with real-time updates (active project only)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { UserProjects, UserProjectsUpdate } from '@/domain/user/user.schema';
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
import { UserProjectsService } from '@/services/user-projects-service';
import { Result } from '@/domain/common/result';

interface UseUserProjectsOptions {
  autoFetch?: boolean;
  enableRealtime?: boolean; // ✅ RECOMMENDED - needed for dashboard and progress stats (active project only)
  projectsId?: string; // Optional: if provided, uses get(), otherwise uses getByUserId()
}

interface UseUserProjectsResult {
  projects: UserProjects | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<UserProjects | null>;
  fetchProjects: () => Promise<void>;
  updateProjects: (updates: UserProjectsUpdate) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing user projects with real-time updates (active project only)
 * ✅ RECOMMENDED: Use with enableRealtime=true for dashboard and progress stats
 * Detach when user switches project or leaves workspace
 *
 * @param userId - The ID of the user
 * @param service - UserProjectsService instance
 * @param options - Configuration options
 * @returns Object with projects state and actions
 */
export function useUserProjects(
  userId: string | null,
  service: UserProjectsService,
  options: UseUserProjectsOptions = {},
): UseUserProjectsResult {
  const { autoFetch = false, enableRealtime = false, projectsId } = options;

  const [state, setState] = useState<LoadingState<UserProjects | null>>(
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

  const fetchProjects = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(prevState => loading(getCurrentData(prevState)));

    const result = projectsId
      ? await service.get(userId, projectsId)
      : await service.getByUserId(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useUserProjects', 'fetchProjects', userId),
      );
    }
  }, [userId, projectsId, service, handleError]);

  const currentProjects = state.status === 'success' ? state.data : null;

  // Optimistic update helper
  const updateProjectsWithOptimistic = useOptimisticUpdate(
    currentProjects || ({} as UserProjects),
    projects => {
      if (isMountedRef.current && projects && Object.keys(projects).length > 0) {
        setState(success(projects));
      }
    },
    {
      operation: async optimisticValue => {
        if (!userId) {
          throw new Error('User ID is required');
        }

        if (!currentProjects) {
          throw new Error('Projects not loaded. Please fetch projects first.');
        }

        // Extract only updatable fields that have changed
        const updates: UserProjectsUpdate = {};

        // Number fields
        if (
          'activeProjects' in optimisticValue &&
          optimisticValue.activeProjects !== undefined &&
          optimisticValue.activeProjects !== currentProjects.activeProjects
        ) {
          updates.activeProjects = optimisticValue.activeProjects;
        }
        if (
          'totalProjects' in optimisticValue &&
          optimisticValue.totalProjects !== undefined &&
          optimisticValue.totalProjects !== currentProjects.totalProjects
        ) {
          updates.totalProjects = optimisticValue.totalProjects;
        }

        // Array field
        if (
          'projects' in optimisticValue &&
          optimisticValue.projects !== undefined &&
          JSON.stringify(optimisticValue.projects) !== JSON.stringify(currentProjects.projects)
        ) {
          updates.projects = optimisticValue.projects;
        }

        const result = await service.update(userId, currentProjects.id, updates);

        if (result.success) {
          // Fetch updated projects from server
          const fetchResult = projectsId
            ? await service.get(userId, projectsId)
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
            ErrorContextBuilder.fromHook('useUserProjects', 'updateProjects', userId || undefined),
          );
        }
      },
    },
  );

  // Wrapper for update
  const updateProjects = useCallback(
    async (updates: UserProjectsUpdate): Promise<boolean> => {
      if (!userId) return false;
      if (!currentProjects) {
        // If no projects loaded, just update without optimistic UI
        setState(prevState => loading(getCurrentData(prevState)));

        // Need projectsId to update - this shouldn't happen if projects aren't loaded
        return false;
      }

      // Use optimistic update when we have existing projects
      return await updateProjectsWithOptimistic(updates);
    },
    [userId, currentProjects, updateProjectsWithOptimistic, handleError],
  );

  const refresh = useCallback(() => fetchProjects(), [fetchProjects]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  // Cleanup on unmount (DETACH when user switches project or leaves workspace)
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
      // Need projectsId for subscription
      if (!currentProjects) {
        // Fetch first to get projectsId
        fetchProjects().then(() => {
          if (!isMountedRef.current) return;
          const projs = stateRef.current.status === 'success' ? stateRef.current.data : null;
          if (projs) {
            const handleData = (result: Result<UserProjects, AppError>) => {
              if (!isMountedRef.current) return;

              if (result.success) {
                setState(success(result.value));
              } else {
                const currentData = getCurrentData(stateRef.current);
                setState(errorState(result.error, currentData || null));
                handleError(
                  result.error,
                  ErrorContextBuilder.fromHook('useUserProjects', 'subscribeToProjects', userId),
                );
              }
            };

            unsubscribeRef.current = service.subscribeToProjects(userId, projs.id, handleData);
          }
        });
      } else {
        const handleData = (result: Result<UserProjects, AppError>) => {
          if (!isMountedRef.current) return;

          if (result.success) {
            setState(success(result.value));
          } else {
            const currentData = getCurrentData(stateRef.current);
            setState(errorState(result.error, currentData || null));
            handleError(
              result.error,
              ErrorContextBuilder.fromHook('useUserProjects', 'subscribeToProjects', userId),
            );
          }
        };

        unsubscribeRef.current = service.subscribeToProjects(
          userId,
          currentProjects.id,
          handleData,
        );
      }

      // Cleanup subscription on effect cleanup (DETACH when switching projects)
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } else if (autoFetch) {
      // Defer fetchProjects to next event loop
      setTimeout(() => {
        fetchProjects();
      }, 0);
    }
  }, [userId, enableRealtime, autoFetch, currentProjects, service, fetchProjects, handleError]);

  return {
    projects: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchProjects,
    updateProjects,
    refresh,
    clearError,
  };
}
