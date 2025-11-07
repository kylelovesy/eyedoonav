/*---------------------------------------
File: src/services/list-service.ts
Description: Generic list service for managing all list types (Kit, Task, CoupleShot, GroupShot)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err, ok } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  ListBaseItem,
  ListConstraint,
  ListConstraintOptionalCategories,
} from '@/domain/common/list-base.schema';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import { IListRepository } from '@/repositories/i-list-repository';
import { ZodSchema } from 'zod';
import { sanitizeString } from '@/utils/sanitization-helpers';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';

/**
 * Generic service for managing list operations
 * Handles validation and delegates to repository
 *
 * Supports both lists with required categories (Kit, Task, CoupleShot, GroupShot)
 * and lists with optional categories (Notes, Vendors, Key-People, Photo-Request)
 *
 * @template TList - The list type (KitList, TaskList, NoteList, VendorList, etc.)
 * @template TItem - The item type (KitItem, TaskItem, NoteItem, VendorItem, etc.)
 */
export class ListService<
  TList extends ListConstraint<TItem> | ListConstraintOptionalCategories<TItem>,
  TItem extends ListBaseItem,
> {
  private readonly context: string;

  constructor(
    private repository: IListRepository<TList, TItem>,
    private listSchema: ZodSchema<TList>,
    serviceName: string,
  ) {
    this.context = serviceName;
  }

  // --- Private Helper Methods ---

  /**
   * Sanitizes item string fields before validation
   */
  private sanitizeItem<T extends ListBaseItem>(item: T): T {
    return {
      ...item,
      itemName: sanitizeString(item.itemName) || item.itemName,
      itemDescription: sanitizeString(item.itemDescription) || item.itemDescription,
    };
  }

  /**
   * Validates business logic constraints for adding items
   * Handles both lists with required categories and optional categories
   */
  private validateItemConstraints<
    TList extends ListConstraint<TItem> | ListConstraintOptionalCategories<TItem>,
    TItem extends ListBaseItem,
  >(list: TList, item: TItem, contextString: string): Result<void, AppError> {
    // Check total items limit (max 500 per list)
    if (list.items.length >= 500) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Maximum items limit reached',
          'List has reached the maximum of 500 items. Please remove some items before adding new ones.',
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Check category constraints if categoryId provided
    if (item.categoryId) {
      // For lists with optional categories, check if categories exist
      // Type-safe check: categories may be undefined for ListConstraintOptionalCategories
      const categories = Array.isArray(list.categories) ? list.categories : [];

      // Validate category exists
      const categoryExists = categories.some(c => c.id === item.categoryId);
      if (!categoryExists) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            'Category does not exist',
            `Category with ID "${item.categoryId}" does not exist in this list.`,
            contextString,
            undefined,
            false,
          ),
        );
      }

      // Check category item limit (max 100 per category)
      const categoryItems = list.items.filter(i => i.categoryId === item.categoryId);
      if (categoryItems.length >= 100) {
        const category = categories.find(c => c.id === item.categoryId);
        const categoryName = category?.catName || 'Unknown';
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            'Maximum items per category reached',
            `Category "${categoryName}" has reached the maximum of 100 items. Please remove some items from this category before adding new ones.`,
            contextString,
            undefined,
            false,
          ),
        );
      }
    }

    return ok(undefined);
  }

  // --- Master List Operations ---

  /**
   * Gets the master list (default template)
   */
  async getMaster(): Promise<Result<TList, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'getMaster');
    return await this.repository.getMaster();
  }

  /**
   * Upserts the master list
   */
  async upsertMaster(list: TList): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'upsertMaster');
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(this.listSchema, list, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.upsertMaster(validation.value);
  }

  // --- User List Operations ---

  /**
   * Creates or resets a user list from a source list
   */
  async createOrResetUserList(userId: string, sourceList: TList): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'createOrResetUserList', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(this.listSchema, sourceList, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.createOrResetUserList(userId, validation.value);
  }

  /**
   * Gets a user list
   */
  async getUserList(userId: string): Promise<Result<TList, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'getUserList', userId);
    return await this.repository.getUserList(userId);
  }

  /**
   * Saves a user list
   */
  async saveUserList(userId: string, list: TList): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'saveUserList', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(this.listSchema, list, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.saveUserList(userId, validation.value);
  }

  /**
   * Deletes a user list
   */
  async deleteUserList(userId: string): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'deleteUserList', userId);
    return await this.repository.deleteUserList(userId);
  }

  // --- User Item Operations ---

  /**
   * Adds an item to a user list
   *
   * @remarks Optimistic updates supported
   */
  async addUserItem(userId: string, item: TItem): Promise<Result<TItem, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'addUserItem', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Sanitize item input
    const sanitizedItem = this.sanitizeItem(item);

    // 2. Get current list to validate constraints
    const listResult = await this.repository.getUserList(userId);
    if (!listResult.success) {
      return listResult as Result<TItem, AppError>;
    }

    // 3. Validate business logic constraints
    const constraintValidation = this.validateItemConstraints(
      listResult.value,
      sanitizedItem,
      contextString,
    );
    if (!constraintValidation.success) {
      return constraintValidation as Result<TItem, AppError>;
    }

    // 4. Delegate to repository
    return await this.repository.addUserItem(userId, sanitizedItem);
  }

  /**
   * Deletes an item from a user list
   *
   * @remarks Optimistic updates supported
   */
  async deleteUserItem(userId: string, itemId: string): Promise<Result<void, AppError>> {
    return await this.repository.deleteUserItem(userId, itemId);
  }

  /**
   * Updates multiple items in a user list (batch operation)
   *
   * @remarks Optimistic updates supported
   */
  async batchUpdateUserItems(
    userId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>> {
    // Sanitize string fields in updates
    const sanitizedUpdates = updates.map(update => {
      const sanitized: typeof update = { ...update };
      if ('itemName' in update && update.itemName !== undefined) {
        sanitized.itemName = sanitizeString(update.itemName) || update.itemName;
      }
      if ('itemDescription' in update && update.itemDescription !== undefined) {
        sanitized.itemDescription =
          sanitizeString(update.itemDescription) || update.itemDescription;
      }
      return sanitized;
    });

    // Delegate to repository (repository validates entire list after update)
    return await this.repository.batchUpdateUserItems(userId, sanitizedUpdates);
  }

  /**
   * Deletes multiple items from a user list (batch operation)
   */
  async batchDeleteUserItems(userId: string, itemIds: string[]): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'batchDeleteUserItems', userId);
    return await this.repository.batchDeleteUserItems(userId, itemIds);
  }

  // --- Project List Operations ---

  /**
   * Creates or resets a project list from a source list
   */
  async createOrResetProjectList(
    userId: string,
    projectId: string,
    sourceList: TList,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'createOrResetProjectList',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(this.listSchema, sourceList, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.createOrResetProjectList(userId, projectId, validation.value);
  }

  /**
   * Gets a project list
   */
  async getProjectList(projectId: string): Promise<Result<TList, AppError>> {
    // const context = ErrorContextBuilder.fromService(
    //   this.context,
    //   'getProjectList',
    //   undefined,
    //   projectId,
    // );
    return await this.repository.getProjectList(projectId);
  }

  /**
   * Saves a project list
   */
  async saveProjectList(projectId: string, list: TList): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'saveProjectList',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(this.listSchema, list, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Delegate to repository
    return await this.repository.saveProjectList(projectId, validation.value);
  }

  /**
   * Deletes a project list
   */
  async deleteProjectList(projectId: string): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(
    //   this.context,
    //   'deleteProjectList',
    //   undefined,
    //   projectId,
    // );
    return await this.repository.deleteProjectList(projectId);
  }

  // --- Project Item Operations ---

  /**
   * Adds an item to a project list
   *
   * @remarks Optimistic updates supported
   */
  async addProjectItem(projectId: string, item: TItem): Promise<Result<TItem, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'addProjectItem',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Sanitize item input
    const sanitizedItem = this.sanitizeItem(item);

    // 2. Get current list to validate constraints
    const listResult = await this.repository.getProjectList(projectId);
    if (!listResult.success) {
      return listResult as Result<TItem, AppError>;
    }

    // 3. Validate business logic constraints
    const constraintValidation = this.validateItemConstraints(
      listResult.value,
      sanitizedItem,
      contextString,
    );
    if (!constraintValidation.success) {
      return constraintValidation as Result<TItem, AppError>;
    }

    // 4. Delegate to repository
    return await this.repository.addProjectItem(projectId, sanitizedItem);
  }

  /**
   * Deletes an item from a project list
   *
   * @remarks Optimistic updates supported
   */
  async deleteProjectItem(projectId: string, itemId: string): Promise<Result<void, AppError>> {
    return await this.repository.deleteProjectItem(projectId, itemId);
  }

  /**
   * Updates multiple items in a project list (batch operation)
   *
   * @remarks Optimistic updates supported
   */
  async batchUpdateProjectItems(
    projectId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>> {
    // Sanitize string fields in updates
    const sanitizedUpdates = updates.map(update => {
      const sanitized: typeof update = { ...update };
      if ('itemName' in update && update.itemName !== undefined) {
        sanitized.itemName = sanitizeString(update.itemName) || update.itemName;
      }
      if ('itemDescription' in update && update.itemDescription !== undefined) {
        sanitized.itemDescription =
          sanitizeString(update.itemDescription) || update.itemDescription;
      }
      return sanitized;
    });

    // Delegate to repository (repository validates entire list after update)
    return await this.repository.batchUpdateProjectItems(projectId, sanitizedUpdates);
  }

  /**
   * Deletes multiple items from a project list (batch operation)
   */
  async batchDeleteProjectItems(
    projectId: string,
    itemIds: string[],
  ): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(
    //   this.context,
    //   'batchDeleteProjectItems',
    //   undefined,
    //   projectId,
    // );
    return await this.repository.batchDeleteProjectItems(projectId, itemIds);
  }

  // --- Real-time Subscriptions ---

  /**
   * Subscribes to real-time updates for a user list
   */
  subscribeToUserList(
    userId: string,
    onUpdate: (result: Result<TList | null, AppError>) => void,
  ): () => void {
    return this.repository.subscribeToUserList(userId, onUpdate);
  }

  /**
   * Subscribes to real-time updates for a project list
   */
  subscribeToProjectList(
    projectId: string,
    onUpdate: (result: Result<TList | null, AppError>) => void,
  ): () => void {
    return this.repository.subscribeToProjectList(projectId, onUpdate);
  }
}
