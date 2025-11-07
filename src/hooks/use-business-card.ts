/*---------------------------------------
File: src/hooks/use-business-card.ts
Description: React hook for business card management (fetch-only, no real-time)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  BusinessCard,
  BusinessCardInput,
  BusinessCardUpdate,
  BusinessCardSocialMediaUpdate,
  BusinessCardContactUpdate,
} from '@/domain/user/business-card.schema';
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
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';
import { BusinessCardService } from '@/services/business-card-service';

interface UseBusinessCardOptions {
  autoFetch?: boolean;
  onSuccess?: (card: BusinessCard) => void;
  onError?: (error: AppError) => void;
}

interface UseBusinessCardResult {
  card: BusinessCard | null;
  loading: boolean;
  error: AppError | null;
  state: LoadingState<BusinessCard | null>;
  hasCard: () => Promise<boolean>;
  fetchCard: () => Promise<void>;
  createCard: (input: BusinessCardInput) => Promise<boolean>;
  updateCard: (updates: BusinessCardUpdate) => Promise<boolean>;
  updateContact: (contact: BusinessCardContactUpdate) => Promise<boolean>;
  updateSocialMedia: (socialMedia: BusinessCardSocialMediaUpdate) => Promise<boolean>;
  deleteCard: () => Promise<boolean>;
  generateQRCode: (
    config?: Partial<{
      businessCardId: string;
      format: 'png' | 'svg';
      size: number;
      includeBackground: boolean;
    }>,
  ) => Promise<string | null>;
  generateVCard: (
    config?: Partial<{ businessCardId: string; version: '3.0' | '4.0' }>,
  ) => Promise<string | null>;
  saveCardWithQR: (cardData: BusinessCardInput, qrImageData: string) => Promise<string | null>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing business card (fetch-only, no real-time)
 * ❌ NO real-time listener - fetch only when needed
 *
 * @param userId - The ID of the user
 * @param service - BusinessCardService instance
 * @param options - Configuration options
 * @returns Object with business card state and actions
 */
