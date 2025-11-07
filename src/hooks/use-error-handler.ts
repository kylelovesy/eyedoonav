/*---------------------------------------
File: src/hooks/use-error-handler.ts
Description: React hook for consistent error handling
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

import { useCallback } from 'react';
import { AppError, LogContext } from '@/domain/common/errors';
import { AppErrorHandler } from '@/services/error-handler-service';

/**
 * Hook that provides consistent error handling utilities
 * @returns Object with error handling functions
 */
export function useErrorHandler() {
  const handleError = useCallback(
    (error: AppError, context?: string | LogContext, retryAction?: () => void) => {
      AppErrorHandler.handle(error, context, retryAction);
    },
    [],
  );

  return { handleError };
}
