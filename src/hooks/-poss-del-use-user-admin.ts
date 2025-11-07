// /*---------------------------------------

// File: src/hooks/use-user-admin.ts

// Description: React hooks for admin user management operations.

// Provides ban/unban, role updates, and user deletion with proper error handling.

// Author: Kyle Lovesy

// Date: 28/10-2025

// Version: 1.0.0

// ---------------------------------------*/

// import { useState, useCallback, useRef, useEffect } from 'react';
// import { User, UserRoleUpdate, UserBanInput } from '@/domain/user/user.schema';
// import {
//   LoadingState,
//   loading,
//   success,
//   error as errorState,
//   idle,
//   getCurrentData,
// } from '@/utils/loading-state';
// import { useErrorHandler } from '@/hooks/use-error-handler';
// import { ErrorContextBuilder } from '@/utils/error-context-builder';
// import { userService } from '@/services/ServiceFactory';
// /**
//  * Hook for admin user management operations
//  *
//  * @returns Object with user list state and admin actions
//  *
//  * @example
//  * ```typescript
//  * const { users, loading, error, fetchAllUsers, banUser, updateUserRole } = useUserAdmin();
//  *
//  * // Fetch users
//  * await fetchAllUsers(50, 0);
//  *
//  * // Ban a user
//  * await banUser(userId, { reason: 'Violation of terms' });
//  *
//  * // Update user role
//  * await updateUserRole(userId, { role: UserRole.ADMIN });
//  * ```
//  */
// export function useUserAdmin() {
//   const [state, setState] = useState<LoadingState<User[]>>(idle());
//   const { handleError } = useErrorHandler();
//   const isMountedRef = useRef(true);

//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   const fetchAllUsers = useCallback(
//     async (limitCount?: number, offset?: number) => {
//       setState(loading(getCurrentData(state)));
//       const result = await userService.getAllUsers(limitCount, offset);

//       if (!isMountedRef.current) return;

//       if (result.success) {
//         setState(success(result.value));
//       } else {
//         setState(errorState(result.error, getCurrentData(state)));
//         handleError(
//           result.error,
//           ErrorContextBuilder.fromHook('useUserAdmin', 'fetchAllUsers', undefined, undefined, {
//             limit: limitCount,
//             offset,
//           }),
//         );
//       }
//     },
//     [handleError, state],
//   );

//   return {
//     users: state.status === 'success' ? state.data : [],
//     loading: state.status === 'loading',
//     error: state.status === 'error' ? state.error : null,
//     state,
//     fetchAllUsers,
//   };
// }

// /**
//  * Hook for performing admin actions on a *specific* user
//  */
// export function useUserAdminActions(userId: string) {
//   const [actionLoading, setActionLoading] = useState(false);
//   const { handleError } = useErrorHandler();

//   // Ref to track component mount status
//   const isMountedRef = useRef(true);
//   useEffect(() => {
//     isMountedRef.current = true;
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   const banUser = useCallback(
//     async (payload: UserBanInput): Promise<boolean> => {
//       setActionLoading(true);
//       const result = await userService.banUser(userId, payload);
//       if (isMountedRef.current) setActionLoading(false);

//       if (result.success) {
//         return true;
//       } else {
//         handleError(
//           result.error,
//           ErrorContextBuilder.fromHook('useUserAdminActions', 'banUser', userId, undefined, {
//             reason: payload.reason, // <-- FIX: Was 'payload'
//           }),
//         );
//         return false;
//       }
//     },
//     [userId, handleError],
//   );

//   const unbanUser = useCallback(async (): Promise<boolean> => {
//     setActionLoading(true);
//     const result = await userService.unbanUser(userId);
//     if (isMountedRef.current) setActionLoading(false);

//     if (result.success) {
//       return true;
//     } else {
//       handleError(
//         result.error,
//         ErrorContextBuilder.fromHook('useUserAdminActions', 'unbanUser', userId),
//       );
//       return false;
//     }
//   }, [userId, handleError]);

//   const updateUserRole = useCallback(
//     async (payload: UserRoleUpdate): Promise<boolean> => {
//       setActionLoading(true);
//       const result = await userService.updateRole(userId, payload);
//       if (isMountedRef.current) setActionLoading(false);

//       if (result.success) {
//         return true;
//       } else {
//         handleError(
//           result.error,
//           ErrorContextBuilder.fromHook('useUserAdminActions', 'updateRole', userId, undefined, {
//             role: payload.role,
//           }),
//         );
//         return false;
//       }
//     },
//     [userId, handleError],
//   );

//   const deleteUser = useCallback(async (): Promise<boolean> => {
//     if (!userId) return false;

//     setActionLoading(true);
//     const result = await userService.deleteUser(userId);
//     if (isMountedRef.current) setActionLoading(false);

//     if (result.success) {
//       return true;
//     } else {
//       handleError(
//         result.error,
//         ErrorContextBuilder.fromHook('useUserAdminActions', 'deleteUser', userId),
//       );
//       return false;
//     }
//   }, [userId, handleError]);

//   const permanentlyDelete = useCallback(async (): Promise<boolean> => {
//     if (!userId) return false;

//     setActionLoading(true);
//     const result = await userService.permanentlyDeleteUser(userId);
//     if (isMountedRef.current) setActionLoading(false);

//     if (result.success) {
//       return true;
//     } else {
//       handleError(
//         result.error,
//         ErrorContextBuilder.fromHook('useUserAdminActions', 'permanentlyDelete', userId),
//       );
//       return false;
//     }
//   }, [userId, handleError]);

//   return {
//     actionLoading,
//     banUser,
//     unbanUser,
//     updateUserRole,
//     deleteUser,
//     permanentlyDelete,
//   };
// }
