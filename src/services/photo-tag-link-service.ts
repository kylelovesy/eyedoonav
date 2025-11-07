/*---------------------------------------
File: src/services/photo-tag-link-service.ts
Description: PhotoTagLink service for managing photo tag links (local storage)

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 2.0.0
---------------------------------------*/

import { Result, ok } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  PhotoTagLink,
  PhotoTagLinkInput,
  PhotoTagLinkUpdate,
  photoTagLinkInputSchema,
  photoTagLinkUpdateSchema,
} from '@/domain/scoped/tag.schema';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IPhotoTagLinkRepository } from '@/repositories/i-photo-tag-link-repository';
import { SubscriptionPlan } from '@/constants/enums';
import { canSharePhotos } from '@/constants/subscriptions';

export interface IPhotoTagLinkService {
  /**
   * Retrieves all photo tag links
   * @returns Result containing an array of photo tag links or an error
   */
  getAll(): Promise<Result<PhotoTagLink[], AppError>>;

  /**
   * Retrieves a single photo tag link by its ID
   * @param id The ID of the photo tag link
   * @returns Result containing the photo tag link or an error
   */
  getById(id: string): Promise<Result<PhotoTagLink, AppError>>;

  /**
   * Retrieves all photo tag links for a specific project
   * @param projectId The ID of the project
   * @returns Result containing an array of photo tag links or an error
   */
  getByProjectId(projectId: string): Promise<Result<PhotoTagLink[], AppError>>;

  /**
   * Creates a new photo tag link
   * @param input The photo tag link input data
   * @param subscriptionPlan The user's subscription plan (for sharing feature check)
   * @returns Result containing the created photo tag link or an error
   */
  create(
    input: PhotoTagLinkInput,
    subscriptionPlan: SubscriptionPlan,
  ): Promise<Result<PhotoTagLink, AppError>>;

  /**
   * Updates an existing photo tag link
   * @param id The ID of the photo tag link to update
   * @param updates The partial photo tag link data to update
   * @returns Result indicating success or failure
   */
  update(id: string, updates: PhotoTagLinkUpdate): Promise<Result<void, AppError>>;

  /**
   * Deletes a photo tag link (and the referenced photo file)
   * @param id The ID of the photo tag link to delete
   * @returns Result indicating success or failure
   */
  delete(id: string): Promise<Result<void, AppError>>;
}

export class PhotoTagLinkService implements IPhotoTagLinkService {
  private readonly context = 'PhotoTagLinkService';

  constructor(private repository: IPhotoTagLinkRepository) {}

  /**
   * Retrieves all photo tag links
   *
   * @returns Result containing an array of photo tag links or an error
   */
  async getAll(): Promise<Result<PhotoTagLink[], AppError>> {
    return this.repository.getAll();
  }

  /**
   * Retrieves a single photo tag link by its ID
   *
   * @param id The ID of the photo tag link
   * @returns Result containing the photo tag link or an error
   */
  async getById(id: string): Promise<Result<PhotoTagLink, AppError>> {
    return this.repository.getById(id);
  }

  /**
   * Retrieves all photo tag links for a specific project
   *
   * @param projectId The ID of the project
   * @returns Result containing an array of photo tag links or an error
   */
  async getByProjectId(projectId: string): Promise<Result<PhotoTagLink[], AppError>> {
    const allResult = await this.repository.getAll();
    if (!allResult.success) {
      return allResult;
    }

    // Filter by projectId
    const filtered = allResult.value.filter(link => link.projectId === projectId);
    return ok(filtered);
  }

  /**
   * Creates a new photo tag link
   *
   * @param input The photo tag link input data
   * @param subscriptionPlan The user's subscription plan (for sharing feature check)
   * @returns Result containing the created photo tag link or an error
   */
  async create(
    input: PhotoTagLinkInput,
    _subscriptionPlan: SubscriptionPlan, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<Result<PhotoTagLink, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'create',
      undefined,
      input.projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Note: Sharing feature check is done at UI level when user tries to share
    // Basic photo tagging is available to all subscription tiers that have tags enabled

    // 1. Validate input
    const validation = validateWithSchema(photoTagLinkInputSchema, input, contextString);
    if (!validation.success) {
      return validation as Result<PhotoTagLink, AppError>;
    }

    // 2. Create complete photo tag link with generated ID
    const newLink: PhotoTagLinkInput = {
      ...validation.value,
      tagIds: validation.value.tagIds || [],
      projectId: validation.value.projectId,
    };

    // 3. Validate complete link
    const linkValidation = validateWithSchema(photoTagLinkInputSchema, newLink, contextString);
    if (!linkValidation.success) {
      return linkValidation as Result<PhotoTagLink, AppError>;
    }

    // 4. Create in repository
    const createResult = await this.repository.create(newLink as PhotoTagLink);
    if (!createResult.success) {
      return createResult as Result<PhotoTagLink, AppError>;
    }

    return ok(newLink as PhotoTagLink);
  }

  /**
   * Updates an existing photo tag link
   *
   * @param id The ID of the photo tag link to update
   * @param updates The partial photo tag link data to update
   * @returns Result indicating success or failure
   */
  async update(id: string, updates: PhotoTagLinkUpdate): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'update', undefined, undefined, {
      linkId: id,
    });
    const contextString = ErrorContextBuilder.toString(context);

    // Validate updates
    const validation = validatePartialWithSchema(photoTagLinkUpdateSchema, updates, contextString);
    if (!validation.success) {
      return validation;
    }

    return this.repository.update(id, validation.value as PhotoTagLinkUpdate);
  }

  /**
   * Deletes a photo tag link (and the referenced photo file)
   *
   * @param id The ID of the photo tag link to delete
   * @returns Result indicating success or failure
   */
  async delete(id: string): Promise<Result<void, AppError>> {
    return this.repository.delete(id);
  }

  /**
   * Checks if photo sharing is enabled for the subscription plan
   * This is a helper method for UI components
   *
   * @param subscriptionPlan The subscription plan
   * @returns True if sharing is enabled, false otherwise
   */
  canShare(subscriptionPlan: SubscriptionPlan): boolean {
    return canSharePhotos(subscriptionPlan);
  }
}
