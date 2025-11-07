// /*---------------------------------------
// File: src/hooks/use-list-actions.ts
// Description: Generic React hook for list operations with real-time updates.
// Author: Kyle Lovesy
// Date: 28/10-2025 - 10.00
// Version: 1.1.0
// ---------------------------------------*/
// import { useState, useEffect, useCallback, useRef } from 'react';
// import { ListService } from '@/services/ListService';
// import { ListBaseItem, ListConstraint } from '@/domain/common/list-base.schema';
// import { AppError } from '@/domain/common/errors';
// import { useErrorHandler } from '@/hooks/use-error-handler';

// interface UseListOptions {
//   autoFetch?: boolean;
//   enableRealtime?: boolean;
// }

// interface UseListResult<TList, TItem> {
//   list: TList | null;
//   loading: boolean;
//   error: AppError | null;

//   // Core operations
//   fetchList: () => Promise<void>;
//   saveList: (list: TList) => Promise<boolean>;
//   refreshList: () => Promise<void>;

//   // Item operations
//   addItem: (item: TItem) => Promise<boolean>;
//   deleteItem: (itemId: string) => Promise<boolean>;
//   updateItems: (updates: Array<{ id: string } & Partial<TItem>>) => Promise<boolean>;
//   deleteItems: (itemIds: string[]) => Promise<boolean>;

//   // State helpers
//   clearError: () => void;
//   resetList: () => Promise<boolean>;
// }

// /**
//  * Generic hook for user list operations
//  */
// export function useUserList<TList extends ListConstraint<TItem>, TItem extends ListBaseItem>(
//   service: ListService<TList, TItem>,
//   userId: string | null,
//   options: UseListOptions = {},
// ): UseListResult<TList, TItem> {
//   const { autoFetch = true, enableRealtime = false } = options;

//   const [list, setList] = useState<TList | null>(null);
//   const [loading, setLoading] = useState(autoFetch);
//   const [error, setError] = useState<AppError | null>(null);
//   const { handleError } = useErrorHandler();

//   const unsubscribeRef = useRef<(() => void) | null | undefined>(null);
//   const isMountedRef = useRef(true);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       isMountedRef.current = false;
//       if (unsubscribeRef.current) {
//         unsubscribeRef.current();
//       }
//     };
//   }, []);

//   // Fetch list
//   const fetchList = useCallback(async () => {
//     if (!userId) {
//       setList(null);
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     const result = await service.getUserList(userId);

//     if (!isMountedRef.current) return;

//     if (result.success) {
//       setList(result.value);
//       setError(null);
//     } else {
//       const appError = result.error;
//       setError(appError);
//       setList(null);
//       // Handle error according to Sequence 2 in error-flow-mermaid.md
//       handleError(appError, { component: 'useUserList', method: 'fetchList', userId });
//     }
//     setLoading(false);
//   }, [service, userId, handleError]);

//   // Save list
//   const saveList = useCallback(
//     async (updatedList: TList): Promise<boolean> => {
//       if (!userId) return false;

//       setError(null);
//       const result = await service.saveUserList(userId, updatedList);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         setList(updatedList);
//         return true;
//       } else {
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, { component: 'useUserList', method: 'saveList', userId });
//         return false;
//       }
//     },
//     [service, userId, handleError],
//   );

//   // Add item with optimistic update
//   const addItem = useCallback(
//     async (item: TItem, optimistic = true): Promise<boolean> => {
//       if (!userId) return false;

//       const previousList = list;

//       // Optimistic update
//       if (optimistic && previousList) {
//         const optimisticList = {
//           ...previousList,
//           items: [...previousList.items, item],
//         };
//         setList(optimisticList);
//         setError(null);
//       } else {
//         setError(null);
//       }

//       const result = await service.addUserItem(userId, item);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         // Refresh to get server state
//         await fetchList();
//         return true;
//       } else {
//         // Rollback on error
//         if (optimistic && previousList) {
//           setList(previousList);
//         }
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, { component: 'useUserList', method: 'addItem', userId });
//         return false;
//       }
//     },
//     [service, userId, list, fetchList, handleError],
//   );

//   // Delete item with optimistic update
//   const deleteItem = useCallback(
//     async (itemId: string, optimistic = true): Promise<boolean> => {
//       if (!userId) return false;

//       const previousList = list;
//       let deletedItem: TItem | undefined;

