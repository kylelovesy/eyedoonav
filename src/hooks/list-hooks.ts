import { useCallback } from 'react';
import { useList, UseListOptions, UseListResult } from '@/hooks/use-generic-list';
import { useErrorHandler } from './use-error-handler';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import {
  taskListService,
  kitListService,
  coupleShotListService,
  groupShotListService,
  noteListService,
  vendorListService,
  tagListService,
  photoRequestListService,
  keyPeopleListService,
} from '@/services/ServiceFactory';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';
import { SubscriptionPlan } from '@/constants/enums';

// Task List
import { TaskList, TaskItem } from '@/domain/user/task.schema';

// Kit List
import { KitList, KitItem } from '@/domain/user/kit.schema';

// Couple Shot List
import { CoupleShotList, CoupleShotItem } from '@/domain/user/shots.schema';

// Group Shot List
import { GroupShotList, GroupShotItem } from '@/domain/user/shots.schema';

// Note List
import { NoteList, NoteItem } from '@/domain/scoped/notes.schema';
import { INotesService } from '@/services/notes-service';

// Vendor List
import { VendorList, VendorItem } from '@/domain/scoped/vendor.schema';

// Tag List
import { TagList, TagItem } from '@/domain/scoped/tag.schema';

// Photo Request List
import {
  PhotoRequestList,
  PhotoRequestItem,
  PhotoRequestConfig,
} from '@/domain/project/photo-request.schema';
import { IPhotoRequestService, PhotoRequestStats } from '@/services/photo-request-service';

// Key People List
import { KeyPeopleList, KeyPeopleItem, KeyPeopleConfig } from '@/domain/project/key-people.schema';
import { IKeyPeopleService, KeyPeopleStats } from '@/services/key-people-service';

/**
 * Hook for managing Task Lists
 */
export function useTaskList(options?: UseListOptions): UseListResult<TaskList, TaskItem> {
  return useList<TaskList, TaskItem>('useTaskList', taskListService, options);
}

/**
 * Hook for managing Kit Lists
 */
export function useKitList(options?: UseListOptions): UseListResult<KitList, KitItem> {
  return useList<KitList, KitItem>('useKitList', kitListService, options);
}

/**
 * Hook for managing Couple Shot Lists
 */
export function useCoupleShotList(
  options?: UseListOptions,
): UseListResult<CoupleShotList, CoupleShotItem> {
  return useList<CoupleShotList, CoupleShotItem>(
    'useCoupleShotList',
    coupleShotListService,
    options,
  );
}

/**
 * Hook for managing Group Shot Lists
 */
export function useGroupShotList(
  options?: UseListOptions,
): UseListResult<GroupShotList, GroupShotItem> {
  return useList<GroupShotList, GroupShotItem>('useGroupShotList', groupShotListService, options);
}

/**
 * Hook for managing Note Lists with custom operations (togglePinned, toggleRead)
 */
export interface UseNoteListOptions extends UseListOptions {
  subscriptionPlan?: SubscriptionPlan;
  role?: 'client' | 'photographer';
}

export interface UseNoteListResult extends UseListResult<NoteList, NoteItem> {
  togglePinned: (noteId: string, isPinned: boolean) => Promise<boolean>;
  toggleRead: (noteId: string, isRead: boolean) => Promise<boolean>;
}

export function useNoteList(options?: UseNoteListOptions): UseNoteListResult {
  const { subscriptionPlan, role, ...listOptions } = options || {};
  const { handleError } = useErrorHandler();

  // NoteListService extends ListService, so it already implements IListService
  const service = noteListService as unknown as INotesService;
  const listHook = useList<NoteList, NoteItem>('useNoteList', noteListService, listOptions);

  // Custom operations
  const togglePinned = useCallback(
    async (noteId: string, isPinned: boolean): Promise<boolean> => {
      if (!listHook.list) return false;
      const result = await service.togglePinned(
        listOptions.userId || undefined,
        listOptions.projectId || undefined,
        noteId,
        isPinned,
      );
      if (result.success) {
        if (listOptions.projectId) {
          await listHook.getProjectList();
        } else if (listOptions.userId) {
          await listHook.getUserList();
        }
        return true;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'useNoteList',
            'togglePinned',
            listOptions.userId ?? '',
            listOptions.projectId ?? '',
          ),
        );
        listOptions.onError?.(result.error);
        return false;
      }
    },
    [service, listHook, listOptions, handleError],
  );

  const toggleRead = useCallback(
    async (noteId: string, isRead: boolean): Promise<boolean> => {
      if (!listHook.list) return false;
      const result = await service.toggleRead(
        listOptions.userId || undefined,
        listOptions.projectId || undefined,
        noteId,
        isRead,
      );
      if (result.success) {
        if (listOptions.projectId) {
          await listHook.getProjectList();
        } else if (listOptions.userId) {
          await listHook.getUserList();
        }
        return true;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'useNoteList',
            'toggleRead',
            listOptions.userId ?? '',
            listOptions.projectId ?? '',
          ),
        );
        listOptions.onError?.(result.error);
        return false;
      }
    },
    [service, listHook, listOptions, handleError],
  );

  return {
    ...listHook,
    togglePinned,
    toggleRead,
  };
}

