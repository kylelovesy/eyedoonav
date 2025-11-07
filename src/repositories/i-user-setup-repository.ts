/*---------------------------------------
File: src/repositories/i-user-setup-repository.ts
Description: User setup repository interface - handles /users/{userId}/setup/{setupId}
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { UserSetup, UserSetupCreate, UserSetupUpdate } from '@/domain/user/user.schema';

/**
 * Repository interface for user setup subcollection
 * Handles /users/{userId}/setup/{setupId} - onboarding and initial configuration tracking
 * ⚙️ OPTIONAL temporary listener - use during onboarding/setup flow; remove afterward
 */
export interface IUserSetupRepository {
  /**
   * Gets user setup by ID (fetch-only by default)
   * @param userId - The user ID
   * @param setupId - The setup document ID
   * @returns UserSetup or error
   */
  get(userId: string, setupId: string): Promise<Result<UserSetup, AppError>>;

  /**
   * Gets the user's setup (assumes single setup document)
   * Fetches first document in setup subcollection
   * @param userId - The user ID
   * @returns UserSetup or error
   */
  getByUserId(userId: string): Promise<Result<UserSetup, AppError>>;

  /**
   * Creates a new setup document
   * @param userId - The user ID
   * @param payload - Setup creation data
   * @returns Created UserSetup or error
   */
  create(userId: string, payload: UserSetupCreate): Promise<Result<UserSetup, AppError>>;

  /**
   * Updates setup document
   * @param userId - The user ID
   * @param setupId - The setup document ID
   * @param updates - Partial update data
   * @returns Updated UserSetup or error
   */
  update(
    userId: string,
    setupId: string,
    updates: UserSetupUpdate,
  ): Promise<Result<UserSetup, AppError>>;

  /**
   * Deletes setup document
   * @param userId - The user ID
   * @param setupId - The setup document ID
   * @returns Success or error
   */
  delete(userId: string, setupId: string): Promise<Result<void, AppError>>;

  /**
   * ⚙️ OPTIONAL: Subscribes to real-time updates for setup (TEMPORARY - remove after onboarding)
   * Use only during onboarding or setup flow; remove afterward
   * @param userId - The user ID
   * @param setupId - The setup document ID
   * @param onData - Callback when data changes (Result type)
   * @returns Unsubscribe function for cleanup
   */
  subscribeToSetup?(
    userId: string,
    setupId: string,
    onData: (result: Result<UserSetup, AppError>) => void,
  ): () => void;
}