//       // Optimistic update
//       if (optimistic && previousList) {
//         deletedItem = previousList.items.find(item => item.id === itemId);
//         const optimisticList = {
//           ...previousList,
//           items: previousList.items.filter(item => item.id !== itemId),
//         };
//         setList(optimisticList);
//         setError(null);
//       } else {
//         setError(null);
//       }

//       const result = await service.deleteUserItem(userId, itemId);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         await fetchList();
//         return true;
//       } else {
//         // Rollback on error
//         if (optimistic && previousList && deletedItem) {
//           setList(previousList);
//         }
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, { component: 'useUserList', method: 'deleteItem', userId });
//         return false;
//       }
//     },
//     [service, userId, list, fetchList, handleError],
//   );

//   // Update items with optimistic update
//   const updateItems = useCallback(
//     async (updates: Array<{ id: string } & Partial<TItem>>, optimistic = true): Promise<boolean> => {
//       if (!userId) return false;

//       const previousList = list;

//       // Optimistic update
//       if (optimistic && previousList) {
//         const itemsMap = new Map(previousList.items.map(item => [item.id, item]));
//         updates.forEach(({ id, ...itemUpdates }) => {
//           const existing = itemsMap.get(id);
//           if (existing) {
//             itemsMap.set(id, { ...existing, ...itemUpdates });
//           }
//         });
//         const optimisticList = {
//           ...previousList,
//           items: Array.from(itemsMap.values()),
//         };
//         setList(optimisticList);
//         setError(null);
//       } else {
//         setError(null);
//       }

