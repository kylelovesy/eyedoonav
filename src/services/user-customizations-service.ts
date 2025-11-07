/*---------------------------------------
File: src/services/user-customizations-service.ts
Description: User customizations service for managing customizations subcollection
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserCustomizations,
  UserCustomizationsCreate,
  UserCustomizationsUpdate,
  userCustomizationsCreateSchema,
  userCustomizationsUpdateSchema,
} from '@/domain/user/user.schema';
import { idSchema } from '@/domain/common/shared-schemas';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IUserCustomizationsRepository } from '@/repositories/i-user-customizations-repository';

/**
 * Service for managing user customizations subcollection
 * Handles validation and delegates to repository
 */
export class UserCustomizationsService {
  private readonly context = 'UserCustomizationsService';

  constructor(private repository: IUserCustomizationsRepository) {}

  /**
   * Gets user customizations by ID
   */
  async get(
    userId: string,
    customizationsId: string,
  ): Promise<Result<UserCustomizations, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const customizationsIdValidation = validateWithSchema(
      idSchema,
      customizationsId,
      contextString,
    );
    if (!customizationsIdValidation.success) {
      return err(customizationsIdValidation.error);
    }

    return await this.repository.get(userId, customizationsId);
  }

  /**
   * Gets user customizations by userId (assumes single customizations document)
   */
  async getByUserId(userId: string): Promise<Result<UserCustomizations, AppError>> {
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
   * Creates a new customizations document
   */
  async create(
    userId: string,
    payload: UserCustomizationsCreate,
  ): Promise<Result<UserCustomizations, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate userId
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    // 2. Validate input
    const validation = validateWithSchema(userCustomizationsCreateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.create(userId, validation.value as UserCustomizationsCreate);
  }

  /**
   * Updates customizations document
   */
  async update(
    userId: string,
    customizationsId: string,
    updates: UserCustomizationsUpdate,
  ): Promise<Result<UserCustomizations, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const customizationsIdValidation = validateWithSchema(
      idSchema,
      customizationsId,
      contextString,
    );
    if (!customizationsIdValidation.success) {
      return err(customizationsIdValidation.error);
    }

    // 2. Validate input
    const validation = validatePartialWithSchema(
      userCustomizationsUpdateSchema,
      updates,
      contextString,
    );
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.update(userId, customizationsId, validation.value);
  }

  /**
   * Deletes customizations document
   */
  async delete(userId: string, customizationsId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const customizationsIdValidation = validateWithSchema(
      idSchema,
      customizationsId,
      contextString,
    );
    if (!customizationsIdValidation.success) {
      return err(customizationsIdValidation.error);
    }

    return await this.repository.delete(userId, customizationsId);
  }
}
