/*---------------------------------------
File: src/hooks/use-user-projects-list.ts
Description: React hook for user's projects list with real-time subscription
✅ Subscription only active when on project management screen
✅ Automatically detaches when leaving screen, signing out, or app closes/minimizes
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { BaseProject, BaseProjectUpdate } from '@/domain/project/project.schema';
import { AppError } from '@/domain/common/errors';
import { Result } from '@/domain/common/result';
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
import { BaseProjectService } from '@/services/base-project-service';

interface UseUserProjectsListOptions {
  autoFetch?: boolean;
  enableRealtime?: boolean; // ✅ Only true when on project management screen
  onSuccess?: (projects: BaseProject[]) => void;
  onError?: (error: AppError) => void;
}

interface UseUserProjectsListResult {
  projects: BaseProject[] | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<BaseProject[] | null>;
  fetchProjects: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useUserProjectsList(
  userId: string | null,
  service: BaseProjectService,
  options: UseUserProjectsListOptions = {},
): UseUserProjectsListResult {
  const { autoFetch = false, enableRealtime = false, onSuccess, onError } = options;

  const [state, setState] = useState<LoadingState<BaseProject[] | null>>(idle());
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ✅ Cleanup on unmount (leaving project screen, signing out, app closing/minimizing)
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // ✅ DETACH subscription when leaving screen
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!userId) {
      setState(success(null));
      return;
    }

    setState(loading());

    const result = await service.listByUserId(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(errorState(result.error, null));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useUserProjectsList', 'fetchProjects', userId),
      );
      onError?.(result.error);
    }
  }, [userId, service, handleError, onSuccess, onError]);

  const refresh = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  // ✅ Set up real-time subscription ONLY when on project management screen
  useEffect(() => {
    if (!userId) {
      // ✅ DETACH when userId becomes null (sign out)
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    if (enableRealtime) {
      // ✅ SUBSCRIBE only when on project management screen
      const handleData = (result: Result<BaseProject[], AppError>) => {
        if (!isMountedRef.current) return;

        if (result.success) {
          setState(success(result.value));
          onSuccess?.(result.value);
        } else {
          const currentData = getCurrentData(stateRef.current);
          setState(errorState(result.error, currentData || null));
          handleError(
            result.error,
            ErrorContextBuilder.fromHook('useUserProjectsList', 'subscribeToUserProjects', userId),
          );
          onError?.(result.error);
        }
      };

      unsubscribeRef.current = service.subscribeToUserProjects(userId, handleData);

      // ✅ CLEANUP: DETACH when leaving screen, userId changes, or enableRealtime changes
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
  }, [userId, enableRealtime, autoFetch, fetchProjects, service, handleError, onSuccess, onError]);

  return {
    projects: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchProjects,
    refresh,
    clearError,
  };
}
