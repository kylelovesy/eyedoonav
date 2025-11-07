/*---------------------------------------
File: src/services/user-projects-service.ts
Description: User projects service for managing projects subcollection
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserProjects,
  UserProjectsCreate,
  UserProjectsUpdate,
  userProjectsCreateSchema,
  userProjectsUpdateSchema,
} from '@/domain/user/user.schema';
import { idSchema } from '@/domain/common/shared-schemas';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IUserProjectsRepository } from '@/repositories/i-user-projects-repository';

/**
 * Service for managing user projects subcollection
 * Handles validation and delegates to repository
 */
export class UserProjectsService {
  private readonly context = 'UserProjectsService';

  constructor(private repository: IUserProjectsRepository) {}

  /**
   * Gets user projects by ID
   */
  async get(userId: string, projectsId: string): Promise<Result<UserProjects, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const projectsIdValidation = validateWithSchema(idSchema, projectsId, contextString);
    if (!projectsIdValidation.success) {
      return err(projectsIdValidation.error);
    }

    return await this.repository.get(userId, projectsId);
  }

  /**
   * Gets user projects by userId (assumes single projects document)
   */
  async getByUserId(userId: string): Promise<Result<UserProjects, AppError>> {
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
   * Creates a new projects document
   */
  async create(
    userId: string,
    payload: UserProjectsCreate,
  ): Promise<Result<UserProjects, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate userId
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    // 2. Validate input
    const validation = validateWithSchema(userProjectsCreateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository (Zod defaults are applied at runtime)
    return await this.repository.create(userId, validation.value as UserProjectsCreate);
  }

  /**
   * Updates projects document
   */
  async update(
    userId: string,
    projectsId: string,
    updates: UserProjectsUpdate,
  ): Promise<Result<UserProjects, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const projectsIdValidation = validateWithSchema(idSchema, projectsId, contextString);
    if (!projectsIdValidation.success) {
      return err(projectsIdValidation.error);
    }

    // 2. Validate input
    const validation = validatePartialWithSchema(userProjectsUpdateSchema, updates, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 3. Delegate to repository
    return await this.repository.update(userId, projectsId, validation.value as UserProjectsUpdate);
  }

  /**
   * Deletes projects document
   */
  async delete(userId: string, projectsId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate IDs
    const userIdValidation = validateWithSchema(idSchema, userId, contextString);
    if (!userIdValidation.success) {
      return err(userIdValidation.error);
    }

    const projectsIdValidation = validateWithSchema(idSchema, projectsId, contextString);
    if (!projectsIdValidation.success) {
      return err(projectsIdValidation.error);
    }

    return await this.repository.delete(userId, projectsId);
  }

  /**
   * ✅ RECOMMENDED: Subscribes to real-time updates for projects (active project only)
   * Dashboard and progress stats depend on live project data
   * Detach when user switches project or leaves workspace
   */
  subscribeToProjects(
    userId: string,
    projectsId: string,
    onData: (result: Result<UserProjects, AppError>) => void,
  ): () => void {
    return this.repository.subscribeToProjects(userId, projectsId, onData);
  }
}
