/*---------------------------------------
File: src/services/tag-service.ts
Description: Tag service wrapping ListService, preserving tag operations and stats
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/

import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { TagList, TagItem } from '@/domain/scoped/tag.schema';
import { tagListSchema } from '@/domain/scoped/tag.schema';
import { ZodSchema } from 'zod';
/**
 * Service for managing tag lists
 * Wraps the generic ListService with Tag-specific types
 */
export class TagListService extends ListService<TagList, TagItem> {
  constructor(repository: IListRepository<TagList, TagItem>) {
    super(repository, tagListSchema as ZodSchema<TagList>, 'TagListService');
  }
}
// /*---------------------------------------
// File: src/services/tag-service.ts
// Description: Tag service for managing tags (user-level and project-level)

// Author: Kyle Lovesy
// Date: 28/10-2025 - 10.00
// Version: 2.0.0
// ---------------------------------------*/

// import { Result, err, ok } from '@/domain/common/result';
// import { AppError } from '@/domain/common/errors';
// import {
//   Tag,
//   TagInput,
//   TagUpdate,
//   tagSchema,
//   tagInputSchema,
//   tagUpdateSchema,
//   defaultTag,
// } from '@/domain/scoped/tag.schema';
// import { ErrorContextBuilder } from '@/utils/error-context-builder';
// import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
// import { ITagRepository } from '@/repositories/i-tag-repository';
// import { generateId } from '@/utils/id-generator';
// import { SubscriptionPlan } from '@/constants/enums';
// import { ErrorMapper } from '@/utils/error-mapper';
// import { ErrorCode } from '@/constants/error-code-registry';
// import { getTagLimits, canAddTag, canUseGlobalTags } from '@/constants/subscriptions';

// export interface ITagService {
//   // User scope operations
//   getUserTags(userId: string): Promise<Result<Tag[], AppError>>;
//   createUserTag(
//     userId: string,
//     input: TagInput,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<Tag, AppError>>;
//   updateUserTag(userId: string, tagId: string, updates: TagUpdate): Promise<Result<void, AppError>>;
//   deleteUserTag(userId: string, tagId: string): Promise<Result<void, AppError>>;
//   subscribeToUserTags(
//     userId: string,
//     onUpdate: (result: Result<Tag[], AppError>) => void,
//   ): () => void;

//   // Project scope operations
//   getProjectTags(projectId: string): Promise<Result<Tag[], AppError>>;
//   createProjectTag(
//     projectId: string,
//     userId: string,
//     input: TagInput,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<Tag, AppError>>;
//   updateProjectTag(
//     projectId: string,
//     tagId: string,
//     updates: TagUpdate,
//   ): Promise<Result<void, AppError>>;
//   deleteProjectTag(projectId: string, tagId: string): Promise<Result<void, AppError>>;
//   subscribeToProjectTags(
//     projectId: string,
//     onUpdate: (result: Result<Tag[], AppError>) => void,
//   ): () => void;
// }

// export class TagService implements ITagService {
//   private readonly context = 'TagService';

//   constructor(private repository: ITagRepository) {}

//   /**
//    * Retrieves all tags for a user (global scope)
//    *
//    * @param userId The ID of the user
//    * @returns Result containing an array of tags or an error
//    */
//   async getUserTags(userId: string): Promise<Result<Tag[], AppError>> {
//     return this.repository.listUserTags(userId);
//   }

//   /**
//    * Creates a new tag in user scope (global)
//    *
//    * @param userId The ID of the user
//    * @param input The tag input data
//    * @param subscriptionPlan The user's subscription plan
//    * @returns Result containing the created tag or an error
//    */
//   async createUserTag(
//     userId: string,
//     input: TagInput,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<Tag, AppError>> {
//     const context = ErrorContextBuilder.fromService(this.context, 'createUserTag', userId);
//     const contextString = ErrorContextBuilder.toString(context);

//     // 1. Check subscription limits
//     const limits = getTagLimits(subscriptionPlan);

//     if (!limits.enabled) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.SUBSCRIPTION_FEATURE_UNAVAILABLE,
//           'Tag feature not enabled for this subscription',
//           'Tags are not available for your subscription plan. Please upgrade to use tags.',
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 2. Check if global tags are allowed (if isGlobal is true)
//     if (input.isGlobal && !canUseGlobalTags(subscriptionPlan)) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.SUBSCRIPTION_FEATURE_UNAVAILABLE,
//           'Global tags not enabled for this subscription',
//           'Global tags are not available for your subscription plan. Please upgrade to use global tags.',
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 3. Get current tags to check count and duplicates
//     const tagsResult = await this.repository.listUserTags(userId);
//     if (!tagsResult.success && tagsResult.error.code !== ErrorCode.DB_NOT_FOUND) {
//       return tagsResult as Result<Tag, AppError>;
//     }

//     const currentTags = tagsResult.success ? tagsResult.value : [];
//     const currentCount = currentTags.length;

