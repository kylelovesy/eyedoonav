/*---------------------------------------
File: src/hooks/use-portal.ts
Description: Portal hook - project-specific portal management (COMPLETE)
Author: Kyle Lovesy
Date: 04/11/2025
Version: 2.0.0 (FINAL - ALL FEATURES MIGRATED)
---------------------------------------*/
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ClientPortal } from '@/domain/project/portal.schema';
import { AppError } from '@/domain/common/errors';
import {
  LoadingState,
  loading,
  success,
  error as errorState,
  idle,
  getCurrentData,
} from '@/utils/loading-state';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { PortalService, PortalStats, PortalStatusInfo } from '@/services/portal-service';
import { ActionOn, PortalStepID, SectionStatus } from '@/constants/enums';

interface UsePortalOptions {
  userId: string; // Required to fetch user's portals
  projectId: string; // Required - portals only exist in projects
  autoFetch?: boolean;
  onSuccess?: (portal: ClientPortal | null) => void;
  onError?: (error: AppError) => void;
}

interface UsePortalResult {
  portal: ClientPortal | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<ClientPortal | null>;

  // Portal operations
  getPortal: () => Promise<void>;
  setupPortal: (selectedStepKeys: string[]) => Promise<boolean>;
  disablePortal: () => Promise<boolean>;
  enablePortal: () => Promise<boolean>;
  updateMessage: (message: string) => Promise<boolean>;
  extendExpiration: (additionalDays?: number) => Promise<boolean>;

  // Step management
  updateStepStatus: (
    stepId: PortalStepID,
    status: SectionStatus,
    actionOn: ActionOn,
  ) => Promise<boolean>;
  resetSteps: () => Promise<boolean>;
  lockPortal: () => Promise<boolean>;

  // UI state management (from old implementation)
  selectedSteps: string[];
  toggleStep: (stepKey: string) => void;
  clearSelectedSteps: () => void;
  hasPortal: boolean;

