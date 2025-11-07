/*---------------------------------------
File: src/services/user-preferences-service.ts
Description: User preferences service for managing preferences subcollection
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserPreferences,
  UserPreferencesCreate,
  UserPreferencesUpdate,
  userPreferencesCreateSchema,
  userPreferencesUpdateSchema,
} from '@/domain/user/user.schema';
import { idSchema } from '@/domain/common/shared-schemas';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IUserPreferencesRepository } from '@/repositories/i-user-preferences-repository';

/**
 * Service for managing user preferences subcollection
 * Handles validation and delegates to repository
 */
export class UserPreferencesService {
  private readonly context = 'UserPreferencesService';

  constructor(private repository: IUserPreferencesRepository) {}

  /**
   * Gets user preferences by ID
   */
  async get(userId: string, preferencesId: string): Promise<Result<UserPreferences, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const preferencesIdValidation = validateWithSchema(idSchema, preferencesId, contextString);
    if (!preferencesIdValidation.success) {
      return err(preferencesIdValidation.error);
    }

    return await this.repository.get(userId, preferencesId);
  }

  /**
   * Gets user preferences by userId (assumes single preferences document)
   */
  async getByUserId(userId: string): Promise<Result<UserPreferences, AppError>> {
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
   * Creates a new preferences document
   */
  async create(
    userId: string,
    payload: UserPreferencesCreate,
  ): Promise<Result<UserPreferences, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate userId
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    // 2. Validate input
    const validation = validateWithSchema(userPreferencesCreateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.create(userId, validation.value as UserPreferencesCreate);
  }

  /**
   * Updates preferences document
   */
  async update(
    userId: string,
    preferencesId: string,
    updates: UserPreferencesUpdate,
  ): Promise<Result<UserPreferences, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const preferencesIdValidation = validateWithSchema(idSchema, preferencesId, contextString);
    if (!preferencesIdValidation.success) {
      return err(preferencesIdValidation.error);
    }

    // 2. Validate input
    const validation = validatePartialWithSchema(
      userPreferencesUpdateSchema,
      updates,
      contextString,
    );
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.update(userId, preferencesId, validation.value);
  }

  /**
   * ⚙️ OPTIONAL: Subscribes to real-time updates for preferences
   * Use only if you need instant UI reflection (e.g., darkMode toggle)
   */
  subscribeToPreferences?(
    userId: string,
    preferencesId: string,
    onData: (result: Result<UserPreferences, AppError>) => void,
  ): () => void {
    if (!this.repository.subscribeToPreferences) {
      throw new Error('Repository does not support real-time subscriptions');
    }
    return this.repository.subscribeToPreferences(userId, preferencesId, onData);
  }
}