//       const result = await service.batchUpdateUserItems(userId, updates);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         await fetchList();
//         return true;
//       } else {
//         // Rollback on error
//         if (optimistic && previousList) {
//           setList(previousList);
//         }
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, {
//           component: 'useUserList',
//           method: 'updateItems',
//           userId,
//           metadata: { itemCount: updates.length },
//         });
//         return false;
//       }
//     },
//     [service, userId, list, fetchList, handleError],
//   );

//   // Delete items with optimistic update
//   const deleteItems = useCallback(
//     async (itemIds: string[], optimistic = true): Promise<boolean> => {
//       if (!userId) return false;

//       const previousList = list;

//       // Optimistic update
//       if (optimistic && previousList) {
//         const optimisticList = {
//           ...previousList,
//           items: previousList.items.filter(item => !itemIds.includes(item.id)),
//         };
//         setList(optimisticList);
//         setError(null);
//       } else {
//         setError(null);
//       }

//       const result = await service.batchDeleteUserItems(userId, itemIds);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         await fetchList();
//         return true;
//       } else {
//         // Rollback on error
//         if (optimistic && previousList) {
//           setList(previousList);
//         }
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, {
//           component: 'useUserList',
//           method: 'deleteItems',
//           userId,
//           metadata: { itemCount: itemIds.length },
//         });
//         return false;
//       }
//     },
//     [service, userId, list, fetchList, handleError],
//   );

//   // Reset list from master
//   const resetList = useCallback(async (): Promise<boolean> => {
//     if (!userId) return false;

//     setError(null);
//     const masterResult = await service.getMaster();

//     if (!masterResult.success) {
//       const appError = masterResult.error;
//       setError(appError);
//       handleError(appError, { component: 'useUserList', method: 'resetList', userId });
//       return false;
//     }

//     const createResult = await service.createOrResetUserList(userId, masterResult.value);

//     if (!isMountedRef.current) return false;

//     if (createResult.success) {
//       await fetchList();
//       return true;
//     } else {
//       const appError = createResult.error;
//       setError(appError);
//       handleError(appError, { component: 'useUserList', method: 'resetList', userId });
//       return false;
//     }
//   }, [service, userId, fetchList, handleError]);

//   // Clear error
//   const clearError = useCallback(() => {
//     setError(null);
//   }, []);

//   // Setup real-time subscription or fetch
//   useEffect(() => {
//     if (!userId) {
//       // fetchList already handles null userId (lines 68-72), so no need to reset state here
//       // This prevents cascading renders from synchronous setState
//       return;
//     }

//     if (enableRealtime && service.subscribeToUserList) {
//       // Set loading in the callback to avoid synchronous setState in effect
//       const unsubscribe = service.subscribeToUserList(userId, result => {
//         if (!isMountedRef.current) return;

//         setLoading(true); // Set loading when first callback is received
//         if (result.success) {
//           setList(result.value);
//           setError(null);
//         } else {
//           const appError = result.error;
//           setError(appError);
//           handleError(appError, {
//             component: 'useUserList',
//             method: 'subscribeToUserList',
//             userId,
//           });
//         }
//         setLoading(false);
//       });
//       unsubscribeRef.current = unsubscribe ?? null; // Handle undefined
//     } else if (autoFetch) {
//       // Defer fetchList to next event loop to avoid synchronous setState warning
//       // fetchList is async and only updates state after async operations complete
//       setTimeout(() => {
//         fetchList();
//       }, 0);
//     }

//     return () => {
//       if (unsubscribeRef.current) {
//         unsubscribeRef.current();
//         unsubscribeRef.current = null;
//       }
//     };
//   }, [userId, enableRealtime, autoFetch, service, fetchList]);

//   return {
//     list,
//     loading,
//     error,
//     fetchList,
//     saveList,
//     refreshList: fetchList,
//     addItem,
//     deleteItem,
//     updateItems,
//     deleteItems,
//     clearError,
//     resetList,
//   };
// }

// /**
//  * Generic hook for project list operations
//  */
// export function useProjectList<TList extends ListConstraint<TItem>, TItem extends ListBaseItem>(
//   service: ListService<TList, TItem>,
//   projectId: string | null,
//   options: UseListOptions = {},
// ): UseListResult<TList, TItem> {
//   const { autoFetch = true, enableRealtime = false } = options;

//   const [list, setList] = useState<TList | null>(null);
//   const [loading, setLoading] = useState(autoFetch);
//   const [error, setError] = useState<AppError | null>(null);
//   const { handleError } = useErrorHandler();

//   const unsubscribeRef = useRef<(() => void) | null>(null);
//   const isMountedRef = useRef(true);

//   useEffect(() => {
//     return () => {
//       isMountedRef.current = false;
//       if (unsubscribeRef.current) {
//         unsubscribeRef.current();
//       }
//     };
//   }, []);

//   const fetchList = useCallback(async () => {
//     if (!projectId) {
//       setList(null);
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     const result = await service.getProjectList(projectId);

//     if (!isMountedRef.current) return;

//     if (result.success) {
//       setList(result.value);
//       setError(null);
//     } else {
//       const appError = result.error;
//       setError(appError);
//       setList(null);
//       handleError(appError, { component: 'useProjectList', method: 'fetchList', projectId });
//     }
//     setLoading(false);
//   }, [service, projectId, handleError]);

//   const saveList = useCallback(
//     async (updatedList: TList): Promise<boolean> => {
//       if (!projectId) return false;

//       setError(null);
//       const result = await service.saveProjectList(projectId, updatedList);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         setList(updatedList);
//         return true;
//       } else {
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, { component: 'useProjectList', method: 'saveList', projectId });
//         return false;
//       }
//     },
//     [service, projectId, handleError],
//   );

//   const addItem = useCallback(
//     async (item: TItem, optimistic = true): Promise<boolean> => {
//       if (!projectId) return false;

//       const previousList = list;

//       if (optimistic && previousList) {
//         const optimisticList = {
//           ...previousList,
//           items: [...previousList.items, item],
//         };
//         setList(optimisticList);
//         setError(null);
//       } else {
//         setError(null);
//       }

//       const result = await service.addProjectItem(projectId, item);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         await fetchList();
//         return true;
//       } else {
//         if (optimistic && previousList) {
//           setList(previousList);
//         }
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, { component: 'useProjectList', method: 'addItem', projectId });
//         return false;
//       }
//     },
//     [service, projectId, list, fetchList, handleError],
//   );

//   const deleteItem = useCallback(
//     async (itemId: string, optimistic = true): Promise<boolean> => {
//       if (!projectId) return false;

//       const previousList = list;
//       let deletedItem: TItem | undefined;

//       if (optimistic && previousList) {
//         deletedItem = previousList.items.find(item => item.id === itemId);
//         const optimisticList = {
//           ...previousList,
//           items: previousList.items.filter(item => item.id !== itemId),
//         };
//         setList(optimisticList);
//         setError(null);
//       } else {
//         setError(null);
//       }

//       const result = await service.deleteProjectItem(projectId, itemId);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         await fetchList();
//         return true;
//       } else {
//         if (optimistic && previousList && deletedItem) {
//           setList(previousList);
//         }
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, { component: 'useProjectList', method: 'deleteItem', projectId });
//         return false;
//       }
//     },
//     [service, projectId, list, fetchList, handleError],
//   );

//   const updateItems = useCallback(
//     async (updates: Array<{ id: string } & Partial<TItem>>, optimistic = true): Promise<boolean> => {
//       if (!projectId) return false;

//       const previousList = list;

