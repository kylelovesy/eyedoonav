/*---------------------------------------
File: src/services/user-subscription-service.ts
Description: User subscription service for managing subscription subcollection
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserSubscription,
  UserSubscriptionCreate,
  UserSubscriptionUpdate,
  userSubscriptionCreateSchema,
  userSubscriptionUpdateSchema,
} from '@/domain/user/user.schema';
import { idSchema } from '@/domain/common/shared-schemas';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IUserSubscriptionRepository } from '@/repositories/i-user-subscription-repository';

/**
 * Service for managing user subscription subcollection
 * Handles validation and delegates to repository
 */
export class UserSubscriptionService {
  private readonly context = 'UserSubscriptionService';

  constructor(private repository: IUserSubscriptionRepository) {}

  /**
   * Gets user subscription by ID
   */
  async get(userId: string, subscriptionId: string): Promise<Result<UserSubscription, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const subscriptionIdValidation = validateWithSchema(idSchema, subscriptionId, contextString);
    if (!subscriptionIdValidation.success) {
      return err(subscriptionIdValidation.error);
    }

    return await this.repository.get(userId, subscriptionId);
  }

  /**
   * Gets user subscription by userId (assumes single subscription document)
   */
  async getByUserId(userId: string): Promise<Result<UserSubscription, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'getByUserId', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate userId
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    return await this.repository.getByUserId(userId);
  }

  /**
   * Creates a new subscription document
   */
  async create(
    userId: string,
    payload: UserSubscriptionCreate,
  ): Promise<Result<UserSubscription, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate userId
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    // 2. Validate input
    const validation = validateWithSchema(userSubscriptionCreateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository (Zod defaults are applied, so type is correct)
    return await this.repository.create(userId, validation.value as UserSubscriptionCreate);
  }

  /**
   * Updates subscription document
   */
  async update(
    userId: string,
    subscriptionId: string,
    updates: UserSubscriptionUpdate,
  ): Promise<Result<UserSubscription, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const subscriptionIdValidation = validateWithSchema(idSchema, subscriptionId, contextString);
    if (!subscriptionIdValidation.success) {
      return err(subscriptionIdValidation.error);
    }

    // 2. Validate input
    const validation = validatePartialWithSchema(
      userSubscriptionUpdateSchema,
      updates,
      contextString,
    );
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.update(userId, subscriptionId, validation.value);
  }

  /**
   * Deletes subscription document
   */
  async delete(userId: string, subscriptionId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const subscriptionIdValidation = validateWithSchema(idSchema, subscriptionId, contextString);
    if (!subscriptionIdValidation.success) {
      return err(subscriptionIdValidation.error);
    }

    return await this.repository.delete(userId, subscriptionId);
  }

  /**
   * ✅ RECOMMENDED: Subscribes to real-time updates for subscription
   * Needed for plan gating, feature unlocks, and renewal/cancel state
   */
  subscribeToSubscription(
    userId: string,
    subscriptionId: string,
    onData: (result: Result<UserSubscription, AppError>) => void,
  ): () => void {
    return this.repository.subscribeToSubscription(userId, subscriptionId, onData);
  }
}
