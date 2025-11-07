/*---------------------------------------
File: src/hooks/use-sign-up.ts
Description: React hook for user sign-up functionality
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.0.0
---------------------------------------*/

import { useState, useCallback, useRef, useEffect } from 'react';
import { SignUpInput } from '@/domain/user/auth.schema';
import { BaseUser } from '@/domain/user/user.schema';
import { AppError } from '@/domain/common/errors';
import { LoadingState, loading, success, error as errorState, idle } from '@/utils/loading-state';
import { authService } from '@/services/ServiceFactory';
import { useErrorHandler } from './use-error-handler';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { useAuthStore } from '@/stores/use-auth-store';

interface UseSignUpOptions {
  onSuccess?: (user: BaseUser) => void;
  onError?: (error: AppError) => void;
}

interface UseSignUpResult {
  state: LoadingState<BaseUser | null>;
  loading: boolean;
  error: AppError | null;
  user: BaseUser | null;
  signUp: (input: SignUpInput) => Promise<boolean>;
  reset: () => void;
}

/**
 * Hook for handling user sign-up flow
 *
 * @param options - Optional callbacks for success and error handling
 * @returns Object with sign-up state and actions
 *
 * @example
 * ```typescript
 * const { signUp, loading, error, user } = useSignUp({
 *   onSuccess: (user) => {
 *     router.push('/(app)/home');
 *   },
 *   onError: (error) => {
 *     showToast({ type: 'error', message: error.message });
 *   },
 * });
 *
 * await signUp({
 *   email: 'user@example.com',
 *   password: 'securepassword',
 *   confirmPassword: 'securepassword',
 *   displayName: 'John Doe',
 *   subscriptionPlan: SubscriptionPlan.PRO,
 *   acceptTerms: true,
 *   acceptPrivacy: true,
 * });
 * ```
 */
export function useSignUp(options: UseSignUpOptions = {}): UseSignUpResult {
  const [state, setState] = useState<LoadingState<BaseUser | null>>(idle());
  const { handleError } = useErrorHandler();
  const setAuthUser = useAuthStore(state => state.setUser);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<boolean> => {
      setState(loading());

      const result = await authService.signUp(input);

      if (!isMountedRef.current) return false;

      if (result.success) {
        setState(success(result.value));
        setAuthUser(result.value);
        options.onSuccess?.(result.value);
        return true;
      } else {
        setState(errorState(result.error));
        handleError(result.error, ErrorContextBuilder.fromHook('useSignUp', 'signUp'));
        options.onError?.(result.error);
        return false;
      }
    },
    [handleError, options, setAuthUser],
  );

  const reset = useCallback(() => {
    setState(idle());
  }, []);

  return {
    state,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    user: state.status === 'success' ? state.data : null,
    signUp,
    reset,
  };
}
