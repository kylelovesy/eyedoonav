/*---------------------------------------
File: src/services/photo-request-service.ts
Description: Photo-Request service wrapping ListService, preserving image operations and stats
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/

import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { IStorageRepository } from '@/repositories/i-storage-repository';
import {
  PhotoRequestList,
  PhotoRequestItem,
  PhotoRequestConfig,
} from '@/domain/project/photo-request.schema';
import { photoRequestListSchema } from '@/domain/project/photo-request.schema';
import { ZodSchema } from 'zod';
import { Result, err, ok } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';
import { SubscriptionPlan, PhotoRequestStatus } from '@/constants/enums';
import { getPhotoRequestLimits, canUploadImage } from '@/constants/subscriptions';

/**
 * Service for managing photo request lists
 * Wraps the generic ListService with PhotoRequest-specific types and operations
 */
export class PhotoRequestListService extends ListService<PhotoRequestList, PhotoRequestItem> {
  constructor(
    repository: IListRepository<PhotoRequestList, PhotoRequestItem>,
    private storageRepository: IStorageRepository,
  ) {
    super(
      repository,
      photoRequestListSchema as ZodSchema<PhotoRequestList>,
      'PhotoRequestListService',
    );
  }

  /**
   * Uploads a reference image for a photo request item
   * Includes subscription limit checks and automatic rollback on failure
   *
   * @param projectId - The project ID
   * @param itemId - The photo request item ID
   * @param imageBlob - The image blob to upload
   * @param subscriptionPlan - The user's subscription plan (for limit checks)
   * @returns Result containing the image URL or an error
   *
   * @example
   * ```typescript
   * const result = await photoRequestService.uploadReferenceImage(
   *   projectId,
   *   itemId,
   *   imageBlob,
   *   SubscriptionPlan.PRO
   * );
   * if (result.success) {
   *   console.log('Image uploaded:', result.value);
   * }
   * ```
   */
  async uploadReferenceImage(
    projectId: string,
    itemId: string,
    imageBlob: Blob,
    subscriptionPlan: SubscriptionPlan,
  ): Promise<Result<string, AppError>> {
    const context = ErrorContextBuilder.fromService(
      'PhotoRequestListService',
      'uploadReferenceImage',
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
          `Photo request item ${itemId} not found`,
          'Photo request not found',
          contextString,
        ),
      );
    }

    // 2. Check subscription limits
    const limits = getPhotoRequestLimits(subscriptionPlan);

    if (!limits.enabled) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Photo request images feature not enabled for this subscription',
          'Photo request images are not available for your subscription plan. Please upgrade to upload reference images.',
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Count current images for this request (check if imageUrl exists)
    const currentRequestImageCount = item.imageUrl ? 1 : 0;

    // Count total images across all requests
    const currentTotalImageCount = list.items.filter(i => i.imageUrl).length;

    if (!canUploadImage(subscriptionPlan, currentRequestImageCount, currentTotalImageCount)) {
      const limitMessage =
        currentRequestImageCount >= limits.maxImagesPerRequest
          ? `Maximum ${limits.maxImagesPerRequest} image(s) per request`
          : `Maximum ${limits.maxTotalImages} total images across all requests`;

      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          `Image upload limit exceeded: ${limitMessage}`,
          `Cannot upload image. ${limitMessage}. Please upgrade your plan for more storage.`,
          contextString,
          undefined,
          false,
        ),
      );
    }

    // 3. Upload image (imageIndex is 0 for single image support)
    const uploadResult = await this.storageRepository.uploadPhotoRequestImage(
      projectId,
      itemId,
      imageBlob,
      0,
    );

    if (!uploadResult.success) {
      return uploadResult;
    }

    const imageUrl = uploadResult.value;

    // 4. Update item with image URL
    const updateResult = await this.batchUpdateProjectItems(projectId, [
      { id: itemId, imageUrl, updatedAt: new Date() },
    ]);

    if (!updateResult.success) {
      // Rollback: Delete the uploaded image if update fails
      await this.storageRepository.deletePhotoRequestImage(projectId, itemId, imageUrl);
      return err(updateResult.error);
    }

    return ok(imageUrl);
  }

  /**
   * Deletes a reference image for a photo request item
   * Removes the image from storage and updates the item
   *
   * @param projectId - The project ID
   * @param itemId - The photo request item ID
   * @param imageUrl - The URL of the image to delete
   * @returns Result indicating success or error
   *
   * @example
   * ```typescript
   * const result = await photoRequestService.deleteReferenceImage(
   *   projectId,
   *   itemId,
   *   imageUrl
   * );
   * if (result.success) {
   *   console.log('Image deleted successfully');
   * }
   * ```
   */
  async deleteReferenceImage(
    projectId: string,
    itemId: string,
    imageUrl: string,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      'PhotoRequestListService',
      'deleteReferenceImage',
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
          `Photo request item ${itemId} not found`,
          'Photo request not found',
          contextString,
        ),
      );
    }

    // 2. Delete image from storage
    const deleteResult = await this.storageRepository.deletePhotoRequestImage(
      projectId,
      itemId,
      imageUrl,
    );

    if (!deleteResult.success) {
      return deleteResult;
    }

    // 3. Update item to remove image URL
    return await this.batchUpdateProjectItems(projectId, [
      { id: itemId, imageUrl: undefined, updatedAt: new Date() },
    ]);
  }

  /**
   * Updates the photo request configuration
   * Delegates to the repository's config update method
   *
   * @param projectId - The project ID
   * @param updates - Partial config updates
   * @returns Result indicating success or error
   *
   * @example
   * ```typescript
   * const result = await photoRequestService.updateConfig(projectId, {
   *   status: SectionStatus.LOCKED,
   *   notes: 'Updated notes'
   * });
   * ```
   */
  async updateConfig(
    projectId: string,
    updates: Partial<PhotoRequestConfig>,
  ): Promise<Result<void, AppError>> {
    // Get current list
    const listResult = await this.getProjectList(projectId);
    if (!listResult.success) {
      return listResult as Result<void, AppError>;
    }

    // Update config and save
    const updatedList: PhotoRequestList = {
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
   * Calculates statistics for a photo request list
   * Helper method for displaying stats in the UI
   *
   * @param list - The photo request list
   * @returns Statistics object
   *
   * @example
   * ```typescript
   * const stats = photoRequestService.getStats(list);
   * console.log(`Total: ${stats.totalRequests}, Completed: ${stats.completedRequests}`);
   * ```
   */
  getStats(list: PhotoRequestList): PhotoRequestStats {
    const items = list.items || [];
    const totalRequests = items.length;
    const completedRequests = items.filter(
      item =>
        item.status === PhotoRequestStatus.APPROVED ||
        item.status === PhotoRequestStatus.NOT_FEASIBLE,
    ).length;
    const requestsWithImages = items.filter(item => item.imageUrl).length;
    const totalImages = requestsWithImages; // One image per request currently

    return {
      totalRequests,
      completedRequests,
      requestsWithImages,
      totalImages,
    };
  }
}

/**
 * Statistics interface for photo request lists
 */
export interface PhotoRequestStats {
  totalRequests: number;
  completedRequests: number;
  requestsWithImages: number;
  totalImages: number;
}

/**
 * Service interface for photo request operations
 * Extends ListService capabilities with photo-request-specific methods
 */
export interface IPhotoRequestService {
  // Inherit all ListService methods
  getProjectList(projectId: string): Promise<Result<PhotoRequestList, AppError>>;
  addProjectItem(
    projectId: string,
    item: PhotoRequestItem,
  ): Promise<Result<PhotoRequestItem, AppError>>;
  deleteProjectItem(projectId: string, itemId: string): Promise<Result<void, AppError>>;
  batchUpdateProjectItems(
    projectId: string,
    updates: Array<{ id: string } & Partial<PhotoRequestItem>>,
  ): Promise<Result<void, AppError>>;
  batchDeleteProjectItems(projectId: string, itemIds: string[]): Promise<Result<void, AppError>>;
  saveProjectList(projectId: string, list: PhotoRequestList): Promise<Result<void, AppError>>;
  subscribeToProjectList(
    projectId: string,
    onUpdate: (result: Result<PhotoRequestList | null, AppError>) => void,
  ): () => void;

  // Photo-request-specific operations
  uploadReferenceImage(
    projectId: string,
    itemId: string,
    imageBlob: Blob,
    subscriptionPlan: SubscriptionPlan,
  ): Promise<Result<string, AppError>>;
  deleteReferenceImage(
    projectId: string,
    itemId: string,
    imageUrl: string,
  ): Promise<Result<void, AppError>>;
  updateConfig(
    projectId: string,
    updates: Partial<PhotoRequestConfig>,
  ): Promise<Result<void, AppError>>;
  getStats(list: PhotoRequestList): PhotoRequestStats;
}

// /*---------------------------------------
// File: src/services/photo-request-service.ts
// Description: Photo-Request service adapter wrapping ListService, preserving image operations and stats
// Author: Kyle Lovesy
// Date: 03/11-2025
// Version: 2.0.0
// ---------------------------------------*/

// import { Result, err, ok } from '@/domain/common/result';
// import { AppError } from '@/domain/common/errors';
// import {
//   PhotoRequestList,
//   PhotoRequestItem,
//   PhotoRequestItemInput,
//   PhotoRequestConfig,
//   photoRequestItemSchema,
//   photoRequestItemInputSchema,
//   defaultPhotoRequestItem,
//   photoRequestListSchema,
// } from '@/domain/project/photo-request.schema';
// import { ErrorContextBuilder } from '@/utils/error-context-builder';
// import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
// import { IPhotoRequestRepository } from '@/repositories/i-photo-request-repository';
// import { IListRepository } from '@/repositories/i-list-repository';
// import { IStorageRepository } from '@/repositories/i-storage-repository';
// import { ListService } from './list-service';
// import { generateId } from '@/utils/id-generator';
// import { SubscriptionPlan } from '@/constants/enums';
// import { ErrorMapper } from '@/utils/error-mapper';
// import { ErrorCode } from '@/constants/error-code-registry';
// import { getPhotoRequestLimits, canUploadImage } from '@/constants/subscriptions';

// /**
//  * Photo-Request service adapter
//  * Wraps ListService for generic operations and preserves Photo-Request-specific functionality
//  */
// export class PhotoRequestService implements IPhotoRequestService {
//   private readonly context = 'PhotoRequestService';
//   private readonly listService: ListService<PhotoRequestList, PhotoRequestItem>;

//   constructor(
//     private repository: IPhotoRequestRepository &
//       IListRepository<PhotoRequestList, PhotoRequestItem>,
//     private storageRepository: IStorageRepository,
//   ) {
//     // Repository adapter implements both IPhotoRequestRepository and IListRepository
//     this.listService = new ListService<PhotoRequestList, PhotoRequestItem>(
//       repository,
//       photoRequestListSchema,
//       this.context,
//     );
//   }

//   // ============================================================================
//   // CRUD OPERATIONS
//   // ============================================================================

//   async get(projectId: string): Promise<Result<PhotoRequestList, AppError>> {
//     return this.listService.getProjectList(projectId);
//   }

//   async createInitial(projectId: string): Promise<Result<void, AppError>> {
//     return this.repository.createInitial(projectId);
//   }

//   // ============================================================================
//   // ITEM OPERATIONS
//   // ============================================================================

//   async addRequest(
//     projectId: string,
//     input: PhotoRequestItemInput,
//   ): Promise<Result<PhotoRequestItem, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'addRequest',
//       undefined,
//       projectId,
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // 1. Validate input
//     const validation = validateWithSchema(photoRequestItemInputSchema, input, contextString);
//     if (!validation.success) {
//       return validation as Result<PhotoRequestItem, AppError>;
//     }

//     // 2. Create complete item with generated ID using default factory
//     const itemDefaults = defaultPhotoRequestItem(validation.value as PhotoRequestItemInput);
//     const newItem = {
//       ...itemDefaults,
//       id: generateId(),
//     } as PhotoRequestItem;

//     // 3. Validate complete item
//     const itemValidation = validateWithSchema(photoRequestItemSchema, newItem, contextString);
//     if (!itemValidation.success) {
//       return itemValidation as Result<PhotoRequestItem, AppError>;
//     }

//     // 4. Add to repository via list service
//     const addResult = await this.listService.addProjectItem(
//       projectId,
//       itemValidation.value as PhotoRequestItem,
//     );
//     if (!addResult.success) {
//       return addResult as Result<PhotoRequestItem, AppError>;
//     }

//     return ok(itemValidation.value as PhotoRequestItem);
//   }

//   async updateRequest(projectId: string, item: PhotoRequestItem): Promise<Result<void, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'updateRequest',
//       undefined,
//       projectId,
//       { itemId: item.id },
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // Validate item
//     const validation = validateWithSchema(photoRequestItemSchema, item, contextString);
//     if (!validation.success) {
//       return err(validation.error);
//     }

//     return this.listService.batchUpdateProjectItems(projectId, [
//       validation.value as PhotoRequestItem,
//     ]);
//   }

//   async deleteRequest(projectId: string, itemId: string): Promise<Result<void, AppError>> {
//     return this.listService.deleteProjectItem(projectId, itemId);
//   }

//   // ============================================================================
//   // CONFIG OPERATIONS
//   // ============================================================================

//   async updateConfig(
//     projectId: string,
//     updates: Partial<PhotoRequestConfig>,
//   ): Promise<Result<void, AppError>> {
//     return this.repository.updateConfig(projectId, updates);
//   }

//   // ============================================================================
//   // STORAGE OPERATIONS
//   // ============================================================================

//   async uploadReferenceImage(
//     projectId: string,
//     itemId: string,
//     imageBlob: Blob,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<string, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'uploadReferenceImage',
//       undefined,
//       projectId,
//       { itemId },
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // 1. Get current list to check limits
//     const listResult = await this.listService.getProjectList(projectId);
//     if (!listResult.success) {
//       return listResult as Result<string, AppError>;
//     }

//     const list = listResult.value;
//     const item = list.items.find(i => i.id === itemId);

//     if (!item) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.DB_NOT_FOUND,
//           `Photo request item ${itemId} not found`,
//           'Photo request not found',
//           contextString,
//         ),
//       );
//     }

//     // 2. Check subscription limits
//     const limits = getPhotoRequestLimits(subscriptionPlan);

//     if (!limits.enabled) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.VALIDATION_FAILED,
//           'Photo request images feature not enabled for this subscription',
//           'Photo request images are not available for your subscription plan. Please upgrade to upload reference images.',
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // Count current images for this request (check if imageUrl exists)
//     const currentRequestImageCount = item.imageUrl ? 1 : 0;

//     // Count total images across all requests
//     const currentTotalImageCount = list.items.filter(i => i.imageUrl).length;

//     if (!canUploadImage(subscriptionPlan, currentRequestImageCount, currentTotalImageCount)) {
//       const limitMessage =
//         currentRequestImageCount >= limits.maxImagesPerRequest
//           ? `Maximum ${limits.maxImagesPerRequest} image(s) per request`
//           : `Maximum ${limits.maxTotalImages} total images across all requests`;

//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.VALIDATION_FAILED,
//           `Image upload limit exceeded: ${limitMessage}`,
//           `Cannot upload image. ${limitMessage}. Please upgrade your plan for more storage.`,
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 3. Upload image (imageIndex is 0 for single image support)
//     const uploadResult = await this.storageRepository.uploadPhotoRequestImage(
//       projectId,
//       itemId,
//       imageBlob,
//       0,
//     );

//     if (!uploadResult.success) {
//       return uploadResult;
//     }

//     // 4. Update item with image URL
//     const updatedItem: PhotoRequestItem = {
//       ...item,
//       imageUrl: uploadResult.value,
//       updatedAt: new Date(),
//     };

//     const updateResult = await this.updateRequest(projectId, updatedItem);
//     if (!updateResult.success) {
//       // If update fails, try to delete the uploaded image
//       await this.storageRepository.deletePhotoRequestImage(projectId, itemId, uploadResult.value);
//       return updateResult as Result<string, AppError>;
//     }

//     return ok(uploadResult.value);
//   }

//   async deleteReferenceImage(
//     projectId: string,
//     itemId: string,
//     imageUrl: string,
//   ): Promise<Result<void, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'deleteReferenceImage',
//       undefined,
//       projectId,
//       { itemId },
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // 1. Get current list
//     const listResult = await this.listService.getProjectList(projectId);
//     if (!listResult.success) {
//       return listResult as Result<void, AppError>;
//     }

//     const list = listResult.value;
//     const item = list.items.find(i => i.id === itemId);

//     if (!item) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.DB_NOT_FOUND,
//           `Photo request item ${itemId} not found`,
//           'Photo request not found',
//           contextString,
//         ),
//       );
//     }

//     // 2. Delete image from storage
//     const deleteResult = await this.storageRepository.deletePhotoRequestImage(
//       projectId,
//       itemId,
//       imageUrl,
//     );

//     if (!deleteResult.success) {
//       return deleteResult;
//     }

//     // 3. Update item to remove image URL
//     const updatedItem: PhotoRequestItem = {
//       ...item,
//       imageUrl: undefined,
//       updatedAt: new Date(),
//     };

//     return this.updateRequest(projectId, updatedItem);
//   }

//   // ============================================================================
//   // STATS HELPER
//   // ============================================================================

//   getStats(list: PhotoRequestList): PhotoRequestStats {
//     const items = list.items || [];
//     const totalRequests = items.length;
//     const completedRequests = items.filter(
//       item => item.status === 'Completed' || item.status === 'Approved',
//     ).length;
//     const requestsWithImages = items.filter(item => item.imageUrl).length;
//     const totalImages = requestsWithImages; // One image per request currently

//     return {
//       totalRequests,
//       completedRequests,
//       requestsWithImages,
//       totalImages,
//     };
//   }
// }

// // Export interfaces for compatibility
// export interface IPhotoRequestService {
//   // CRUD operations
//   get(projectId: string): Promise<Result<PhotoRequestList, AppError>>;
//   createInitial(projectId: string): Promise<Result<void, AppError>>;

//   // Item operations
//   addRequest(
//     projectId: string,
//     input: PhotoRequestItemInput,
//   ): Promise<Result<PhotoRequestItem, AppError>>;
//   updateRequest(projectId: string, item: PhotoRequestItem): Promise<Result<void, AppError>>;
//   deleteRequest(projectId: string, itemId: string): Promise<Result<void, AppError>>;

//   // Config operations
//   updateConfig(
//     projectId: string,
//     updates: Partial<PhotoRequestConfig>,
//   ): Promise<Result<void, AppError>>;

//   // Storage operations
//   uploadReferenceImage(
//     projectId: string,
//     itemId: string,
//     imageBlob: Blob,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<string, AppError>>;
//   deleteReferenceImage(
//     projectId: string,
//     itemId: string,
//     imageUrl: string,
//   ): Promise<Result<void, AppError>>;

//   // Stats helper
//   getStats(list: PhotoRequestList): PhotoRequestStats;
// }

// export interface PhotoRequestStats {
//   totalRequests: number;
//   completedRequests: number;
//   requestsWithImages: number;
//   totalImages: number;
// }
