/*---------------------------------------
File: src/services/key-people-service.ts
Description: Key-People service wrapping ListService, preserving avatar operations and stats
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/

import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { IStorageRepository } from '@/repositories/i-storage-repository';
import { KeyPeopleList, KeyPeopleItem, KeyPeopleConfig } from '@/domain/project/key-people.schema';
import { keyPeopleListSchema } from '@/domain/project/key-people.schema';
import { ZodSchema } from 'zod';
import { Result, err, ok } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';
import { SubscriptionPlan } from '@/constants/enums';
import { getKeyPeopleLimits, canAddAvatar } from '@/constants/subscriptions';

/**
 * Service for managing key people lists
 * Wraps the generic ListService with KeyPeople-specific types and operations
 */
export class KeyPeopleListService extends ListService<KeyPeopleList, KeyPeopleItem> {
  constructor(
    repository: IListRepository<KeyPeopleList, KeyPeopleItem>,
    private storageRepository: IStorageRepository,
  ) {
    super(repository, keyPeopleListSchema as ZodSchema<KeyPeopleList>, 'KeyPeopleListService');
  }

  /**
   * Uploads an avatar image for a key people item
   * Includes subscription limit checks and automatic rollback on failure
   *
   * @param projectId - The project ID
   * @param itemId - The key people item ID
   * @param imageBlob - The image blob to upload
   * @param subscriptionPlan - The user's subscription plan (for limit checks)
   * @returns Result containing the image URL or an error
   *
   * @example
   * ```typescript
   * const result = await keyPeopleService.uploadAvatar(
   *   projectId,
   *   itemId,
   *   imageBlob,
   *   SubscriptionPlan.PRO
   * );
   * if (result.success) {
   *   console.log('Avatar uploaded:', result.value);
   * }
   * ```
   */
  async uploadAvatar(
    projectId: string,
    itemId: string,
    imageBlob: Blob,
    subscriptionPlan: SubscriptionPlan,
  ): Promise<Result<string, AppError>> {
    const context = ErrorContextBuilder.fromService(
      'KeyPeopleListService',
      'uploadAvatar',
      undefined,
      projectId,
      { itemId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Get current list to check limits and find item
    const listResult = await this.getProjectList(projectId);
    if (!listResult.success) {
      return listResult as Result<string, AppError>;
    }

    const list = listResult.value;
    const item = list.items.find(i => i.id === itemId);

    if (!item) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          `Key people item ${itemId} not found`,
          'Person not found',
          contextString,
        ),
      );
    }

    // 2. Check subscription limits
    const limits = getKeyPeopleLimits(subscriptionPlan);

    if (!limits.enabled) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Key people avatars feature not enabled for this subscription',
          'Avatars are not available for your subscription plan. Please upgrade to add avatars.',
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Count current avatars
    const currentAvatarCount = list.items.filter(i => i.avatar).length;

