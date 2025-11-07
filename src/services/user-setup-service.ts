/*---------------------------------------
File: src/services/user-setup-service.ts
Description: User setup service for managing setup subcollection
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserSetup,
  UserSetupCreate,
  UserSetupUpdate,
  userSetupCreateSchema,
  userSetupUpdateSchema,
} from '@/domain/user/user.schema';
import { idSchema } from '@/domain/common/shared-schemas';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IUserSetupRepository } from '@/repositories/i-user-setup-repository';

/**
 * Service for managing user setup subcollection
 * Handles validation and delegates to repository
 */
export class UserSetupService {
  private readonly context = 'UserSetupService';

  constructor(private repository: IUserSetupRepository) {}

  /**
   * Gets user setup by ID
   */
  async get(userId: string, setupId: string): Promise<Result<UserSetup, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const setupIdValidation = validateWithSchema(idSchema, setupId, contextString);
    if (!setupIdValidation.success) {
      return err(setupIdValidation.error);
    }

    return await this.repository.get(userId, setupId);
  }

  /**
   * Gets user setup by userId (assumes single setup document)
   */
  async getByUserId(userId: string): Promise<Result<UserSetup, AppError>> {
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
   * Creates a new setup document
   */
  async create(userId: string, payload: UserSetupCreate): Promise<Result<UserSetup, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate userId
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    // 2. Validate input
    const validation = validateWithSchema(userSetupCreateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository (Zod defaults are applied at runtime)
    return await this.repository.create(userId, validation.value as UserSetupCreate);
  }

  /**
   * Updates setup document
   */
  async update(
    userId: string,
    setupId: string,
    updates: UserSetupUpdate,
  ): Promise<Result<UserSetup, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const setupIdValidation = validateWithSchema(idSchema, setupId, contextString);
    if (!setupIdValidation.success) {
      return err(setupIdValidation.error);
    }

    // 2. Validate input
    const validation = validatePartialWithSchema(userSetupUpdateSchema, updates, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.update(userId, setupId, validation.value as UserSetupUpdate);
  }

  /**
   * Deletes setup document
   */
  async delete(userId: string, setupId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const setupIdValidation = validateWithSchema(idSchema, setupId, contextString);
    if (!setupIdValidation.success) {
      return err(setupIdValidation.error);
    }

    return await this.repository.delete(userId, setupId);
  }

  /**
   * ⚙️ OPTIONAL: Subscribes to real-time updates for setup (TEMPORARY)
   * Use only during onboarding or setup flow; remove afterward
   */
  subscribeToSetup?(
    userId: string,
    setupId: string,
    onData: (result: Result<UserSetup, AppError>) => void,
  ): () => void {
    if (!this.repository.subscribeToSetup) {
      throw new Error('Repository does not support real-time subscriptions');
    }
    return this.repository.subscribeToSetup(userId, setupId, onData);
  }
}
