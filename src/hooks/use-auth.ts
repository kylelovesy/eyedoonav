/*---------------------------------------
File: src/hooks/use-auth.ts
Description: React hook for managing authentication state and current user
Provides loading states and error handling for auth operations
Author: Kyle Lovesy
Date: 28/10-2025 - 16.00
Version: 2.0.0
---------------------------------------*/

import { useState, useCallback, useRef, useEffect } from 'react';
import { BaseUser } from '@/domain/user/user.schema';
import { AppError } from '@/domain/common/errors';
import {
  LoadingState,
  loading,
  success,
  error as errorState,
  idle,
  getCurrentData,
} from '@/utils/loading-state';
import { ServiceFactory } from '@/services/ServiceFactory';
import { useErrorHandler } from './use-error-handler';
import { ErrorContextBuilder } from '@/utils/error-context-builder';

interface UseAuthOptions {
  autoFetch?: boolean;
}

interface UseAuthResult {
  user: BaseUser | null;
  isAuthenticated: boolean;
  state: LoadingState<BaseUser | null>;
  loading: boolean;
  error: AppError | null;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing authentication state and current user
 *
 * @param options - Configuration options
 * @param options.autoFetch - Whether to automatically fetch profile on mount (default: false)
 * @returns Object with auth state and actions
 *
 * @example
 * ```typescript
 * // Auto-fetch on mount
 * const { user, isAuthenticated, loading, fetchProfile } = useAuth({ autoFetch: true });
 *
 * // Manual fetch
 * const { user, fetchProfile } = useAuth({ autoFetch: false });
 * await fetchProfile();
 * ```
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthResult {
  const { autoFetch = false } = options;
  const [state, setState] = useState<LoadingState<BaseUser | null>>(autoFetch ? loading() : idle());
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);

  const fetchProfile = useCallback(async () => {
    setState(prev => loading(getCurrentData(prev)));

    const result = await ServiceFactory.auth.getProfile();

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
    } else {
      // Not authenticated is not an error - just set null
      setState(success(null));
    }
  }, []);

  const signOut = useCallback(async () => {
    setState(prev => loading(getCurrentData(prev)));

    const result = await ServiceFactory.auth.signOut();

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(null));
    } else {
      setState(prev => errorState(result.error, getCurrentData(prev)));
      handleError(result.error, ErrorContextBuilder.fromHook('useAuth', 'signOut'));
    }
  }, [handleError]);

  const refresh = useCallback(() => fetchProfile(), [fetchProfile]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  return {
    user: state.status === 'success' ? state.data : null,
    isAuthenticated: state.status === 'success' && state.data !== null,
    state,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    fetchProfile,
    signOut,
    refresh,
  };
}
