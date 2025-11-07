/*---------------------------------------
File: src/stores/use-base-user-store.ts
Description: Zustand store for base user (global state)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { create } from 'zustand';
import { BaseUser } from '@/domain/user/user.schema';
import { AppError } from '@/domain/common/errors';

interface BaseUserState {
  user: BaseUser | null;
  loading: boolean;
  error: AppError | null;
}

interface BaseUserActions {
  setUser: (user: BaseUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  reset: () => void;
}

export type BaseUserStore = BaseUserState & BaseUserActions;

/**
 * Zustand store for base user state
 * Use for global state that needs to be shared across multiple screens
 */
export const useBaseUserStore = create<BaseUserStore>(set => ({
  // State
  user: null,
  loading: false,
  error: null,

  // Actions
  setUser: user =>
    set({
      user,
      error: null,
    }),

  setLoading: loading => set({ loading }),

  setError: error => {
    set({ error, loading: false });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      user: null,
      loading: false,
      error: null,
    }),
}));
