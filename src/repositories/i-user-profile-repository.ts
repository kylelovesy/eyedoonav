/*---------------------------------------
File: src/repositories/i-user-profile-repository.ts
Description: User profile repository interface - handles /users/{userId}/profile/{profileId}
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { UserProfile, UserProfileCreate, UserProfileUpdate } from '@/domain/user/user.schema';

/**
 * Repository interface for user profile subcollection
 * Handles /users/{userId}/profile/{profileId} - extended profile information
 * ❌ NO real-time listener - fetch only when needed
 */
export interface IUserProfileRepository {
  /**
   * Gets user profile by ID (fetch-only, no listener)
   * @param userId - The user ID
   * @param profileId - The profile document ID
   * @returns UserProfile or error
   */
  get(userId: string, profileId: string): Promise<Result<UserProfile, AppError>>;

  /**
   * Gets the user's profile (assumes single profile document)
   * Fetches first document in profile subcollection
   * @param userId - The user ID
   * @returns UserProfile or error
   */
  getByUserId(userId: string): Promise<Result<UserProfile, AppError>>;

  /**
   * Creates a new profile document
   * @param userId - The user ID
   * @param payload - Profile creation data
   * @returns Created UserProfile or error
   */
  create(userId: string, payload: UserProfileCreate): Promise<Result<UserProfile, AppError>>;

  /**
   * Updates profile document
   * @param userId - The user ID
   * @param profileId - The profile document ID
   * @param updates - Partial update data
   * @returns Updated UserProfile or error
   */
  update(
    userId: string,
    profileId: string,
    updates: UserProfileUpdate,
  ): Promise<Result<UserProfile, AppError>>;

  /**
   * Deletes profile document
   * @param userId - The user ID
   * @param profileId - The profile document ID
   * @returns Success or error
   */
  delete(userId: string, profileId: string): Promise<Result<void, AppError>>;
}
