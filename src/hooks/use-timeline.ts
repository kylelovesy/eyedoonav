/*---------------------------------------
File: src/hooks/use-timeline.ts
Description: Timeline-specific hook (project-only, no master/user lists)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import { TimelineList, TimelineEvent, TimelineEventInput } from '@/domain/project/timeline.schema';
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
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { BaseTimelineService } from '@/services/base-timeline-service';
import { TimelineEventStatus, TimelineEventType } from '@/constants/enums';

interface UseTimelineOptions {
  projectId: string; // Required - timelines only exist in projects
  autoFetch?: boolean;
  enableRealtime?: boolean; // For collaborative editing
  onSuccess?: (timeline: TimelineList | null) => void;
  onError?: (error: AppError) => void;
}

interface UseTimelineResult {
  timeline: TimelineList | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<TimelineList | null>;

  // Timeline operations (project-only)
  getTimeline: () => Promise<void>;
  saveTimeline: (timeline: TimelineList) => Promise<boolean>;
  createTimeline: (initialTimeline?: TimelineList) => Promise<boolean>;
  deleteTimeline: () => Promise<boolean>;

  // Event operations
  addEvent: (event: TimelineEventInput) => Promise<boolean>;
  updateEvent: (eventId: string, updates: Partial<TimelineEvent>) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  batchUpdateEvents: (updates: Array<{ id: string } & Partial<TimelineEvent>>) => Promise<boolean>;
  batchDeleteEvents: (eventIds: string[]) => Promise<boolean>;

  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing project timelines (no master/user lists)
 * Timeline is a simple project subcollection: config + events array
 *
 * @param service - TimelineService instance
 * @param options - Configuration options (projectId required)
 * @returns Object with timeline state and operations
 */
