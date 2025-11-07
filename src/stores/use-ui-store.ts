/*---------------------------------------
File: src/stores/use-ui-store.ts
Description: UI state management store for toast notifications with expandable details support
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

// Third-party libraries
import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

/**
 * Configuration for toast notifications
 * Supports expandable details for aggregated errors
 */
export interface ToastConfig {
  /** Optional unique identifier (auto-generated if not provided) */
  id?: string;

  /** Optional title displayed above the message */
  title?: string;

  /** Main message text displayed in the toast */
  message: string;

  /** Toast type determining colors and icon */
  type: 'success' | 'error' | 'warning' | 'info';

  /** Duration in milliseconds before auto-dismiss (default: 5000) */
  duration?: number;

  /** Optional action button configuration */
  action?: ToastAction;

  /** Optional details array for aggregated errors (expandable details) */
  details?: string[];
}

interface UIStore {
  toasts: ToastConfig[];
  showToast: (config: ToastConfig) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

export const useUIStore = create<UIStore>(set => ({
  toasts: [],

  showToast: (config: ToastConfig) => {
    const id = config.id || `toast-${Date.now()}-${Math.random()}`;
    const toast: ToastConfig = {
      ...config,
      id,
      duration: config.duration ?? 5000, // Default 5 seconds
    };

    set(state => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-dismiss after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        useUIStore.getState().dismissToast(id);
      }, toast.duration);
    }
  },

  dismissToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },
}));
