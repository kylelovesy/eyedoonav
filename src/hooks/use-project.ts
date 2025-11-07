/*---------------------------------------
File: src/hooks/use-project.ts
Description: React hook for project management with optimistic updates
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { BaseProject, BaseProjectUpdate } from '@/domain/project/project.schema';
import { AppError } from '@/domain/common/errors';
import { err, ok, Result } from '@/domain/common/result';
import {
  LoadingState,
  loading,
  success,
  error as errorState,
  idle,
  getCurrentData,
} from '@/utils/loading-state';
import { useErrorHandler } from './use-error-handler';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { useOptimisticUpdate } from './use-optimistic-update';
import { BaseProjectService } from '@/services/base-project-service';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';

interface UseProjectOptions {
  autoFetch?: boolean;
  enableRealtime?: boolean;
  onSuccess?: (project: BaseProject) => void;
  onError?: (error: AppError) => void;
}

interface UseProjectResult {
  project: BaseProject | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<BaseProject | null>;
  fetchProject: (projectId: string) => Promise<void>;
  updateProject: (projectId: string, payload: BaseProjectUpdate) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing a single project with optimistic updates
 *
 * @param projectId - The ID of the project to manage (null if not selected)
 * @param service - BaseProjectService instance
 * @param options - Configuration options
 * @returns Object with project state and operations
 */
export function useProject(
  projectId: string | null,
  service: BaseProjectService,
  options: UseProjectOptions = {},
): UseProjectResult {
  const { autoFetch = false, enableRealtime = false, onSuccess, onError } = options;

  const [state, setState] = useState<LoadingState<BaseProject | null>>(
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

  // Cleanup on unmount (e.g., leaving the project screen)
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const currentProject = state.status === 'success' ? state.data : null;

  const fetchProject = useCallback(
    async (id: string) => {
      setState(prevState => loading(getCurrentData(prevState)));

      const result = await service.getById(id);

      if (!isMountedRef.current) return;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useProject', 'fetchProject', undefined, id),
        );
        onError?.(result.error);
      }
    },
    [service, handleError, onSuccess, onError],
  );

  // Optimistic update helper
  const updateProjectWithOptimistic = useOptimisticUpdate(
    currentProject!,
    project => {
      if (isMountedRef.current && project && Object.keys(project).length > 0) {
        setState(success(project));
      }
    },
    {
      operation: async (optimisticValue: BaseProject): Promise<Result<BaseProject, AppError>> => {
        if (!projectId) {
          return err(
            ErrorMapper.createGenericError(
              ErrorCode.VALIDATION_FAILED,
              'Project ID required',
              'Project ID is required to update.',
              ErrorContextBuilder.toString(
                ErrorContextBuilder.fromHook('useProject', 'updateProject', undefined, undefined),
              ),
            ),
          );
        }

        // Extract only the changed fields (updates) from optimistic value
        // Compare optimisticValue with currentProject to get only changed fields
        const current = currentProject!;
        const updates: BaseProjectUpdate = {};

        // Only include fields that differ from current project
        // Use JSON.stringify for deep comparison of nested objects
        Object.keys(optimisticValue).forEach(key => {
          const typedKey = key as keyof BaseProject;
          const optimisticVal = optimisticValue[typedKey];
          const currentVal = current[typedKey];

          // Deep comparison for nested objects, shallow for primitives
          if (
            typeof optimisticVal === 'object' &&
            optimisticVal !== null &&
            typeof currentVal === 'object' &&
            currentVal !== null
          ) {
            if (JSON.stringify(optimisticVal) !== JSON.stringify(currentVal)) {
              // @ts-expect-error - Dynamic key assignment is safe here
              updates[typedKey] = optimisticVal;
            }
          } else if (optimisticVal !== currentVal) {
            // @ts-expect-error - Dynamic key assignment is safe here
            updates[typedKey] = optimisticVal;
          }
        });

        // Perform update (returns void)
        const updateResult = await service.update(projectId, updates);
        if (!updateResult.success) {
          return err(updateResult.error);
        }

        // Fetch updated project to return final value
        const fetchResult = await service.getById(projectId);
        if (!fetchResult.success) {
          return err(fetchResult.error);
        }

        return ok(fetchResult.value);
      },
      onSuccess: finalValue => {
        // Update state with final server value
        if (isMountedRef.current) {
          setState(success(finalValue));
          onSuccess?.(finalValue);
        }
      },
      onError: (error, rollback) => {
        if (isMountedRef.current) {
          const currentData =
            rollback && Object.keys(rollback).length > 0
              ? rollback
              : getCurrentData(stateRef.current);
          setState(errorState(error, currentData));
          handleError(
            error,
            ErrorContextBuilder.fromHook(
              'useProject',
              'updateProject',
              undefined,
              projectId || undefined,
            ),
          );
          onError?.(error);
        }
      },
    },
  );

  const updateProject = useCallback(
    async (id: string, payload: BaseProjectUpdate): Promise<boolean> => {
      if (!id) return false;

      if (!currentProject) {
        // If no project loaded, update without optimistic UI
        setState(prevState => loading(getCurrentData(prevState)));

        const result = await service.update(id, payload);

        if (!isMountedRef.current) return false;

        if (result.success) {
          await fetchProject(id);
          return true;
        } else {
          setState(prevState => errorState(result.error, getCurrentData(prevState)));
          handleError(
            result.error,
            ErrorContextBuilder.fromHook('useProject', 'updateProject', undefined, id),
          );
          onError?.(result.error);
          return false;
        }
      }

      // Use optimistic update when we have existing project
      return await updateProjectWithOptimistic(payload);
    },
    [currentProject, updateProjectWithOptimistic, fetchProject, service, handleError, onError],
  );

  const refresh = useCallback(async () => {
    if (projectId) {
      await fetchProject(projectId);
    }
  }, [projectId, fetchProject]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  // Set up real-time subscription or auto-fetch
  useEffect(() => {
    if (!projectId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    if (enableRealtime) {
      // Note: BaseProjectService doesn't have subscribeToProject method
      // For single project subscription, you'd need to add that method
      // For now, subscribe to user's projects list and filter
      // This is a placeholder - implement when needed
      // unsubscribeRef.current = service.subscribeToProject(projectId, handleData);

      // Cleanup subscription on effect cleanup (DETACH when leaving screen)
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } else if (autoFetch) {
      // Defer fetchProject to next event loop
      setTimeout(() => {
        fetchProject(projectId);
      }, 0);
    }
  }, [projectId, enableRealtime, autoFetch, fetchProject]);

  return {
    project: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchProject,
    updateProject,
    refresh,
    clearError,
  };
}