export function useTimeline(
  service: BaseTimelineService,
  options: UseTimelineOptions,
): UseTimelineResult {
  const { projectId, autoFetch = false, enableRealtime = false, onSuccess, onError } = options;

  const [state, setState] = useState<LoadingState<TimelineList | null>>(
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const currentTimeline = state.status === 'success' ? state.data : null;

  // ============================================================================
  // TIMELINE OPERATIONS (Project-only)
  // ============================================================================

  const getTimeline = useCallback(async () => {
    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.getProjectTimeline(projectId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useTimeline', 'getTimeline', undefined, projectId),
      );
      onError?.(result.error);
    }
  }, [projectId, service, handleError, onSuccess, onError]);

  const saveTimeline = useCallback(
    async (timeline: TimelineList): Promise<boolean> => {
      // Optimistic update
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      setState(success(timeline));

      const result = await service.saveProjectTimeline(projectId, timeline);

      if (!isMountedRef.current) return false;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useTimeline', 'saveTimeline', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, handleError, onSuccess, onError],
  );

  const createTimeline = useCallback(
    async (initialTimeline?: TimelineList): Promise<boolean> => {
      setState(prevState => loading(getCurrentData(prevState)));

      const result = await service.createProjectTimeline(projectId, initialTimeline);

      if (!isMountedRef.current) return false;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useTimeline', 'createTimeline', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, handleError, onSuccess, onError],
  );

  const deleteTimeline = useCallback(async (): Promise<boolean> => {
    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.deleteProjectTimeline(projectId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      setState(success(null));
      return true;
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useTimeline', 'deleteTimeline', undefined, projectId),
      );
      onError?.(result.error);
      return false;
    }
  }, [projectId, service, handleError, onError]);

  // ============================================================================
  // EVENT OPERATIONS
  // ============================================================================

  const addEvent = useCallback(
    async (eventInput: TimelineEventInput): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticEvent: TimelineEvent = {
        ...eventInput,
        id: 'temp-' + Date.now(), // Temporary ID for optimistic update
        itemName: eventInput.itemName,
        itemDescription: eventInput.itemDescription || '',
        type: eventInput.type || TimelineEventType.OTHER,
        description: eventInput.description,
        notes: eventInput.notes,
        status: eventInput.status || TimelineEventStatus.SCHEDULED,
        startTime: eventInput.startTime,
        endTime: eventInput.endTime,
        duration: eventInput.duration,
        locationId: undefined,
        createdBy: undefined,
        updatedBy: undefined,
        notification: eventInput.notification,
        weather: undefined,
        isCustom: false,
        isChecked: false,
        isDisabled: false,
      };

      const optimisticTimeline: TimelineList = {
        ...currentData,
        items: [...currentData.items, optimisticEvent],
        config: {
          ...currentData.config,
          totalItems: currentData.config.totalItems + 1,
          totalEvents: (currentData.config.totalEvents || 0) + 1,
        },
      };
      setState(success(optimisticTimeline));

      const result = await service.addEvent(projectId, eventInput);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getTimeline();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useTimeline', 'addEvent', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, getTimeline, handleError, onError],
  );

  const updateEvent = useCallback(
    async (eventId: string, updates: Partial<TimelineEvent>): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticTimeline: TimelineList = {
        ...currentData,
        items: currentData.items.map(item =>
          item.id === eventId ? { ...item, ...updates } : item,
        ),
      };
      setState(success(optimisticTimeline));

      const result = await service.updateEvent(projectId, eventId, updates);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getTimeline();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useTimeline', 'updateEvent', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, getTimeline, handleError, onError],
  );

  const deleteEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticTimeline: TimelineList = {
        ...currentData,
        items: currentData.items.filter(item => item.id !== eventId),
        config: {
          ...currentData.config,
          totalItems: Math.max(0, currentData.config.totalItems - 1),
          totalEvents: Math.max(0, (currentData.config.totalEvents || 0) - 1),
        },
      };
      setState(success(optimisticTimeline));

      const result = await service.deleteEvent(projectId, eventId);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getTimeline();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useTimeline', 'deleteEvent', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, getTimeline, handleError, onError],
  );

  const batchUpdateEvents = useCallback(
    async (updates: Array<{ id: string } & Partial<TimelineEvent>>): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticTimeline: TimelineList = {
        ...currentData,
        items: currentData.items.map(item => {
          const update = updates.find(u => u.id === item.id);
          return update ? { ...item, ...update } : item;
        }),
      };
      setState(success(optimisticTimeline));

      const result = await service.batchUpdateEvents(projectId, updates);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getTimeline();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useTimeline', 'batchUpdateEvents', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, getTimeline, handleError, onError],
  );

  const batchDeleteEvents = useCallback(
    async (eventIds: string[]): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticTimeline: TimelineList = {
        ...currentData,
        items: currentData.items.filter(item => !eventIds.includes(item.id)),
        config: {
          ...currentData.config,
          totalItems: Math.max(0, currentData.config.totalItems - eventIds.length),
          totalEvents: Math.max(0, (currentData.config.totalEvents || 0) - eventIds.length),
        },
      };
      setState(success(optimisticTimeline));

      const result = await service.batchDeleteEvents(projectId, eventIds);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getTimeline();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useTimeline', 'batchDeleteEvents', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, getTimeline, handleError, onError],
  );

  // ============================================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    if (!enableRealtime) return;

    unsubscribeRef.current = service.subscribeToProjectTimeline(projectId, result => {
      if (!isMountedRef.current) return;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'useTimeline',
            'subscribeToProjectTimeline',
            undefined,
            projectId,
          ),
        );
        onError?.(result.error);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [projectId, enableRealtime, service, handleError, onSuccess, onError]);

  // ============================================================================
  // AUTO-FETCH
  // ============================================================================

  // useEffect(() => {
  //   if (autoFetch && !enableRealtime) {
  //     getTimeline();
  //   }
  // }, [autoFetch, enableRealtime, getTimeline]);

  // ============================================================================
  // UTILITY
  // ============================================================================

  const refresh = useCallback(() => getTimeline(), [getTimeline]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  return {
    timeline: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    // Timeline operations
    getTimeline,
    saveTimeline,
    createTimeline,
    deleteTimeline,
    // Event operations
    addEvent,
    updateEvent,
    deleteEvent,
    batchUpdateEvents,
    batchDeleteEvents,
    // Utility
    refresh,
    clearError,
  };
}
