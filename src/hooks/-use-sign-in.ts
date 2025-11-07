/*---------------------------------------
File: src/hooks/use-sign-in.ts
Description: React hook for user sign-in functionality
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.0.0
---------------------------------------*/

import { useState, useCallback, useRef, useEffect } from 'react';
import { SignInInput } from '@/domain/user/auth.schema';
import { BaseUser } from '@/domain/user/user.schema';
import { AppError } from '@/domain/common/errors';
import { LoadingState, loading, success, error as errorState, idle } from '@/utils/loading-state';
import { authService } from '@/services/ServiceFactory';
import { useErrorHandler } from './use-error-handler';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { useAuthStore } from '@/stores/use-auth-store';

interface UseSignInOptions {
  onSuccess?: (user: BaseUser) => void;
  onError?: (error: AppError) => void;
}

interface UseSignInResult {
  state: LoadingState<BaseUser | null>;
  loading: boolean;
  error: AppError | null;
  user: BaseUser | null;
  signIn: (input: SignInInput) => Promise<boolean>;
  reset: () => void;
}

/**
 * Hook for handling user sign-in flow
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Object with sign-in state and actions
 *
 * @example
 * ```typescript
 * const { signIn, loading, error, user } = useSignIn({
 *   onSuccess: (user) => {
 *     router.push('/(app)/home');
 *   },
 *   onError: (error) => {
 *     showToast({ type: 'error', message: error.message });
 *   },
 * });
 *
 * await signIn({
 *   email: 'user@example.com',
 *   password: 'securepassword',
 *   rememberMe: true,
 * });
 * ```
 */
export function useSignIn(options: UseSignInOptions = {}): UseSignInResult {
  const [state, setState] = useState<LoadingState<BaseUser | null>>(idle());
  const { handleError } = useErrorHandler();
  const setAuthUser = useAuthStore(state => state.setUser);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const signIn = useCallback(
    async (input: SignInInput): Promise<boolean> => {
      setState(loading());

      const result = await authService.signIn(input);

      if (!isMountedRef.current) return false;

      if (result.success) {
        setState(success(result.value));
        setAuthUser(result.value); // Update global auth state
        options.onSuccess?.(result.value);
        return true;
      } else {
        setState(errorState(result.error));
        handleError(result.error, ErrorContextBuilder.fromHook('useSignIn', 'signIn'));
        options.onError?.(result.error);
        return false;
      }
    },
    [handleError, setAuthUser, options],
  );

  const reset = useCallback(() => {
    setState(idle());
  }, []);

  return {
    state,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    user: state.status === 'success' ? state.data : null,
    signIn,
    reset,
  };
}