//     // 4. Check tag count limit
//     if (!canAddTag(subscriptionPlan, currentCount)) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.VALIDATION_FAILED,
//           `Tag limit exceeded: Maximum ${limits.maxTags} tag(s) allowed`,
//           `Cannot add tag. Maximum ${limits.maxTags} tag(s) allowed. Please upgrade your plan for more tags.`,
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 5. Check for duplicate title (case-insensitive)
//     const normalizedTitle = input.title.trim().toLowerCase();
//     const duplicate = currentTags.find(
//       tag => tag.title.trim().toLowerCase() === normalizedTitle,
//     );

//     if (duplicate) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.VALIDATION_FAILED,
//           'Duplicate tag title',
//           `A tag with the title "${input.title}" already exists.`,
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 6. Validate input
//     const validation = validateWithSchema(tagInputSchema, input, contextString);
//     if (!validation.success) {
//       return validation as Result<Tag, AppError>;
//     }

//     // 7. Create complete tag with generated ID using default factory
//     const tagDefaults = defaultTag(validation.value as TagInput, {
//       userId,
//       projectId: undefined, // User scope tags don't have projectId
//     });
//     const tagId = generateId();
//     const newTag: Tag = {
//       ...tagDefaults,
//       id: tagId,
//       isGlobal: input.isGlobal ?? true, // User scope tags are global by default
//     };

//     // 8. Validate complete tag
//     const tagValidation = validateWithSchema(tagSchema, newTag, contextString);
//     if (!tagValidation.success) {
//       return tagValidation as Result<Tag, AppError>;
//     }

//     // 9. Create in repository
//     const createResult = await this.repository.createUserTag(userId, tagId, newTag);
//     if (!createResult.success) {
//       return createResult as Result<Tag, AppError>;
//     }

//     return ok(newTag);
//   }

//   /**
//    * Updates a tag in user scope
//    *
//    * @param userId The ID of the user
//    * @param tagId The ID of the tag to update
//    * @param updates The partial tag data to update
//    * @returns Result indicating success or failure
//    */
//   async updateUserTag(
//     userId: string,
//     tagId: string,
//     updates: TagUpdate,
//   ): Promise<Result<void, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'updateUserTag',
//       userId,
//       undefined,
//       { tagId },
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // Validate updates
//     const validation = validatePartialWithSchema(tagUpdateSchema, updates, contextString);
//     if (!validation.success) {
//       return validation;
//     }

//     // Check for duplicate title if title is being updated
//     if (updates.title) {
//       const tagsResult = await this.repository.listUserTags(userId);
//       if (tagsResult.success) {
//         const normalizedTitle = updates.title.trim().toLowerCase();
//         const duplicate = tagsResult.value.find(
//           tag => tag.id !== tagId && tag.title.trim().toLowerCase() === normalizedTitle,
//         );

//         if (duplicate) {
//           return err(
//             ErrorMapper.createGenericError(
//               ErrorCode.VALIDATION_FAILED,
//               'Duplicate tag title',
//               `A tag with the title "${updates.title}" already exists.`,
//               contextString,
//               undefined,
//               false,
//             ),
//           );
//         }
//       }
//     }

//     return this.repository.updateUserTag(userId, tagId, validation.value as TagUpdate);
//   }

//   /**
//    * Deletes a tag from user scope
//    *
//    * @param userId The ID of the user
//    * @param tagId The ID of the tag to delete
//    * @returns Result indicating success or failure
//    */
//   async deleteUserTag(userId: string, tagId: string): Promise<Result<void, AppError>> {
//     return this.repository.deleteUserTag(userId, tagId);
//   }

//   /**
//    * Subscribes to real-time updates for user tags
//    *
//    * @param userId The ID of the user
//    * @param onUpdate Callback function called when tags update
//    * @returns Unsubscribe function to stop listening to updates
//    */
//   subscribeToUserTags(
//     userId: string,
//     onUpdate: (result: Result<Tag[], AppError>) => void,
//   ): () => void {
//     return this.repository.subscribeToUserTags(userId, onUpdate);
//   }

//   /**
//    * Retrieves all tags for a project (local scope)
//    *
//    * @param projectId The ID of the project
//    * @returns Result containing an array of tags or an error
//    */
//   async getProjectTags(projectId: string): Promise<Result<Tag[], AppError>> {
//     return this.repository.listProjectTags(projectId);
//   }

//   /**
//    * Creates a new tag in project scope (local)
//    *
//    * @param projectId The ID of the project
//    * @param userId The ID of the user creating the tag
//    * @param input The tag input data
//    * @param subscriptionPlan The user's subscription plan
//    * @returns Result containing the created tag or an error
//    */
//   async createProjectTag(
//     projectId: string,
//     userId: string,
//     input: TagInput,
//     subscriptionPlan: SubscriptionPlan,
//   ): Promise<Result<Tag, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'createProjectTag',
//       userId,
//       projectId,
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // 1. Check subscription limits
//     const limits = getTagLimits(subscriptionPlan);

