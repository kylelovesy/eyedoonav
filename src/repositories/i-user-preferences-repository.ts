/*---------------------------------------
File: src/repositories/i-user-preferences-repository.ts
Description: User preferences repository interface - handles /users/{userId}/preferences/{preferencesId}
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserPreferences,
  UserPreferencesCreate,
  UserPreferencesUpdate,
} from '@/domain/user/user.schema';

/**
 * Repository interface for user preferences subcollection
 * Handles /users/{userId}/preferences/{preferencesId} - user settings and app preferences
 * ⚙️ OPTIONAL light listener - only if instant UI reflection needed (e.g., darkMode toggle)
 */
export interface IUserPreferencesRepository {
  /**
   * Gets user preferences by ID (fetch-only by default)
   * @param userId - The user ID
   * @param preferencesId - The preferences document ID
   * @returns UserPreferences or error
   */
  get(userId: string, preferencesId: string): Promise<Result<UserPreferences, AppError>>;

  /**
   * Gets the user's preferences (assumes single preferences document)
   * Fetches first document in preferences subcollection
   * @param userId - The user ID
   * @returns UserPreferences or error
   */
  getByUserId(userId: string): Promise<Result<UserPreferences, AppError>>;

  /**
   * Creates a new preferences document
   * @param userId - The user ID
   * @param payload - Preferences creation data
   * @returns Created UserPreferences or error
   */
  create(
    userId: string,
    payload: UserPreferencesCreate,
  ): Promise<Result<UserPreferences, AppError>>;

  /**
   * Updates preferences document
   * @param userId - The user ID
   * @param preferencesId - The preferences document ID
   * @param updates - Partial update data
   * @returns Updated UserPreferences or error
   */
  update(
    userId: string,
    preferencesId: string,
    updates: UserPreferencesUpdate,
  ): Promise<Result<UserPreferences, AppError>>;

  /**
   * ⚙️ OPTIONAL: Subscribes to real-time updates for preferences
   * Use only if you need instant UI reflection (e.g., darkMode toggle)
   * @param userId - The user ID
   * @param preferencesId - The preferences document ID
   * @param onData - Callback when data changes (Result type)
   * @returns Unsubscribe function for cleanup
   */
  subscribeToPreferences?(
    userId: string,
    preferencesId: string,
    onData: (result: Result<UserPreferences, AppError>) => void,
  ): () => void;
}
