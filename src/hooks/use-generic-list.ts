/*---------------------------------------
File: src/hooks/use-list.ts
Description: Generic list hook for all list types with optimistic updates
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
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
// import { useOptimisticUpdate } from '@/hooks/use-optimistic-update';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
// import { ErrorMapper } from '@/utils/error-mapper';
// import { ErrorCode } from '@/constants/error-code-registry';
import {
  ListBaseItem,
  ListBaseConfig,
  ListBaseCategory,
  ListBasePendingUpdate,
} from '@/domain/common/list-base.schema';
import { Result } from '@/domain/common/result';

/**
 * Generic list constraint - all lists must follow this structure
 */
export interface GenericList<TItem extends ListBaseItem = ListBaseItem> {
  config: ListBaseConfig & { totalItems: number };
  items: TItem[];
  categories?: ListBaseCategory[];
  pendingUpdates?: ListBasePendingUpdate[];
}

/**
 * Generic list service interface - all list services must implement this
 */
export interface IListService<TList extends GenericList, TItem extends ListBaseItem> {
  // Master operations
  getMaster(): Promise<Result<TList, AppError>>;

  // User operations
  getUserList(userId: string): Promise<Result<TList, AppError>>;
  saveUserList(userId: string, list: TList): Promise<Result<void, AppError>>;
  createOrResetUserList(userId: string, sourceList: TList): Promise<Result<void, AppError>>;
  deleteUserList(userId: string): Promise<Result<void, AppError>>;

  // User item operations
  addUserItem(userId: string, item: TItem): Promise<Result<TItem, AppError>>;
  deleteUserItem(userId: string, itemId: string): Promise<Result<void, AppError>>;
  batchUpdateUserItems(
    userId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>>;
  batchDeleteUserItems(userId: string, itemIds: string[]): Promise<Result<void, AppError>>;

  // Project operations
  getProjectList(projectId: string): Promise<Result<TList, AppError>>;
  saveProjectList(projectId: string, list: TList): Promise<Result<void, AppError>>;
  createOrResetProjectList(
    userId: string,
    projectId: string,
    sourceList: TList,
  ): Promise<Result<void, AppError>>;
  deleteProjectList(projectId: string): Promise<Result<void, AppError>>;

  // Project item operations
  addProjectItem(projectId: string, item: TItem): Promise<Result<TItem, AppError>>;
  deleteProjectItem(projectId: string, itemId: string): Promise<Result<void, AppError>>;
  batchUpdateProjectItems(
    projectId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>>;
  batchDeleteProjectItems(projectId: string, itemIds: string[]): Promise<Result<void, AppError>>;

  // Real-time subscriptions
  subscribeToUserList?(
    userId: string,
    onUpdate: (result: Result<TList | null, AppError>) => void,
  ): () => void;
  subscribeToProjectList?(
    projectId: string,
    onUpdate: (result: Result<TList | null, AppError>) => void,
  ): () => void;
}

export interface UseListOptions {
  userId?: string | null;
  projectId?: string | null;
  autoFetch?: boolean;
  enableRealtime?: boolean;
  onSuccess?: <TList extends GenericList>(list: TList | null) => void;
  onError?: (error: AppError) => void;
  customOperations?: Record<string, (...args: unknown[]) => unknown>;
}

export interface UseListResult<TList extends GenericList, TItem extends ListBaseItem> {
  list: TList | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<TList | null>;

  // Master operations
  getMaster: () => Promise<void>;

  // User operations
  getUserList: () => Promise<void>;
  saveUserList: (list: TList) => Promise<boolean>;
  createOrResetUserList: (sourceList: TList) => Promise<boolean>;
  deleteUserList: () => Promise<boolean>;

  // User item operations
  addUserItem: (item: TItem) => Promise<boolean>;
  deleteUserItem: (itemId: string) => Promise<boolean>;
  batchUpdateUserItems: (updates: Array<{ id: string } & Partial<TItem>>) => Promise<boolean>;
  batchDeleteUserItems: (itemIds: string[]) => Promise<boolean>;

  // Project operations
  getProjectList: () => Promise<void>;
  saveProjectList: (list: TList) => Promise<boolean>;
  createOrResetProjectList: (sourceList: TList) => Promise<boolean>;
  deleteProjectList: () => Promise<boolean>;

  // Project item operations
  addProjectItem: (item: TItem) => Promise<boolean>;
  deleteProjectItem: (itemId: string) => Promise<boolean>;
  batchUpdateProjectItems: (updates: Array<{ id: string } & Partial<TItem>>) => Promise<boolean>;
  batchDeleteProjectItems: (itemIds: string[]) => Promise<boolean>;

  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;

  // Custom operations (merged from options)
  [key: string]: unknown;
}

/**
 * Generic hook for managing any list type with optimistic updates
 * Works with TaskList, KitList, CoupleShotList, GroupShotList, etc.
 *
 * @param hookName - Name for error context (e.g., 'useTaskList')
 * @param service - Service implementing IListService
 * @param options - Configuration options
 * @returns Object with list state and operations
 */
export function useList<TList extends GenericList, TItem extends ListBaseItem>(
  hookName: string,
  service: IListService<TList, TItem>,
  options: UseListOptions = {},
): UseListResult<TList, TItem> {
  const {
    userId,
    projectId,
    autoFetch = false,
    enableRealtime = false,
    onSuccess,
    onError,
    customOperations = {},
  } = options;

  const [state, setState] = useState<LoadingState<TList | null>>(
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

  const currentList = state.status === 'success' ? state.data : null;

  // ============================================================================
  // MASTER OPERATIONS
  // ============================================================================

  const getMaster = useCallback(async () => {
    setState(loading(getCurrentData(state)));

    const result = await service.getMaster();

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(result.error, ErrorContextBuilder.fromHook(hookName, 'getMaster'));
      onError?.(result.error);
    }
  }, [hookName, service, handleError, onSuccess, onError, state]);

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  const getUserList = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(loading(getCurrentData(state)));

    const result = await service.getUserList(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(result.error, ErrorContextBuilder.fromHook(hookName, 'getUserList', userId));
      onError?.(result.error);
    }
  }, [hookName, userId, service, handleError, onSuccess, onError, state]);

