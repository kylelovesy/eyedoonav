/*---------------------------------------
File: src/services/base-user-service.ts
Description: Base user service for managing core user document
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  BaseUser,
  BaseUserCreate,
  BaseUserUpdate,
  baseUserCreateSchema,
  baseUserUpdateSchema,
  UserBanInput,
  userBanInputSchema,
  UserRoleUpdate,
  userRoleUpdateSchema,
} from '@/domain/user/user.schema';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IBaseUserRepository } from '@/repositories/i-base-user-repository';
import { idSchema } from '@/domain/common/shared-schemas';

/**
 * Service for managing base user document
 * Handles validation and delegates to repository
 */
export class BaseUserService {
  private readonly context = 'BaseUserService';

  constructor(private repository: IBaseUserRepository) {}

  /**
   * Gets a base user by ID
   */
  async getById(userId: string): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'getById', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate userId
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    // Delegate to repository
    return await this.repository.getById(userId);
  }

  /**
   * Creates a base user document
   */
  async create(userId: string, payload: BaseUserCreate): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(baseUserCreateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.create(userId, validation.value as BaseUserCreate);
  }

  /**
   * Updates base user document
   */
  async update(userId: string, payload: BaseUserUpdate): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validatePartialWithSchema(baseUserUpdateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.update(userId, validation.value);
  }

  /**
   * Subscribes to real-time updates for base user
   */
  subscribeToUser(
    userId: string,
    onData: (result: Result<BaseUser, AppError>) => void,
  ): () => void {
    return this.repository.subscribeToUser(userId, onData);
  }

  /**
   * Updates last login timestamp
   */
  async updateLastLogin(userId: string): Promise<Result<void, AppError>> {
    return await this.repository.updateLastLogin(userId);
  }

  /**
   * Updates email verification status
   */
  async updateEmailVerification(
    userId: string,
    isVerified: boolean,
  ): Promise<Result<void, AppError>> {
    return await this.repository.updateEmailVerification(userId, isVerified);
  }

  // --- Admin Operations ---

  /**
   * Bans a user
   */
  async banUser(userId: string, payload: UserBanInput): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'banUser', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(userBanInputSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.banUser(userId, validation.value);
  }

  /**
   * Unbans a user
   */
  async unbanUser(userId: string): Promise<Result<void, AppError>> {
    return await this.repository.unbanUser(userId);
  }

  /**
   * Updates user role
   */
  async updateRole(userId: string, payload: UserRoleUpdate): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'updateRole', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(userRoleUpdateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.updateRole(userId, validation.value);
  }

  /**
   * Soft deletes a user
   */
  async delete(userId: string): Promise<Result<void, AppError>> {
    return await this.repository.delete(userId);
  }

  /**
   * Permanently deletes a user
   */
  async permanentlyDelete(userId: string): Promise<Result<void, AppError>> {
    return await this.repository.permanentlyDelete(userId);
  }
}
