/*---------------------------------------
File: src/stores/use-auth-store.ts
Description: Authentication store using Zustand
Author: Kyle Lovesy
Date: 29/10-2025 - 11.00
Version: 1.0.0
---------------------------------------*/

import { create } from 'zustand';
import { BaseUser } from '@/domain/user/user.schema';
import { AppError } from '@/domain/common/errors';
import { ServiceFactory } from '@/services/ServiceFactory';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { AppErrorHandler } from '@/services/error-handler-service';

interface AuthState {
  user: BaseUser | null;
  loading: boolean;
  error: AppError | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: BaseUser | null) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>(set => ({
  // State
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,

  // Actions
  initialize: async () => {
    set({ loading: true });

    const result = await ServiceFactory.auth.getProfile();

    if (result.success) {
      set({
        user: result.value,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
    } else {
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: result.error,
      });
    }
  },

  signOut: async () => {
    const result = await ServiceFactory.auth.signOut();

    if (result.success) {
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    } else {
      AppErrorHandler.handle(
        result.error,
        ErrorContextBuilder.fromComponent('AuthStore', 'signOut'),
      );
      set({ error: result.error });
    }
  },

  setUser: user =>
    set({
      user,
      isAuthenticated: !!user,
      error: null,
    }),

  clearError: () => set({ error: null }),
}));