  const saveUserList = useCallback(
    async (list: TList): Promise<boolean> => {
      if (!userId) return false;

      setState(success(list));

      const result = await service.saveUserList(userId, list);

      if (!isMountedRef.current) return false;

      if (result.success) {
        const freshResult = await service.getUserList(userId);
        if (freshResult.success) {
          setState(success(freshResult.value));
          onSuccess?.(freshResult.value);
        }
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(result.error, ErrorContextBuilder.fromHook(hookName, 'saveUserList', userId));
        onError?.(result.error);
        return false;
      }
    },
    [hookName, userId, service, handleError, onSuccess, onError],
  );

  const createOrResetUserList = useCallback(
    async (sourceList: TList): Promise<boolean> => {
      if (!userId) return false;

      setState(loading(getCurrentData(state)));

      const result = await service.createOrResetUserList(userId, sourceList);

      if (!isMountedRef.current) return false;

      if (result.success) {
        const freshResult = await service.getUserList(userId);
        if (freshResult.success) {
          setState(success(freshResult.value));
          onSuccess?.(freshResult.value);
        }
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'createOrResetUserList', userId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, userId, service, handleError, onSuccess, onError, state],
  );

  const deleteUserList = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setState(loading(getCurrentData(state)));

    const result = await service.deleteUserList(userId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      setState(success(null));
      return true;
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(result.error, ErrorContextBuilder.fromHook(hookName, 'deleteUserList', userId));
      onError?.(result.error);
      return false;
    }
  }, [hookName, userId, service, handleError, onError, state]);

  // ============================================================================
  // USER ITEM OPERATIONS
  // ============================================================================

  const addUserItem = useCallback(
    async (item: TItem): Promise<boolean> => {
      if (!userId || !currentList) return false;

      // Optimistic update
      const optimisticList = {
        ...currentList,
        items: [...currentList.items, item],
        config: {
          ...currentList.config,
          totalItems: currentList.config.totalItems + 1,
        },
      } as TList;
      setState(success(optimisticList));

      const result = await service.addUserItem(userId, item);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getUserList();
        return true;
      } else {
        setState(success(currentList));
        handleError(result.error, ErrorContextBuilder.fromHook(hookName, 'addUserItem', userId));
        onError?.(result.error);
        return false;
      }
    },
    [hookName, userId, currentList, service, getUserList, handleError, onError],
  );

  const deleteUserItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!userId || !currentList) return false;

      const optimisticList = {
        ...currentList,
        items: currentList.items.filter(item => item.id !== itemId),
        config: {
          ...currentList.config,
          totalItems: Math.max(0, currentList.config.totalItems - 1),
        },
      } as TList;
      setState(success(optimisticList));

      const result = await service.deleteUserItem(userId, itemId);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getUserList();
        return true;
      } else {
        setState(success(currentList));
        handleError(result.error, ErrorContextBuilder.fromHook(hookName, 'deleteUserItem', userId));
        onError?.(result.error);
        return false;
      }
    },
    [hookName, userId, currentList, service, getUserList, handleError, onError],
  );

  const batchUpdateUserItems = useCallback(
    async (updates: Array<{ id: string } & Partial<TItem>>): Promise<boolean> => {
      if (!userId || !currentList) return false;

      const optimisticList = {
        ...currentList,
        items: currentList.items.map(item => {
          const update = updates.find(u => u.id === item.id);
          return update ? { ...item, ...update } : item;
        }),
      } as TList;
      setState(success(optimisticList));

      const result = await service.batchUpdateUserItems(userId, updates);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getUserList();
        return true;
      } else {
        setState(success(currentList));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'batchUpdateUserItems', userId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, userId, currentList, service, getUserList, handleError, onError],
  );

  const batchDeleteUserItems = useCallback(
    async (itemIds: string[]): Promise<boolean> => {
      if (!userId || !currentList) return false;

      const optimisticList = {
        ...currentList,
        items: currentList.items.filter(item => !itemIds.includes(item.id)),
        config: {
          ...currentList.config,
          totalItems: Math.max(0, currentList.config.totalItems - itemIds.length),
        },
      } as TList;
      setState(success(optimisticList));

      const result = await service.batchDeleteUserItems(userId, itemIds);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getUserList();
        return true;
      } else {
        setState(success(currentList));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'batchDeleteUserItems', userId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, userId, currentList, service, getUserList, handleError, onError],
  );

  // ============================================================================
  // PROJECT OPERATIONS
  // ============================================================================

  const getProjectList = useCallback(async () => {
    if (!projectId) {
      setState(idle());
      return;
    }

    setState(loading(getCurrentData(state)));

    const result = await service.getProjectList(projectId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook(hookName, 'getProjectList', undefined, projectId),
      );
      onError?.(result.error);
    }
  }, [hookName, projectId, service, handleError, onSuccess, onError, state]);

  const saveProjectList = useCallback(
    async (list: TList): Promise<boolean> => {
      if (!projectId) return false;

      setState(success(list));

      const result = await service.saveProjectList(projectId, list);

      if (!isMountedRef.current) return false;

      if (result.success) {
        const freshResult = await service.getProjectList(projectId);
        if (freshResult.success) {
          setState(success(freshResult.value));
          onSuccess?.(freshResult.value);
        }
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'saveProjectList', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, projectId, service, handleError, onSuccess, onError],
  );

  const createOrResetProjectList = useCallback(
    async (sourceList: TList): Promise<boolean> => {
      if (!projectId || !userId) return false;

      setState(loading(getCurrentData(state)));

      const result = await service.createOrResetProjectList(userId, projectId, sourceList);

      if (!isMountedRef.current) return false;

      if (result.success) {
        const freshResult = await service.getProjectList(projectId);
        if (freshResult.success) {
          setState(success(freshResult.value));
          onSuccess?.(freshResult.value);
        }
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'createOrResetProjectList', userId, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, userId, projectId, service, handleError, onSuccess, onError, state],
  );

  const deleteProjectList = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;

    setState(loading(getCurrentData(state)));

    const result = await service.deleteProjectList(projectId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      setState(success(null));
      return true;
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook(hookName, 'deleteProjectList', undefined, projectId),
      );
      onError?.(result.error);
      return false;
    }
  }, [hookName, projectId, service, handleError, onError, state]);

  // ============================================================================
  // PROJECT ITEM OPERATIONS
  // ============================================================================

  const addProjectItem = useCallback(
    async (item: TItem): Promise<boolean> => {
      if (!projectId || !currentList) return false;

      const optimisticList = {
        ...currentList,
        items: [...currentList.items, item],
        config: {
          ...currentList.config,
          totalItems: currentList.config.totalItems + 1,
        },
      } as TList;
      setState(success(optimisticList));

      const result = await service.addProjectItem(projectId, item);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getProjectList();
        return true;
      } else {
        setState(success(currentList));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'addProjectItem', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, projectId, currentList, service, getProjectList, handleError, onError],
  );

  const deleteProjectItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!projectId || !currentList) return false;

      const optimisticList = {
        ...currentList,
        items: currentList.items.filter(item => item.id !== itemId),
        config: {
          ...currentList.config,
          totalItems: Math.max(0, currentList.config.totalItems - 1),
        },
      } as TList;
      setState(success(optimisticList));

      const result = await service.deleteProjectItem(projectId, itemId);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getProjectList();
        return true;
      } else {
        setState(success(currentList));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'deleteProjectItem', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, projectId, currentList, service, getProjectList, handleError, onError],
  );

  const batchUpdateProjectItems = useCallback(
    async (updates: Array<{ id: string } & Partial<TItem>>): Promise<boolean> => {
      if (!projectId || !currentList) return false;

      const optimisticList = {
        ...currentList,
        items: currentList.items.map(item => {
          const update = updates.find(u => u.id === item.id);
          return update ? { ...item, ...update } : item;
        }),
      } as TList;
      setState(success(optimisticList));

      const result = await service.batchUpdateProjectItems(projectId, updates);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getProjectList();
        return true;
      } else {
        setState(success(currentList));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'batchUpdateProjectItems', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, projectId, currentList, service, getProjectList, handleError, onError],
  );

  const batchDeleteProjectItems = useCallback(
    async (itemIds: string[]): Promise<boolean> => {
      if (!projectId || !currentList) return false;

      const optimisticList = {
        ...currentList,
        items: currentList.items.filter(item => !itemIds.includes(item.id)),
        config: {
          ...currentList.config,
          totalItems: Math.max(0, currentList.config.totalItems - itemIds.length),
        },
      } as TList;
      setState(success(optimisticList));

      const result = await service.batchDeleteProjectItems(projectId, itemIds);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getProjectList();
        return true;
      } else {
        setState(success(currentList));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(hookName, 'batchDeleteProjectItems', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [hookName, projectId, currentList, service, getProjectList, handleError, onError],
  );

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!enableRealtime) return;

    if (projectId && service.subscribeToProjectList) {
      unsubscribeRef.current = service.subscribeToProjectList(projectId, result => {
        if (!isMountedRef.current) return;

        if (result.success) {
          setState(success(result.value));
          onSuccess?.(result.value);
        } else {
          setState(prevState => errorState(result.error, getCurrentData(prevState)));
          handleError(
            result.error,
            ErrorContextBuilder.fromHook(hookName, 'subscribeToProjectList', undefined, projectId),
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
    } else if (userId && service.subscribeToUserList) {
      unsubscribeRef.current = service.subscribeToUserList(userId, result => {
        if (!isMountedRef.current) return;

        if (result.success) {
          setState(success(result.value));
          onSuccess?.(result.value);
        } else {
          setState(prevState => errorState(result.error, getCurrentData(prevState)));
          handleError(
            result.error,
            ErrorContextBuilder.fromHook(hookName, 'subscribeToUserList', userId),
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
    }
  }, [hookName, userId, projectId, enableRealtime, service, handleError, onSuccess, onError]);

  // ============================================================================
  // AUTO-FETCH
  // ============================================================================

  useEffect(() => {
    if (autoFetch && !enableRealtime) {
      if (projectId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        getProjectList();
      } else if (userId) {
        getUserList();
      }
    }
  }, [autoFetch, enableRealtime, userId, projectId, getProjectList, getUserList]);

  // ============================================================================
  // UTILITY
  // ============================================================================

  const refresh = useCallback(async () => {
    if (projectId) {
      await getProjectList();
    } else if (userId) {
      await getUserList();
    }
  }, [userId, projectId, getProjectList, getUserList]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  return {
    list: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    // Master
    getMaster,
    // User
    getUserList,
    saveUserList,
    createOrResetUserList,
    deleteUserList,
    // User items
    addUserItem,
    deleteUserItem,
    batchUpdateUserItems,
    batchDeleteUserItems,
    // Project
    getProjectList,
    saveProjectList,
    createOrResetProjectList,
    deleteProjectList,
    // Project items
    addProjectItem,
    deleteProjectItem,
    batchUpdateProjectItems,
    batchDeleteProjectItems,
    // Utility
    refresh,
    clearError,
    // Custom operations (merged from options)
    ...customOperations,
  };
}