    if (!canAddAvatar(subscriptionPlan, currentAvatarCount)) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          `Avatar limit exceeded: Maximum ${limits.maxAvatars} avatar(s) allowed`,
          `Cannot upload avatar. Maximum ${limits.maxAvatars} avatar(s) allowed. Please upgrade your plan for more avatars.`,
          contextString,
          undefined,
          false,
        ),
      );
    }

    // 3. Upload image
    const uploadResult = await this.storageRepository.uploadKeyPeopleAvatar(
      projectId,
      itemId,
      imageBlob,
    );

    if (!uploadResult.success) {
      return uploadResult;
    }

    const avatarUrl = uploadResult.value;

    // 4. Update item with avatar URL
    const updateResult = await this.batchUpdateProjectItems(projectId, [
      { id: itemId, avatar: avatarUrl },
    ]);

    if (!updateResult.success) {
      // Rollback: Delete the uploaded image if update fails
      await this.storageRepository.deleteKeyPeopleAvatar(projectId, itemId, avatarUrl);
      return err(updateResult.error);
    }

    return ok(avatarUrl);
  }

  /**
   * Deletes an avatar image for a key people item
   * Removes the image from storage and updates the item
   *
   * @param projectId - The project ID
   * @param itemId - The key people item ID
   * @param imageUrl - The URL of the image to delete
   * @returns Result indicating success or error
   *
   * @example
   * ```typescript
   * const result = await keyPeopleService.deleteAvatar(
   *   projectId,
   *   itemId,
   *   imageUrl
   * );
   * if (result.success) {
   *   console.log('Avatar deleted successfully');
   * }
   * ```
   */
  async deleteAvatar(
    projectId: string,
    itemId: string,
    imageUrl: string,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      'KeyPeopleListService',
      'deleteAvatar',
      undefined,
      projectId,
      { itemId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Get current list to find item
    const listResult = await this.getProjectList(projectId);
    if (!listResult.success) {
      return listResult as Result<void, AppError>;
    }

    const list = listResult.value;
    const item = list.items.find(i => i.id === itemId);

    if (!item) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          `Key people item ${itemId} not found`,
          'Person not found',
          contextString,
        ),
      );
    }

    // 2. Delete image from storage
    const deleteResult = await this.storageRepository.deleteKeyPeopleAvatar(
      projectId,
      itemId,
      imageUrl,
    );

    if (!deleteResult.success) {
      return deleteResult;
    }

    // 3. Update item to remove avatar URL
    return await this.batchUpdateProjectItems(projectId, [{ id: itemId, avatar: undefined }]);
  }

  /**
   * Updates the key people configuration
   * Merges updates with existing config and saves the list
   *
   * @param projectId - The project ID
   * @param updates - Partial config updates
   * @returns Result indicating success or error
   *
   * @example
   * ```typescript
   * const result = await keyPeopleService.updateConfig(projectId, {
   *   status: SectionStatus.LOCKED,
   *   notes: 'Updated notes'
   * });
   * ```
   */
  async updateConfig(
    projectId: string,
    updates: Partial<KeyPeopleConfig>,
  ): Promise<Result<void, AppError>> {
    // Get current list
    const listResult = await this.getProjectList(projectId);
    if (!listResult.success) {
      return listResult as Result<void, AppError>;
    }

    // Update config and save
    const updatedList: KeyPeopleList = {
      ...listResult.value,
      config: {
        ...listResult.value.config,
        ...updates,
        updatedAt: new Date(),
      },
    };

    return await this.saveProjectList(projectId, updatedList);
  }

  /**
   * Calculates statistics for a key people list
   * Helper method for displaying stats in the UI
   *
   * @param list - The key people list
   * @returns Statistics object
   *
   * @example
   * ```typescript
   * const stats = keyPeopleService.getStats(list);
   * console.log(`Total: ${stats.totalPeople}, VIPs: ${stats.vipCount}`);
   * ```
   */
  getStats(list: KeyPeopleList): KeyPeopleStats {
    const items = list.items || [];
    const totalPeople = items.length;
    const vipCount = items.filter(item => item.isVIP).length;
    const peopleWithAvatars = items.filter(item => item.avatar).length;
    const peopleWithContact = items.filter(
      item => item.contact?.email || item.contact?.phone,
    ).length;

    return {
      totalPeople,
      vipCount,
      peopleWithAvatars,
      peopleWithContact,
    };
  }
}

/**
 * Statistics interface for key people lists
 */
export interface KeyPeopleStats {
  totalPeople: number;
  vipCount: number;
  peopleWithAvatars: number;
  peopleWithContact: number;
}

/**
 * Service interface for key people operations
 * Extends ListService capabilities with key-people-specific methods
 */
export interface IKeyPeopleService {
  // Inherit all ListService methods
  getProjectList(projectId: string): Promise<Result<KeyPeopleList, AppError>>;
  addProjectItem(projectId: string, item: KeyPeopleItem): Promise<Result<KeyPeopleItem, AppError>>;
  deleteProjectItem(projectId: string, itemId: string): Promise<Result<void, AppError>>;
  batchUpdateProjectItems(
    projectId: string,
    updates: Array<{ id: string } & Partial<KeyPeopleItem>>,
  ): Promise<Result<void, AppError>>;
  batchDeleteProjectItems(projectId: string, itemIds: string[]): Promise<Result<void, AppError>>;
  saveProjectList(projectId: string, list: KeyPeopleList): Promise<Result<void, AppError>>;
  subscribeToProjectList(
    projectId: string,
    onUpdate: (result: Result<KeyPeopleList | null, AppError>) => void,
  ): () => void;

  // Key-people-specific operations
  uploadAvatar(
    projectId: string,
    itemId: string,
    imageBlob: Blob,
    subscriptionPlan: SubscriptionPlan,
  ): Promise<Result<string, AppError>>;
  deleteAvatar(
    projectId: string,
    itemId: string,
    imageUrl: string,
  ): Promise<Result<void, AppError>>;
  updateConfig(
    projectId: string,
    updates: Partial<KeyPeopleConfig>,
  ): Promise<Result<void, AppError>>;
  getStats(list: KeyPeopleList): KeyPeopleStats;
}
