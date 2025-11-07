/*---------------------------------------
File: src/repositories/i-user-subscription-repository.ts
Description: User subscription repository interface - handles /users/{userId}/subscription/{subscriptionId}
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserSubscription,
  UserSubscriptionCreate,
  UserSubscriptionUpdate,
} from '@/domain/user/user.schema';

/**
 * Repository interface for user subscription subcollection
 * Handles /users/{userId}/subscription/{subscriptionId} - billing and subscription management
 * ✅ YES real-time listener - needed for plan gating, feature unlocks, and renewal/cancel state
 */
export interface IUserSubscriptionRepository {
  /**
   * Gets user subscription by ID (one-time fetch)
   * @param userId - The user ID
   * @param subscriptionId - The subscription document ID
   * @returns UserSubscription or error
   */
  get(userId: string, subscriptionId: string): Promise<Result<UserSubscription, AppError>>;

  /**
   * Gets the user's subscription (assumes single subscription document)
   * Fetches first document in subscription subcollection
   * @param userId - The user ID
   * @returns UserSubscription or error
   */
  getByUserId(userId: string): Promise<Result<UserSubscription, AppError>>;

  /**
   * Creates a new subscription document
   * @param userId - The user ID
   * @param payload - Subscription creation data
   * @returns Created UserSubscription or error
   */
  create(
    userId: string,
    payload: UserSubscriptionCreate,
  ): Promise<Result<UserSubscription, AppError>>;

  /**
   * Updates subscription document
   * @param userId - The user ID
   * @param subscriptionId - The subscription document ID
   * @param updates - Partial update data
   * @returns Updated UserSubscription or error
   */
  update(
    userId: string,
    subscriptionId: string,
    updates: UserSubscriptionUpdate,
  ): Promise<Result<UserSubscription, AppError>>;

  /**
   * Deletes subscription document
   * @param userId - The user ID
   * @param subscriptionId - The subscription document ID
   * @returns Success or error
   */
  delete(userId: string, subscriptionId: string): Promise<Result<void, AppError>>;

  /**
   * Subscribes to real-time updates for subscription (✅ RECOMMENDED - keep listener lightweight)
   * Needed for plan gating, feature unlocks, and renewal/cancel state
   * @param userId - The user ID
   * @param subscriptionId - The subscription document ID
   * @param onData - Callback when data changes (Result type)
   * @returns Unsubscribe function for cleanup
   */
  subscribeToSubscription(
    userId: string,
    subscriptionId: string,
    onData: (result: Result<UserSubscription, AppError>) => void,
  ): () => void;
}
