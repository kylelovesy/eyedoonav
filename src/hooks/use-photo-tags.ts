/*---------------------------------------
File: src/hooks/use-photo-tags.ts
Description: PhotoTagLink hook for managing photo tag links (local storage)

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
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
import { PhotoTagLink, PhotoTagLinkInput, PhotoTagLinkUpdate } from '@/domain/scoped/tag.schema';
import { AppError } from '@/domain/common/errors';
import { PhotoTagLinkService } from '@/services/photo-tag-link-service';
import { SubscriptionPlan } from '@/constants/enums';

interface UsePhotoTagsOptions {
  projectId?: string; // Optional - filter by project
  subscriptionPlan: SubscriptionPlan;
  autoFetch?: boolean;
  onSuccess?: (links: PhotoTagLink[]) => void;
  onError?: (error: AppError) => void;
}

interface UsePhotoTagsResult {
  photoTagLinks: PhotoTagLink[];
  loading: boolean;
  error: AppError | null;
  state: LoadingState<PhotoTagLink[]>;

  // Operations
  getAllPhotoTagLinks: () => Promise<void>;
  getPhotoTagLinksByProject: (projectId: string) => Promise<void>;
  getPhotoTagLinkById: (id: string) => Promise<PhotoTagLink | null>;
  createPhotoTagLink: (input: PhotoTagLinkInput) => Promise<boolean>;
  updatePhotoTagLink: (id: string, updates: PhotoTagLinkUpdate) => Promise<boolean>;
  deletePhotoTagLink: (id: string) => Promise<boolean>;

  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;
  canShare: boolean;
}

export function usePhotoTags(
  service: PhotoTagLinkService,
  options: UsePhotoTagsOptions,
): UsePhotoTagsResult {
  const { projectId, subscriptionPlan, autoFetch = false, onSuccess, onError } = options;

  const [state, setState] = useState<LoadingState<PhotoTagLink[]>>(
    autoFetch ? loading([]) : idle(),
  );
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);
  const stateRef = useRef(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============================================================================
  // OPERATIONS
  // ============================================================================

  const getAllPhotoTagLinks = useCallback(async () => {
    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.getAll();

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('usePhotoTags', 'getAllPhotoTagLinks'),
      );
      onError?.(result.error);
    }
  }, [service, handleError, onSuccess, onError]);

  const getPhotoTagLinksByProject = useCallback(
    async (targetProjectId: string) => {
      setState(prevState => loading(getCurrentData(prevState)));

      const result = await service.getByProjectId(targetProjectId);

      if (!isMountedRef.current) return;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'usePhotoTags',
            'getPhotoTagLinksByProject',
            undefined,
            targetProjectId,
          ),
        );
        onError?.(result.error);
      }
    },
    [service, handleError, onSuccess, onError],
  );

  // Auto-fetch on mount
  useEffect(() => {
    if (!autoFetch) return;

    const fetchData = async () => {
      if (projectId) {
        await getPhotoTagLinksByProject(projectId);
      } else {
        await getAllPhotoTagLinks();
      }
    };

    fetchData();
    // Only run on mount or when autoFetch/projectId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, projectId]);

  const getPhotoTagLinkById = useCallback(
    async (id: string): Promise<PhotoTagLink | null> => {
      const result = await service.getById(id);

      if (!isMountedRef.current) return null;

      if (result.success) {
        return result.value;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'usePhotoTags',
            'getPhotoTagLinkById',
            undefined,
            undefined,
            {
              linkId: id,
            },
          ),
        );
        onError?.(result.error);
        return null;
      }
    },
    [service, handleError, onError],
  );

  const createPhotoTagLink = useCallback(
    async (input: PhotoTagLinkInput): Promise<boolean> => {
      const currentLinks = stateRef.current.status === 'success' ? stateRef.current.data : [];

      // Optimistic update
      const optimisticLink: PhotoTagLink = {
        id: 'temp',
        ...input,
        createdAt: new Date(),
      };
      setState(success([optimisticLink, ...currentLinks]));

      const result = await service.create(input, subscriptionPlan);

      if (!isMountedRef.current) return false;

      if (result.success) {
        // Replace optimistic link with real link
        const updatedLinks = currentLinks.map(link => (link.id === 'temp' ? result.value : link));
        // If optimistic wasn't in currentLinks, add it
        if (!currentLinks.find(l => l.id === 'temp')) {
          updatedLinks.unshift(result.value);
        }
        setState(success(updatedLinks));
        onSuccess?.(updatedLinks);
        return true;
      } else {
        // Rollback optimistic update
        setState(success(currentLinks));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'usePhotoTags',
            'createPhotoTagLink',
            undefined,
            input.projectId,
          ),
        );
        onError?.(result.error);
        return false;
      }
    },
    [subscriptionPlan, service, handleError, onSuccess, onError],
  );

  const updatePhotoTagLink = useCallback(
    async (id: string, updates: PhotoTagLinkUpdate): Promise<boolean> => {
      const currentLinks = stateRef.current.status === 'success' ? stateRef.current.data : [];

      // Optimistic update
      const optimisticLinks = currentLinks.map(link =>
        link.id === id ? { ...link, ...updates } : link,
      );
      setState(success(optimisticLinks));

      const result = await service.update(id, updates);

      if (!isMountedRef.current) return false;

      if (result.success) {
        // Refresh to get latest data
        if (projectId) {
          await getPhotoTagLinksByProject(projectId);
        } else {
          await getAllPhotoTagLinks();
        }
        return true;
      } else {
        // Rollback optimistic update
        setState(success(currentLinks));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('usePhotoTags', 'updatePhotoTagLink', undefined, undefined, {
            linkId: id,
          }),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, handleError, onError, getAllPhotoTagLinks, getPhotoTagLinksByProject],
  );

  const deletePhotoTagLink = useCallback(
    async (id: string): Promise<boolean> => {
      const currentLinks = stateRef.current.status === 'success' ? stateRef.current.data : [];

      // Optimistic update
      const optimisticLinks = currentLinks.filter(link => link.id !== id);
      setState(success(optimisticLinks));

      const result = await service.delete(id);

      if (!isMountedRef.current) return false;

      if (result.success) {
        setState(success(optimisticLinks));
        onSuccess?.(optimisticLinks);
        return true;
      } else {
        // Rollback optimistic update
        setState(success(currentLinks));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('usePhotoTags', 'deletePhotoTagLink', undefined, undefined, {
            linkId: id,
          }),
        );
        onError?.(result.error);
        return false;
      }
    },
    [service, handleError, onSuccess, onError],
  );

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  const refresh = useCallback(async () => {
    if (projectId) {
      await getPhotoTagLinksByProject(projectId);
    } else {
      await getAllPhotoTagLinks();
    }
  }, [projectId, getAllPhotoTagLinks, getPhotoTagLinksByProject]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || []));
    }
  }, [state]);

  return {
    photoTagLinks: state.status === 'success' ? state.data : [],
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    getAllPhotoTagLinks,
    getPhotoTagLinksByProject,
    getPhotoTagLinkById,
    createPhotoTagLink,
    updatePhotoTagLink,
    deletePhotoTagLink,
    refresh,
    clearError,
    canShare: service.canShare(subscriptionPlan),
  };
}