//       if (optimistic && previousList) {
//         const itemsMap = new Map(previousList.items.map(item => [item.id, item]));
//         updates.forEach(({ id, ...itemUpdates }) => {
//           const existing = itemsMap.get(id);
//           if (existing) {
//             itemsMap.set(id, { ...existing, ...itemUpdates });
//           }
//         });
//         const optimisticList = {
//           ...previousList,
//           items: Array.from(itemsMap.values()),
//         };
//         setList(optimisticList);
//         setError(null);
//       } else {
//         setError(null);
//       }

//       const result = await service.batchUpdateProjectItems(projectId, updates);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         await fetchList();
//         return true;
//       } else {
//         if (optimistic && previousList) {
//           setList(previousList);
//         }
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, {
//           component: 'useProjectList',
//           method: 'updateItems',
//           projectId,
//           metadata: { itemCount: updates.length },
//         });
//         return false;
//       }
//     },
//     [service, projectId, list, fetchList, handleError],
//   );

//   const deleteItems = useCallback(
//     async (itemIds: string[], optimistic = true): Promise<boolean> => {
//       if (!projectId) return false;

//       const previousList = list;

//       if (optimistic && previousList) {
//         const optimisticList = {
//           ...previousList,
//           items: previousList.items.filter(item => !itemIds.includes(item.id)),
//         };
//         setList(optimisticList);
//         setError(null);
//       } else {
//         setError(null);
//       }

//       const result = await service.batchDeleteProjectItems(projectId, itemIds);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         await fetchList();
//         return true;
//       } else {
//         if (optimistic && previousList) {
//           setList(previousList);
//         }
//         const appError = result.error;
//         setError(appError);
//         handleError(appError, {
//           component: 'useProjectList',
//           method: 'deleteItems',
//           projectId,
//           metadata: { itemCount: itemIds.length },
//         });
//         return false;
//       }
//     },
//     [service, projectId, list, fetchList, handleError],
//   );

//   const resetList = useCallback(async (): Promise<boolean> => {
//     if (!projectId) return false;

//     setError(null);
//     const masterResult = await service.getMaster();

//     if (!masterResult.success) {
//       const appError = masterResult.error;
//       setError(appError);
//       handleError(appError, { component: 'useProjectList', method: 'resetList', projectId });
//       return false;
//     }

//     const createResult = await service.createOrResetProjectList(
//       'system',
//       projectId,
//       masterResult.value,
//     );

//     if (!isMountedRef.current) return false;

//     if (createResult.success) {
//       await fetchList();
//       return true;
//     } else {
//       const appError = createResult.error;
//       setError(appError);
//       handleError(appError, { component: 'useProjectList', method: 'resetList', projectId });
//       return false;
//     }
//   }, [service, projectId, fetchList, handleError]);

//   const clearError = useCallback(() => {
//     setError(null);
//   }, []);

//   useEffect(() => {
//     if (!projectId) {
//       // fetchList already handles null projectId (lines 306-309), so no need to reset state here
//       // This prevents cascading renders from synchronous setState
//       return;
//     }

//     if (enableRealtime && service.subscribeToProjectList) {
//       // Set loading in the callback to avoid synchronous setState in effect
//       const unsubscribe = service.subscribeToProjectList(projectId, result => {
//         if (!isMountedRef.current) return;

//         setLoading(true); // Set loading when first callback is received
//         if (result.success) {
//           setList(result.value);
//           setError(null);
//         } else {
//           const appError = result.error;
//           setError(appError);
//           handleError(appError, {
//             component: 'useProjectList',
//             method: 'subscribeToProjectList',
//             projectId,
//           });
//         }
//         setLoading(false);
//       });
//       unsubscribeRef.current = unsubscribe ?? null; // Handle undefined
//     } else if (autoFetch) {
//       // Defer fetchList to next event loop to avoid synchronous setState warning
//       // fetchList is async and only updates state after async operations complete
//       setTimeout(() => {
//         fetchList();
//       }, 0);
//     }

//     return () => {
//       if (unsubscribeRef.current) {
//         unsubscribeRef.current();
//         unsubscribeRef.current = null;
//       }
//     };
//   }, [projectId, enableRealtime, autoFetch, service, fetchList, handleError]);
//   return {
//     list,
//     loading,
//     error,
//     fetchList,
//     saveList,
//     refreshList: fetchList,
//     addItem,
//     deleteItem,
//     updateItems,
//     deleteItems,
//     clearError,
//     resetList,
//   };
// }
