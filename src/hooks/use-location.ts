/*---------------------------------------
File: src/hooks/use-location.ts
Description: React hooks for location list and geocoding operations.
Provides loading states, optimistic updates, and error handling.
Author: Kyle Lovesy
Date: 04/11-2025 - 16.00
Version: 2.0.0
---------------------------------------*/

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  LocationList,
  LocationItem,
  LocationItemInput,
  LocationConfig,
} from '@/domain/project/location.schema';
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
import { LocationService, GeocodeCoordinates } from '@/services/location-service';
import { CreatedBy, LocationType } from '@/constants/enums';

interface UseLocationListOptions {
  projectId: string;
  autoFetch?: boolean;
  enableRealtime?: boolean;
  onSuccess?: (list: LocationList | null) => void;
  onError?: (error: AppError) => void;
}

interface UseLocationListResult {
  locationList: LocationList | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<LocationList | null>;

  // List operations
  fetchList: () => Promise<void>;
  updateConfig: (updates: Partial<LocationConfig>) => Promise<boolean>;
  finalizeLocations: () => Promise<boolean>;

  // Item operations
  addLocation: (input: LocationItemInput) => Promise<boolean>;
  updateLocation: (item: LocationItem) => Promise<boolean>;
  deleteLocation: (itemId: string) => Promise<boolean>;
  openDirections: (location: LocationItem) => Promise<boolean>;

  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing location list for a project.
 * Provides loading states, optimistic updates, and error handling.
 *
 * @param service - LocationService instance (typically from ServiceFactory)
 * @param options - Configuration options
 * @param options.projectId - The ID of the project
 * @param options.autoFetch - Whether to automatically fetch list on mount (default: false)
 * @param options.enableRealtime - Whether to enable real-time updates (default: false)
 * @param options.onSuccess - Callback called when operations succeed
 * @param options.onError - Callback called when operations fail
 * @returns Object with location list state and operations
 *
 * @example
 * ```typescript
 * const { locationList, loading, addLocation } = useLocationList(
 *   ServiceFactory.location,
 *   { projectId: 'project-123', autoFetch: true }
 * );
 * ```
 */
export function useLocationList(
  service: LocationService,
  options: UseLocationListOptions,
): UseLocationListResult {
  const { projectId, autoFetch = false, enableRealtime = false, onSuccess, onError } = options;

  const [state, setState] = useState<LoadingState<LocationList | null>>(
    autoFetch || enableRealtime ? loading() : idle(),
  );
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // ============================================================================
  // LIST OPERATIONS
  // ============================================================================

  const fetchList = useCallback(async () => {
    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.get(projectId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      onSuccess?.(result.value);
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useLocationList', 'fetchList', undefined, projectId),
      );
      onError?.(result.error);
    }
  }, [projectId, service, handleError, onSuccess, onError]);

  const updateConfig = useCallback(
    async (updates: Partial<LocationConfig>): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticList: LocationList = {
        ...currentData,
        config: { ...currentData.config, ...updates },
      };
      setState(success(optimisticList));

      const result = await service.updateConfig(projectId, updates);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await fetchList();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useLocationList', 'updateConfig', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, fetchList, handleError, onError],
  );