/**
 * Hook for managing Vendor Lists
 */
export function useVendorList(options?: UseListOptions): UseListResult<VendorList, VendorItem> {
  return useList<VendorList, VendorItem>('useVendorList', vendorListService, options);
}

/**
 * Hook for managing Tag Lists
 */
export function useTagList(options?: UseListOptions): UseListResult<TagList, TagItem> {
  return useList<TagList, TagItem>('useTagList', tagListService, options);
}

/**
 * Hook for managing Photo Request Lists with custom operations (uploadReferenceImage, deleteReferenceImage, getStats, updateConfig)
 */
export interface UsePhotoRequestListOptions extends UseListOptions {
  subscriptionPlan?: SubscriptionPlan;
}

export interface UsePhotoRequestListResult
  extends UseListResult<PhotoRequestList, PhotoRequestItem> {
  uploadReferenceImage: (itemId: string, imageBlob: Blob) => Promise<boolean>;
  deleteReferenceImage: (itemId: string, imageUrl: string) => Promise<boolean>;
  updateConfig: (updates: Partial<PhotoRequestConfig>) => Promise<boolean>;
  getStats: (list: PhotoRequestList) => PhotoRequestStats;
}

export function usePhotoRequestList(
  options?: UsePhotoRequestListOptions,
): UsePhotoRequestListResult {
  const { subscriptionPlan, ...listOptions } = options || {};
  const { handleError } = useErrorHandler();

  // PhotoRequestListService extends ListService, so it already implements IListService
  const service = photoRequestListService as unknown as IPhotoRequestService;
  const listHook = useList<PhotoRequestList, PhotoRequestItem>(
    'usePhotoRequestList',
    photoRequestListService,
    listOptions,
  );

  // Custom operations
  const uploadReferenceImage = useCallback(
    async (itemId: string, imageBlob: Blob): Promise<boolean> => {
      if (!listOptions.projectId || !subscriptionPlan) {
        const context = ErrorContextBuilder.fromHook(
          'usePhotoRequestList',
          'uploadReferenceImage',
          undefined,
          listOptions.projectId ?? '',
        );
        const contextString = ErrorContextBuilder.toString(context);

        const error = ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Missing required parameters',
          'Project ID and subscription plan are required to upload reference images.',
          contextString,
          {
            missingProjectId: !listOptions.projectId,
            missingSubscriptionPlan: !subscriptionPlan,
          },
          false, // not retryable
        );

        handleError(error, context);
        return false;
      }
      const result = await service.uploadReferenceImage(
        listOptions.projectId,
        itemId,
        imageBlob,
        subscriptionPlan,
      );
      if (result.success) {
        await listHook.getProjectList();
        return true;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'usePhotoRequestList',
            'uploadReferenceImage',
            undefined,
            listOptions.projectId ?? '',
          ),
        );
        listOptions.onError?.(result.error);
        return false;
      }
    },
    [service, listHook, listOptions, subscriptionPlan, handleError],
  );

  const deleteReferenceImage = useCallback(
    async (itemId: string, imageUrl: string): Promise<boolean> => {
      if (!listOptions.projectId) return false;
      const result = await service.deleteReferenceImage(listOptions.projectId, itemId, imageUrl);
      if (result.success) {
        await listHook.getProjectList();
        return true;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'usePhotoRequestList',
            'deleteReferenceImage',
            undefined,
            listOptions.projectId ?? '',
          ),
        );
        listOptions.onError?.(result.error);
        return false;
      }
    },
    [service, listHook, listOptions, handleError],
  );

  const updateConfig = useCallback(
    async (updates: Partial<PhotoRequestConfig>): Promise<boolean> => {
      if (!listOptions.projectId) return false;
      const result = await service.updateConfig(listOptions.projectId, updates);
      if (result.success) {
        await listHook.getProjectList();
        return true;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'usePhotoRequestList',
            'updateConfig',
            undefined,
            listOptions.projectId ?? '',
          ),
        );
        listOptions.onError?.(result.error);
        return false;
      }
    },
    [service, listHook, listOptions, handleError],
  );

  const getStats = useCallback(
    (list: PhotoRequestList): PhotoRequestStats => {
      return service.getStats(list);
    },
    [service],
  );

  return {
    ...listHook,
    uploadReferenceImage,
    deleteReferenceImage,
    updateConfig,
    getStats,
  };
}