//     if (!limits.enabled) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.SUBSCRIPTION_FEATURE_UNAVAILABLE,
//           'Tag feature not enabled for this subscription',
//           'Tags are not available for your subscription plan. Please upgrade to use tags.',
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 2. Get current tags to check count and duplicates
//     const tagsResult = await this.repository.listProjectTags(projectId);
//     if (!tagsResult.success && tagsResult.error.code !== ErrorCode.DB_NOT_FOUND) {
//       return tagsResult as Result<Tag, AppError>;
//     }

//     const currentTags = tagsResult.success ? tagsResult.value : [];
//     const currentCount = currentTags.length;

//     // 3. Check tag count limit
//     if (!canAddTag(subscriptionPlan, currentCount)) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.VALIDATION_FAILED,
//           `Tag limit exceeded: Maximum ${limits.maxTags} tag(s) allowed`,
//           `Cannot add tag. Maximum ${limits.maxTags} tag(s) allowed. Please upgrade your plan for more tags.`,
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 4. Check for duplicate title (case-insensitive)
//     const normalizedTitle = input.title.trim().toLowerCase();
//     const duplicate = currentTags.find(
//       tag => tag.title.trim().toLowerCase() === normalizedTitle,
//     );

//     if (duplicate) {
//       return err(
//         ErrorMapper.createGenericError(
//           ErrorCode.VALIDATION_FAILED,
//           'Duplicate tag title',
//           `A tag with the title "${input.title}" already exists.`,
//           contextString,
//           undefined,
//           false,
//         ),
//       );
//     }

//     // 5. Validate input
//     const validation = validateWithSchema(tagInputSchema, input, contextString);
//     if (!validation.success) {
//       return validation as Result<Tag, AppError>;
//     }

//     // 6. Create complete tag with generated ID using default factory
//     const tagDefaults = defaultTag(validation.value as TagInput, {
//       userId,
//       projectId, // Project scope tags have projectId
//     });
//     const tagId = generateId();
//     const newTag: Tag = {
//       ...tagDefaults,
//       id: tagId,
//       isGlobal: input.isGlobal ?? false, // Project scope tags are local by default
//     };

//     // 7. Validate complete tag
//     const tagValidation = validateWithSchema(tagSchema, newTag, contextString);
//     if (!tagValidation.success) {
//       return tagValidation as Result<Tag, AppError>;
//     }

//     // 8. Create in repository
//     const createResult = await this.repository.createProjectTag(projectId, tagId, newTag);
//     if (!createResult.success) {
//       return createResult as Result<Tag, AppError>;
//     }

//     return ok(newTag);
//   }

//   /**
//    * Updates a tag in project scope
//    *
//    * @param projectId The ID of the project
//    * @param tagId The ID of the tag to update
//    * @param updates The partial tag data to update
//    * @returns Result indicating success or failure
//    */
//   async updateProjectTag(
//     projectId: string,
//     tagId: string,
//     updates: TagUpdate,
//   ): Promise<Result<void, AppError>> {
//     const context = ErrorContextBuilder.fromService(
//       this.context,
//       'updateProjectTag',
//       undefined,
//       projectId,
//       { tagId },
//     );
//     const contextString = ErrorContextBuilder.toString(context);

//     // Validate updates
//     const validation = validatePartialWithSchema(tagUpdateSchema, updates, contextString);
//     if (!validation.success) {
//       return validation;
//     }

//     // Check for duplicate title if title is being updated
//     if (updates.title) {
//       const tagsResult = await this.repository.listProjectTags(projectId);
//       if (tagsResult.success) {
//         const normalizedTitle = updates.title.trim().toLowerCase();
//         const duplicate = tagsResult.value.find(
//           tag => tag.id !== tagId && tag.title.trim().toLowerCase() === normalizedTitle,
//         );

//         if (duplicate) {
//           return err(
//             ErrorMapper.createGenericError(
//               ErrorCode.VALIDATION_FAILED,
//               'Duplicate tag title',
//               `A tag with the title "${updates.title}" already exists.`,
//               contextString,
//               undefined,
//               false,
//             ),
//           );
//         }
//       }
//     }

//     return this.repository.updateProjectTag(projectId, tagId, validation.value as TagUpdate);
//   }

//   /**
//    * Deletes a tag from project scope
//    *
//    * @param projectId The ID of the project
//    * @param tagId The ID of the tag to delete
//    * @returns Result indicating success or failure
//    */
//   async deleteProjectTag(projectId: string, tagId: string): Promise<Result<void, AppError>> {
//     return this.repository.deleteProjectTag(projectId, tagId);
//   }

//   /**
//    * Subscribes to real-time updates for project tags
//    *
//    * @param projectId The ID of the project
//    * @param onUpdate Callback function called when tags update
//    * @returns Unsubscribe function to stop listening to updates
//    */
//   subscribeToProjectTags(
//     projectId: string,
//     onUpdate: (result: Result<Tag[], AppError>) => void,
//   ): () => void {
//     return this.repository.subscribeToProjectTags(projectId, onUpdate);
//   }
// }