  const finalizeLocations = useCallback(async (): Promise<boolean> => {
    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.finalizeLocations(projectId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      await fetchList();
      return true;
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useLocationList', 'finalizeLocations', undefined, projectId),
      );
      onError?.(result.error);
      return false;
    }
  }, [projectId, service, fetchList, handleError, onError]);

  // ============================================================================
  // ITEM OPERATIONS
  // ============================================================================

  const addLocation = useCallback(
    async (input: LocationItemInput): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic item (will be replaced by server response)
      const optimisticItem: LocationItem = {
        ...input,
        id: `temp-${Date.now()}`,
        categoryId: undefined,
        isCustom: false,
        isDisabled: false,
        isChecked: false,
        itemName: input.locationName || input.itemName || '',
        itemDescription: input.locationNotes || input.itemDescription || '',
        locationType: input.locationType || LocationType.SINGLE_LOCATION,
        locationName: input.locationName || '',
        locationAddress1: input.locationAddress1 || '',
        locationPostcode: input.locationPostcode || '',
        locationNotes: input.locationNotes,
        locationContactPerson: input.locationContactPerson || null,
        locationContactInfo: input.locationContactInfo || null,
        arriveTime: input.arriveTime,
        leaveTime: input.leaveTime,
        nextLocationTravelTimeEstimate: input.nextLocationTravelTimeEstimate,
        nextLocationTravelArrangements: input.nextLocationTravelArrangements,
        createdBy: CreatedBy.PHOTOGRAPHER,
        updatedBy: CreatedBy.PHOTOGRAPHER,
        geopoint: null,
        notes: input.notes || null,
      };

      const optimisticList: LocationList = {
        ...currentData,
        items: [...currentData.items, optimisticItem],
      };
      setState(success(optimisticList));

      const result = await service.addLocation(projectId, input);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await fetchList();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useLocationList', 'addLocation', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, fetchList, handleError, onError],
  );

  const updateLocation = useCallback(
    async (item: LocationItem): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticList: LocationList = {
        ...currentData,
        items: currentData.items.map(i => (i.id === item.id ? item : i)),
      };
      setState(success(optimisticList));

      const result = await service.updateLocation(projectId, item);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await fetchList();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useLocationList', 'updateLocation', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, fetchList, handleError, onError],
  );

  const deleteLocation = useCallback(
    async (itemId: string): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!currentData) return false;

      // Optimistic update
      const optimisticList: LocationList = {
        ...currentData,
        items: currentData.items.filter(i => i.id !== itemId),
      };
      setState(success(optimisticList));

      const result = await service.deleteLocation(projectId, itemId);

      if (!isMountedRef.current) return false;

      if (result.success) {
        await fetchList();
        return true;
      } else {
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useLocationList', 'deleteLocation', undefined, projectId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [projectId, service, fetchList, handleError, onError],
  );

  // ============================================================================
  // REAL-TIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    if (!enableRealtime) return;

    unsubscribeRef.current = service.subscribe(projectId, result => {
      if (!isMountedRef.current) return;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useLocationList', 'subscribe', undefined, projectId),
        );
        onError?.(result.error);
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [projectId, enableRealtime, service, handleError, onSuccess, onError]);

  // ============================================================================
  // AUTO-FETCH
  // ============================================================================

  useEffect(() => {
    if (autoFetch && !enableRealtime) {
      // Use setTimeout to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        fetchList();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [autoFetch, enableRealtime, fetchList]);

  // ============================================================================
  // UTILITY
  // ============================================================================

  const refresh = useCallback(() => fetchList(), [fetchList]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  const openDirections = useCallback(
    async (location: LocationItem): Promise<boolean> => {
      const result = await service.openDirections(location);
      if (!result.success) {
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useLocationList', 'openDirections', undefined, projectId, {
            locationId: location.id,
          }),
        );
        onError?.(result.error);
        return false;
      }
      return true;
    },
    [service, projectId, handleError, onError],
  );

  return {
    locationList: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    fetchList,
    updateConfig,
    finalizeLocations,
    addLocation,
    updateLocation,
    deleteLocation,
    openDirections,
    refresh,
    clearError,
  };
}

/**
 * Hook for geocoding addresses using OpenCage API.
 * Provides loading states and error handling for geocoding operations.
 *
 * @param service - LocationService instance (typically from ServiceFactory)
 * @returns Object with geocoding state and operations
 *
 * @example
 * ```typescript
 * const { geocode, coordinates, loading } = useGeocodeAddress(ServiceFactory.location);
 * await geocode('123 Main St, London, SW1A 1AA');
 * ```
 */
interface UseGeocodeAddressResult {
  /** The geocoded coordinates, or null if not yet geocoded or on error */
  coordinates: GeocodeCoordinates | null;
  /** Whether a geocoding operation is in progress */
  loading: boolean;
  /** Any error that occurred during geocoding */
  error: AppError | null;
  /** The current loading state */
  state: LoadingState<GeocodeCoordinates>;
  /** Function to geocode an address */
  geocode: (address: string) => Promise<GeocodeCoordinates | null>;
  /** Function to reset the geocoding state */
  reset: () => void;
}

export function useGeocodeAddress(service: LocationService): UseGeocodeAddressResult {
  const [state, setState] = useState<LoadingState<GeocodeCoordinates>>(idle());
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const geocode = useCallback(
    async (address: string): Promise<GeocodeCoordinates | null> => {
      setState(loading());

      const sanitizedAddress = address?.substring(0, 50) || 'unknown';
      const result = await service.geocodeAddress(address);

      if (!isMountedRef.current) return null;

      if (result.success) {
        setState(success(result.value));
        return result.value;
      } else {
        setState(errorState(result.error));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useGeocodeAddress', 'geocode', undefined, undefined, {
            address: sanitizedAddress,
          }),
        );
        return null;
      }
    },
    [service, handleError],
  );

  const reset = useCallback(() => {
    setState(idle());
  }, []);

  return {
    coordinates: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    geocode,
    reset,
  };
}
