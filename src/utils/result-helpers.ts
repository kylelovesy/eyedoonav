/*---------------------------------------
File: src/utils/result-helpers.ts
Description: Utility helpers for Result pattern operations
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.2.0
---------------------------------------*/

import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';

/**
 * Wraps an async operation in a try/catch and converts errors to Result type
 * @param operation - The async operation to wrap
 * @param errorMapper - Function to map caught errors to AppError
 * @param context - Optional context string for error logging
 */
export async function wrapAsyncOperation<T, E extends AppError>(
  operation: () => Promise<T>,
  errorMapper: (error: unknown) => E,
  context?: string,
): Promise<Result<T, E>> {
  try {
    const value = await operation();
    return ok(value);
  } catch (error) {
    const appError = errorMapper(error);
    return err(appError);
  }
}

/**
 * Wraps a synchronous operation in a try/catch and converts errors to Result type
 */
export function wrapSyncOperation<T, E extends AppError>(
  operation: () => T,
  errorMapper: (error: unknown) => E,
  context?: string,
): Result<T, E> {
  try {
    const value = operation();
    return ok(value);
  } catch (error) {
    const appError = errorMapper(error);
    return err(appError);
  }
}

/**
 * Wraps a Firebase Cloud Function call and converts errors to Result type
 * @param callable - The Firebase Cloud Function callable
 * @param request - The request payload
 * @param errorMapper - Function to map caught errors to AppError
 * @param context - Optional context string for error logging
 */
export async function wrapCloudFunction<TRequest, TResponse, E extends AppError>(
  callable: (request: TRequest) => Promise<{ data: TResponse }>,
  request: TRequest,
  errorMapper: (error: unknown) => E,
  context?: string,
): Promise<Result<TResponse, E>> {
  try {
    const result = await callable(request);
    return ok(result.data);
  } catch (error) {
    const appError = errorMapper(error);
    return err(appError);
  }
}

/**
 * Wraps a fetch operation and converts errors to Result type
 * @param fetchFn - The fetch function to execute
 * @param errorMapper - Function to map caught errors to AppError
 * @param context - Optional context string for error logging
 */
export async function wrapFetch<T, E extends AppError>(
  fetchFn: () => Promise<Response>,
  errorMapper: (error: unknown) => E,
  context?: string,
): Promise<Result<T, E>> {
  try {
    const response = await fetchFn();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json()) as T;
    return ok(data);
  } catch (error) {
    const appError = errorMapper(error);
    return err(appError);
  }
}

/**
 * Wraps a blob conversion operation
 */
export async function wrapBlobConversion<T, E extends AppError>(
  blobFn: () => Promise<Blob>,
  errorMapper: (error: unknown) => E,
  context?: string,
): Promise<Result<Blob, E>> {
  try {
    const blob = await blobFn();
    return ok(blob);
  } catch (error) {
    const appError = errorMapper(error);
    return err(appError);
  }
}