export function useBusinessCard(
  userId: string | null,
  service: BusinessCardService,
  options: UseBusinessCardOptions = {},
): UseBusinessCardResult {
  const { autoFetch = false, onSuccess, onError } = options;

  const [state, setState] = useState<LoadingState<BusinessCard | null>>(
    autoFetch ? loading() : idle(),
  );
  const { handleError } = useErrorHandler();
  const isMountedRef = useRef(true);
  const stateRef = useRef(state);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && userId) {
      fetchCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, userId]);

  const fetchCard = useCallback(async () => {
    if (!userId) {
      setState(idle());
      return;
    }

    setState(prevState => loading(getCurrentData(prevState)));

    const result = await service.getBusinessCard(userId);

    if (!isMountedRef.current) return;

    if (result.success) {
      setState(success(result.value));
      if (result.value) {
        onSuccess?.(result.value);
      }
    } else {
      setState(prevState => errorState(result.error, getCurrentData(prevState)));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useBusinessCard', 'fetchCard', userId),
      );
      onError?.(result.error);
    }
  }, [userId, service, handleError, onSuccess, onError]);

  const hasCard = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    const result = await service.hasBusinessCard(userId);
    return result.success ? result.value : false;
  }, [userId, service]);

  const currentCard = state.status === 'success' ? state.data : null;

  const createCard = useCallback(
    async (input: BusinessCardInput): Promise<boolean> => {
      if (!userId) {
        const error = ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'User ID required',
          'User ID is required to create a business card',
          ErrorContextBuilder.toString(
            ErrorContextBuilder.fromHook('useBusinessCard', 'createCard'),
          ),
        );
        handleError(error, ErrorContextBuilder.fromHook('useBusinessCard', 'createCard'));
        return false;
      }

      setState(loading(getCurrentData(stateRef.current)));

      const result = await service.createBusinessCard(userId, input);

      if (!isMountedRef.current) return false;

      if (result.success) {
        setState(success(result.value));
        onSuccess?.(result.value);
        return true;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useBusinessCard', 'createCard', userId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [userId, service, handleError, onSuccess, onError],
  );

  const updateCard = useCallback(
    async (updates: BusinessCardUpdate): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!userId || !currentData) {
        return false;
      }

      // Optimistic update
      const optimisticValue = { ...currentData, ...updates } as BusinessCard;
      setState(success(optimisticValue));

      const result = await service.updateBusinessCard(userId, updates);

      if (!isMountedRef.current) return false;

      if (result.success) {
        // Refresh to get final state
        await fetchCard();
        return true;
      } else {
        // Rollback on error
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useBusinessCard', 'updateCard', userId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [userId, service, handleError, onError, fetchCard],
  );

  const updateContact = useCallback(
    async (contact: BusinessCardContactUpdate): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!userId || !currentData) {
        return false;
      }

      // Optimistic update
      const optimisticValue = {
        ...currentData,
        ...contact,
      } as BusinessCard;
      setState(success(optimisticValue));

      const result = await service.updateContact(userId, contact);

      if (!isMountedRef.current) return false;

      if (result.success) {
        // Refresh to get final state
        await fetchCard();
        return true;
      } else {
        // Rollback on error
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useBusinessCard', 'updateContact', userId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [userId, service, handleError, onError, fetchCard],
  );

  const updateSocialMedia = useCallback(
    async (socialMedia: BusinessCardSocialMediaUpdate): Promise<boolean> => {
      const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
      if (!userId || !currentData) {
        return false;
      }

      // Optimistic update
      const optimisticValue = {
        ...currentData,
        ...socialMedia,
      } as BusinessCard;
      setState(success(optimisticValue));

      const result = await service.updateSocialMedia(userId, socialMedia);

      if (!isMountedRef.current) return false;

      if (result.success) {
        // Refresh to get final state
        await fetchCard();
        return true;
      } else {
        // Rollback on error
        setState(success(currentData));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useBusinessCard', 'updateSocialMedia', userId),
        );
        onError?.(result.error);
        return false;
      }
    },
    [userId, service, handleError, onError, fetchCard],
  );

  const deleteCard = useCallback(async (): Promise<boolean> => {
    const currentData = stateRef.current.status === 'success' ? stateRef.current.data : null;
    if (!userId || !currentData) {
      return false;
    }

    // Optimistic update - set to null immediately
    setState(success(null));

    const result = await service.deleteBusinessCard(userId);

    if (!isMountedRef.current) return false;

    if (result.success) {
      return true;
    } else {
      // Rollback on error
      setState(success(currentData));
      handleError(
        result.error,
        ErrorContextBuilder.fromHook('useBusinessCard', 'deleteCard', userId),
      );
      onError?.(result.error);
      return false;
    }
  }, [userId, service, handleError, onError]);

  const generateQRCode = useCallback(
    async (
      config?: Partial<{
        businessCardId: string;
        format: 'png' | 'svg';
        size: number;
        includeBackground: boolean;
      }>,
    ): Promise<string | null> => {
      if (!userId) {
        return null;
      }

      const result = await service.generateQRCode(userId, config);
      return result.success ? result.value : null;
    },
    [userId, service],
  );

  const generateVCard = useCallback(
    async (
      config?: Partial<{ businessCardId: string; version: '3.0' | '4.0' }>,
    ): Promise<string | null> => {
      if (!userId) {
        return null;
      }

      const result = await service.generateVCard(userId, config);
      return result.success ? result.value : null;
    },
    [userId, service],
  );

  const saveCardWithQR = useCallback(
    async (cardData: BusinessCardInput, qrImageData: string): Promise<string | null> => {
      if (!userId) {
        return null;
      }

      setState(loading(getCurrentData(stateRef.current)));

      const result = await service.saveBusinessCardWithQR(userId, cardData, qrImageData);

      if (!isMountedRef.current) return null;

      if (result.success) {
        // Refresh card to get updated data
        await fetchCard();
        return result.value.qrImageUrl;
      } else {
        setState(prevState => errorState(result.error, getCurrentData(prevState)));
        handleError(
          result.error,
          ErrorContextBuilder.fromHook('useBusinessCard', 'saveCardWithQR', userId),
        );
        onError?.(result.error);
        return null;
      }
    },
    [userId, service, handleError, onError, fetchCard],
  );

  const refresh = useCallback(() => {
    return fetchCard();
  }, [fetchCard]);

  const clearError = useCallback(() => {
    if (state.status === 'error') {
      setState(success(state.data || null));
    }
  }, [state]);

  return {
    card: currentCard,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    state,
    hasCard,
    fetchCard,
    createCard,
    updateCard,
    updateContact,
    updateSocialMedia,
    deleteCard,
    generateQRCode,
    generateVCard,
    saveCardWithQR,
    refresh,
    clearError,
  };
}
