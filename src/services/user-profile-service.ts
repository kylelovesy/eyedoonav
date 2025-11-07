/*---------------------------------------
File: src/services/user-profile-service.ts
Description: User profile service for managing profile subcollection
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserProfile,
  UserProfileCreate,
  UserProfileUpdate,
  userProfileCreateSchema,
  userProfileUpdateSchema,
} from '@/domain/user/user.schema';
import { idSchema } from '@/domain/common/shared-schemas';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IUserProfileRepository } from '@/repositories/i-user-profile-repository';

/**
 * Service for managing user profile subcollection
 * Handles validation and delegates to repository
 */
export class UserProfileService {
  private readonly context = 'UserProfileService';

  constructor(private repository: IUserProfileRepository) {}

  /**
   * Gets user profile by ID
   */
  async get(userId: string, profileId: string): Promise<Result<UserProfile, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const profileIdValidation = validateWithSchema(idSchema, profileId, contextString);
    if (!profileIdValidation.success) {
      return err(profileIdValidation.error);
    }

    return await this.repository.get(userId, profileId);
  }

  /**
   * Gets user profile by userId (assumes single profile document)
   */
  async getByUserId(userId: string): Promise<Result<UserProfile, AppError>> {
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
   * Creates a new profile document
   */
  async create(userId: string, payload: UserProfileCreate): Promise<Result<UserProfile, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate userId
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    // 2. Validate input
    const validation = validateWithSchema(userProfileCreateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.create(userId, validation.value as UserProfileCreate);
  }

  /**
   * Updates profile document
   */
  async update(
    userId: string,
    profileId: string,
    updates: UserProfileUpdate,
  ): Promise<Result<UserProfile, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const profileIdValidation = validateWithSchema(idSchema, profileId, contextString);
    if (!profileIdValidation.success) {
      return err(profileIdValidation.error);
    }

    // 2. Validate input
    const validation = validatePartialWithSchema(userProfileUpdateSchema, updates, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.update(userId, profileId, validation.value);
  }

  /**
   * Deletes profile document
   */
  async delete(userId: string, profileId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const profileIdValidation = validateWithSchema(idSchema, profileId, contextString);
    if (!profileIdValidation.success) {
      return err(profileIdValidation.error);
    }

    return await this.repository.delete(userId, profileId);
  }
}
