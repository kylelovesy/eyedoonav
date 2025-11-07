/*---------------------------------------
File: src/services/base-project-service.ts
Description: Base project service for managing core project document
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  BaseProject,
  BaseProjectInput,
  BaseProjectUpdate,
  baseProjectInputSchema,
  baseProjectUpdateSchema,
} from '@/domain/project/project.schema';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IBaseProjectRepository } from '@/repositories/i-base-project-repository';
import { Transaction } from 'firebase/firestore';

/**
 * Service for managing base project document
 * Handles validation and delegates to repository
 */
export class BaseProjectService {
  private readonly context = 'BaseProjectService';

  constructor(private repository: IBaseProjectRepository) {}

  /**
   * Gets a project by ID
   */
  async getById(projectId: string): Promise<Result<BaseProject, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'getById', undefined, projectId);
    return await this.repository.getById(projectId);
  }

  /**
   * Creates a new project
   * @param userId - The ID of the user creating the project
   * @param payload - Project creation input
   * @param tx - Optional Firestore transaction for atomic operations
   */
  async create(
    userId: string,
    payload: BaseProjectInput,
    tx?: Transaction,
  ): Promise<Result<BaseProject, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(baseProjectInputSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.create(userId, validation.value as BaseProjectInput, tx);
  }

  /**
   * Gets all projects for a user
   */
  async listByUserId(userId: string): Promise<Result<BaseProject[], AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'listByUserId', userId);
    return await this.repository.listByUserId(userId);
  }

  /**
   * ✅ RECOMMENDED: Subscribes to real-time updates for user's projects
   * Only active when user is on project management screens
   * Detach when user leaves the screen, logs out, or app closes/minimizes
   */
  subscribeToUserProjects(
    userId: string,
    onData: (result: Result<BaseProject[], AppError>) => void,
  ): () => void {
    return this.repository.subscribeToUserProjects(userId, onData);
  }

  /**
   * Updates a project
   */
  async update(projectId: string, payload: BaseProjectUpdate): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', undefined, projectId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validatePartialWithSchema(baseProjectUpdateSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.update(projectId, validation.value as BaseProjectUpdate);
  }

  /**
   * Deletes a project
   */
  async delete(projectId: string, userId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'delete', userId, projectId);
    return await this.repository.delete(projectId, userId);
  }
}
