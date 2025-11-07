// /*---------------------------------------
// File: src/hooks/use-password-reset.ts
// Description: React hook for password reset and change functionality
// Author: Kyle Lovesy
// Date: 28/10-2025 - 12.00
// Version: 1.0.0
// ---------------------------------------*/

// import { useState, useCallback, useRef, useEffect } from 'react';
// import {
//   PasswordResetInput,
//   PasswordResetConfirm,
//   PasswordChangeInput,
// } from '@/domain/user/auth.schema';
// import { AppError } from '@/domain/common/errors';
// import { LoadingState, loading, success, error as errorState, idle } from '@/utils/loading-state';
// import { authService } from '@/services/ServiceFactory';
// import { useErrorHandler } from './use-error-handler';
// import { ErrorContextBuilder } from '@/utils/error-context-builder';

// interface UsePasswordResetResult {
//   state: LoadingState<void>;
//   loading: boolean;
//   error: AppError | null;
//   sendResetEmail: (input: PasswordResetInput) => Promise<boolean>;
//   confirmReset: (input: PasswordResetConfirm) => Promise<boolean>;
//   changePassword: (input: PasswordChangeInput) => Promise<boolean>;
//   reset: () => void;
// }

// /**
//  * Hook for handling password reset and change operations
//  *
//  * @returns Object with password reset state and actions
//  *
//  * @example
//  * ```typescript
//  * const { sendResetEmail, confirmReset, changePassword, loading, error } = usePasswordReset();
//  *
//  * // Send reset email
//  * await sendResetEmail({ email: 'user@example.com' });
//  *
//  * // Confirm password reset
//  * await confirmReset({
//  *   token: 'reset-token',
//  *   password: 'newpassword',
//  *   confirmPassword: 'newpassword',
//  * });
//  *
//  * // Change password (requires authentication)
//  * await changePassword({
//  *   currentPassword: 'oldpassword',
//  *   newPassword: 'newpassword',
//  *   confirmPassword: 'newpassword',
//  * });
//  * ```
//  */
// export function usePasswordReset(): UsePasswordResetResult {
//   const [state, setState] = useState<LoadingState<void>>(idle());
//   const { handleError } = useErrorHandler();
//   const isMountedRef = useRef(true);

//   useEffect(() => {
//     return () => {
//       isMountedRef.current = false;
//     };
//   }, []);

//   const sendResetEmail = useCallback(
//     async (input: PasswordResetInput): Promise<boolean> => {
//       setState(loading());

//       const result = await authService.passwordReset(input);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         setState(success(undefined));
//         return true;
//       } else {
//         setState(errorState(result.error));
//         handleError(
//           result.error,
//           ErrorContextBuilder.fromHook('usePasswordReset', 'sendResetEmail'),
//         );
//         return false;
//       }
//     },
//     [handleError],
//   );

//   const confirmReset = useCallback(
//     async (input: PasswordResetConfirm): Promise<boolean> => {
//       setState(loading());

//       const result = await authService.passwordResetConfirm(input);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         setState(success(undefined));
//         return true;
//       } else {
//         setState(errorState(result.error));
//         handleError(result.error, ErrorContextBuilder.fromHook('usePasswordReset', 'confirmReset'));
//         return false;
//       }
//     },
//     [handleError],
//   );

//   const changePassword = useCallback(
//     async (input: PasswordChangeInput): Promise<boolean> => {
//       setState(loading());

//       const result = await authService.passwordChange(input);

//       if (!isMountedRef.current) return false;

//       if (result.success) {
//         setState(success(undefined));
//         return true;
//       } else {
//         setState(errorState(result.error));
//         handleError(
//           result.error,
//           ErrorContextBuilder.fromHook('usePasswordReset', 'changePassword'),
//         );
//         return false;
//       }
//     },
//     [handleError],
//   );

//   const reset = useCallback(() => {
//     setState(idle());
//   }, []);

//   return {
//     state,
//     loading: state.status === 'loading',
//     error: state.status === 'error' ? state.error : null,
//     sendResetEmail,
//     confirmReset,
//     changePassword,
//     reset,
//   };
// }