/**
 * Hook for managing Key People Lists with custom operations (uploadAvatar, deleteAvatar, getStats, updateConfig)
 */
export interface UseKeyPeopleListOptions extends UseListOptions {
  subscriptionPlan?: SubscriptionPlan;
}

export interface UseKeyPeopleListResult extends UseListResult<KeyPeopleList, KeyPeopleItem> {
  uploadAvatar: (itemId: string, imageBlob: Blob) => Promise<boolean>;
  deleteAvatar: (itemId: string, imageUrl: string) => Promise<boolean>;
  updateConfig: (updates: Partial<KeyPeopleConfig>) => Promise<boolean>;
  getStats: (list: KeyPeopleList) => KeyPeopleStats;
}
export function useKeyPeopleList(options?: UseKeyPeopleListOptions): UseKeyPeopleListResult {
  const { subscriptionPlan, ...listOptions } = options || {};
  const { handleError } = useErrorHandler();
  const service = keyPeopleListService as IKeyPeopleService;
  const listHook = useList<KeyPeopleList, KeyPeopleItem>(
    'useKeyPeopleList',
    keyPeopleListService,
    listOptions,
  );

  const uploadAvatar = useCallback(
    async (itemId: string, imageBlob: Blob): Promise<boolean> => {
      if (!listOptions.projectId || !subscriptionPlan) return false;
      const result = await service.uploadAvatar(
        listOptions.projectId,
        itemId,
        imageBlob,
        subscriptionPlan,
      );
      if (result.success) {
        await listHook.getProjectList();
        return true;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'useKeyPeopleList',
            'uploadAvatar',
            undefined,
            listOptions.projectId ?? '',
          ),
        );
        listOptions.onError?.(result.error);
        return false;
      }
    },
    [service, listHook, listOptions, subscriptionPlan, handleError],
  );

  const deleteAvatar = useCallback(
    async (itemId: string, imageUrl: string): Promise<boolean> => {
      if (!listOptions.projectId) return false;
      const result = await service.deleteAvatar(listOptions.projectId, itemId, imageUrl);
      if (result.success) {
        await listHook.getProjectList();
        return true;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'useKeyPeopleList',
            'deleteAvatar',
            undefined,
            listOptions.projectId ?? '',
          ),
        );
        listOptions.onError?.(result.error);
        return false;
      }
    },
    [service, listHook, listOptions, handleError],
  );

  const updateConfig = useCallback(
    async (updates: Partial<KeyPeopleConfig>): Promise<boolean> => {
      if (!listOptions.projectId) return false;
      const result = await service.updateConfig(listOptions.projectId, updates);
      if (result.success) {
        await listHook.getProjectList();
        return true;
      } else {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook(
            'useKeyPeopleList',
            'updateConfig',
            undefined,
            listOptions.projectId ?? '',
          ),
        );
        listOptions.onError?.(result.error);
        return false;
      }
    },
    [service, listHook, listOptions, handleError],
  );

  const getStats = useCallback(
    (list: KeyPeopleList): KeyPeopleStats => {
      return service.getStats(list);
    },
    [service],
  );

  return {
    ...listHook,
    uploadAvatar,
    deleteAvatar,
    updateConfig,
    getStats,
  };
}