  // Helpers
  stats: PortalStats | null;
  statusInfo: PortalStatusInfo | null;
  isExpired: boolean;
  isActive: boolean;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing project portals
 * Portal is project-specific - no master/user lists
 *
 * @param service - PortalService instance
 * @param options - Configuration options (userId and projectId required)
 * @returns Object with portal state and operations
 */
export function usePortal(service: PortalService, options: UsePortalOptions): UsePortalResult {
  const { userId, projectId, autoFetch = false, onSuccess, onError } = options;

  const [state, setState] = useState<LoadingState<ClientPortal | null>>(
    autoFetch ? loading() : idle(),
  );

  // UI state for step selection (from old implementation)
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);

  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);
  const stateRef = useRef(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Extract current portal and portalId
  const currentPortal = state.status === 'success' ? state.data : null;
  const portalId = currentPortal?.id;

  // ============================================================================
  // PORTAL OPERATIONS
  // ============================================================================

  /**
   * Gets portal for this project by listing user portals and filtering
   */
  const getPortal = useCallback(async () => {
    setState(prevState => loading(getCurrentData(prevState)));

    // Get all user portals, then filter by projectId
    const result = await service.listUserPortals(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      const portal = result.value.find(p => p.projectId === projectId) || null;
      setState(success(portal));
      onSuccess?.(portal);
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('usePortal', 'getPortal', userId, projectId),
      );
      onError?.(result.error);
    }
  }, [userId, projectId, service, handleError, onSuccess, onError]);

  /**
   * Sets up a new portal
   */
  const setupPortal = useCallback(
    async (selectedStepKeys: string[]): Promise<boolean> => {
      setState(prevState => loading(getCurrentData(prevState)));

      const result = await service.setupPortal(userId, projectId, selectedStepKeys);

      if (!isMountedRef.current) return false;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
        // Clear selected steps after successful setup
        setSelectedSteps([]);
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('usePortal', 'setupPortal', userId, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [userId, projectId, service, handleError, onSuccess, onError],
  );

  /**
   * Disables portal access
   */
  const disablePortal = useCallback(async (): Promise<boolean> => {
    if (!portalId) return false;

    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.disablePortal(projectId, portalId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      await getPortal(); // Refresh to get updated state
      return true;
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('usePortal', 'disablePortal', userId, projectId),
      );
      onError?.(result.error);
      return false;
    }
  }, [portalId, projectId, service, getPortal, handleError, userId, onError]);

  /**
   * Enables portal access
   */
  const enablePortal = useCallback(async (): Promise<boolean> => {
    if (!portalId) return false;

    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.enablePortal(projectId, portalId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      await getPortal();
      return true;
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('usePortal', 'enablePortal', userId, projectId),
      );
      onError?.(result.error);
      return false;
    }
  }, [portalId, projectId, service, getPortal, handleError, userId, onError]);

  /**
   * Updates portal message
   */
  const updateMessage = useCallback(
    async (message: string): Promise<boolean> => {
      if (!portalId) return false;

      setState(prevState => loading(getCurrentData(prevState)));

      const result = await service.updateMessage(projectId, portalId, message);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getPortal();
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('usePortal', 'updateMessage', userId, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [portalId, projectId, service, getPortal, handleError, userId, onError],
  );

  /**
   * Extends portal expiration
   */
  const extendExpiration = useCallback(
    async (additionalDays: number = 30): Promise<boolean> => {
      if (!portalId) return false;

      setState(prevState => loading(getCurrentData(prevState)));

      const result = await service.extendExpiration(projectId, portalId, additionalDays);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getPortal();
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('usePortal', 'extendExpiration', userId, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [portalId, projectId, service, getPortal, handleError, userId, onError],
  );

  // ============================================================================
  // STEP MANAGEMENT
  // ============================================================================

  /**
   * Updates step status
   */
  const updateStepStatus = useCallback(
    async (stepId: PortalStepID, status: SectionStatus, actionOn: ActionOn): Promise<boolean> => {
      if (!portalId) return false;

      setState(prevState => loading(getCurrentData(prevState)));

      const result = await service.updateStepStatus(projectId, portalId, stepId, status, actionOn);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await getPortal();
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('usePortal', 'updateStepStatus', userId, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [portalId, projectId, service, getPortal, handleError, userId, onError],
  );

  /**
   * Resets all portal steps
   */
  const resetSteps = useCallback(async (): Promise<boolean> => {
    if (!portalId) return false;

    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.resetSteps(projectId, portalId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      await getPortal();
      return true;
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('usePortal', 'resetSteps', userId, projectId),
      );
      onError?.(result.error);
      return false;
    }
  }, [portalId, projectId, service, getPortal, handleError, userId, onError]);

  /**
   * Locks portal
   */
  const lockPortal = useCallback(async (): Promise<boolean> => {
    if (!portalId) return false;

    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.lockPortal(projectId, portalId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      await getPortal();
      return true;
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('usePortal', 'lockPortal', userId, projectId),
      );
      onError?.(result.error);
      return false;
    }
  }, [portalId, projectId, service, getPortal, handleError, userId, onError]);

  // ============================================================================
  // UI STATE MANAGEMENT (from old implementation)
  // ============================================================================

  /**
   * Toggles a step in the selection for portal setup
   */
  const toggleStep = useCallback((stepKey: string) => {
    setSelectedSteps(prev => {
      const isSelected = prev.includes(stepKey);
      return isSelected ? prev.filter(s => s !== stepKey) : [...prev, stepKey];
    });
  }, []);

  /**
   * Clears all selected steps
   */
  const clearSelectedSteps = useCallback(() => {
    setSelectedSteps([]);
  }, []);

  // ============================================================================
  // AUTO-FETCH
  // ============================================================================

  // useEffect(() => {
  //   if (autoFetch) {
  //     getPortal();
  //   }
  // }, [autoFetch, getPortal]);

  // ============================================================================
  // COMPUTED VALUES (using useMemo for performance)
  // ============================================================================

  const stats = useMemo(
    () => (currentPortal ? service.getStats(currentPortal) : null),
    [currentPortal, service],
  );

  const statusInfo = useMemo(
    () => (currentPortal && stats ? service.getStatusInfo(currentPortal, stats) : null),
    [currentPortal, stats, service],
  );

  const isExpired = useMemo(
    () => (currentPortal ? service.isExpired(currentPortal) : false),
    [currentPortal, service],
  );

  const isActive = useMemo(
    () => (currentPortal ? currentPortal.isEnabled && !isExpired : false),
    [currentPortal, isExpired],
  );

  const hasPortal = useMemo(() => !!currentPortal, [currentPortal]);

  // ============================================================================
  // UTILITY
  // ============================================================================

  const refresh = useCallback(() => getPortal(), [getPortal]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  return {
    portal: currentPortal,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,

    // Portal operations
    getPortal,
    setupPortal,
    disablePortal,
    enablePortal,
    updateMessage,
    extendExpiration,

    // Step management
    updateStepStatus,
    resetSteps,
    lockPortal,

    // UI state management
    selectedSteps,
    toggleStep,
    clearSelectedSteps,
    hasPortal,

    // Helpers
    stats,
    statusInfo,
    isExpired,
    isActive,
    refresh,
    clearError,
  };
}
