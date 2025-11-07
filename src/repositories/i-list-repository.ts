/*---------------------------------------
File: src/repositories/i-list-repository.ts
Description: List repository interface - handles all list types (Kit, Task, CoupleShot, GroupShot)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  ListBaseItem,
  ListConstraint,
  ListConstraintOptionalCategories,
} from '@/domain/common/list-base.schema';
import { Transaction } from 'firebase/firestore';

/**
 * Repository interface for list operations (generic for all list types)
 * Handles master lists, user lists, and project lists
 *
 * Repository responsibilities:
 * - Sanitize inputs (validation happens in service layer)
 * - Defensive parsing of data FROM Firestore (with timestamp conversion)
 * - Firestore operations
 *
 * This is the "Port" in the Ports & Adapters architecture.
 *
 * Supports both lists with required categories (Kit, Task, CoupleShot, GroupShot)
 * and lists with optional categories (Notes, Vendors, Key-People, Photo-Request)
 *
 * @template TList - The list type (KitList, TaskList, NoteList, VendorList, etc.)
 * @template TItem - The item type (KitItem, TaskItem, NoteItem, VendorItem, etc.)
 */
export interface IListRepository<
  TList extends ListConstraint<TItem> | ListConstraintOptionalCategories<TItem>,
  TItem extends ListBaseItem,
> {
  // --- Master List Operations ---

  /**
   * Retrieves the master list (default template)
   * @returns The master list or error if not found
   */
  getMaster(): Promise<Result<TList, AppError>>;

  /**
   * Upserts the master list
   * Note: Repository sanitizes input; validation happens in service layer
   * @param list - The list to upsert
   * @returns Success or error
   */
  upsertMaster(list: TList): Promise<Result<void, AppError>>;

  // --- User List Operations ---

  /**
   * Creates or resets a user list from a source list
   * Note: Repository sanitizes input; validation happens in service layer
   * @param userId - The user ID
   * @param sourceList - The source list to create or reset from
   * @returns Success or error
   */
  createOrResetUserList(userId: string, sourceList: TList): Promise<Result<void, AppError>>;

  /**
   * Retrieves a user list
   * Note: Repository performs defensive parsing with timestamp conversion
   * @param userId - The user ID
   * @returns The user list or error if not found
   */
  getUserList(userId: string): Promise<Result<TList, AppError>>;

  /**
   * Saves a user list
   * Note: Repository sanitizes input; validation happens in service layer
   * @param userId - The user ID
   * @param list - The list to save
   * @returns Success or error
   */
  saveUserList(userId: string, list: TList): Promise<Result<void, AppError>>;

  /**
   * Deletes a user list
   * @param userId - The user ID
   * @returns Success or error
   */
  deleteUserList(userId: string): Promise<Result<void, AppError>>;

  // --- User Item Operations ---

  /**
   * Adds an item to a user list
   * Note: Repository sanitizes item; validation happens in service layer
   * @param userId - The user ID
   * @param item - The item to add
   * @returns The added item or error
   */
  addUserItem(userId: string, item: TItem): Promise<Result<TItem, AppError>>;

  /**
   * Deletes an item from a user list
   * @param userId - The user ID
   * @param itemId - The item ID to delete
   * @returns Success or error
   */
  deleteUserItem(userId: string, itemId: string): Promise<Result<void, AppError>>;

  /**
   * Updates multiple items in a user list (batch operation)
   * Note: Repository sanitizes items; validation happens in service layer
   * @param userId - The user ID
   * @param updates - Array of item updates with IDs
   * @returns Success or error
   */
  batchUpdateUserItems(
    userId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>>;

  /**
   * Deletes multiple items from a user list (batch operation)
   * @param userId - The user ID
   * @param itemIds - Array of item IDs to delete
   * @returns Success or error
   */
  batchDeleteUserItems(userId: string, itemIds: string[]): Promise<Result<void, AppError>>;

  // --- Project List Operations ---

  /**
   * Creates or resets a project list from a source list
   * Note: Repository sanitizes input; validation happens in service layer
   * @param userId - The user ID (for context/audit)
   * @param projectId - The project ID
   * @param sourceList - The source list to create or reset from
   * @param tx - Optional Firestore transaction for atomic operations
   * @returns Success or error
   */
  createOrResetProjectList(
    userId: string,
    projectId: string,
    sourceList: TList,
    tx?: Transaction,
  ): Promise<Result<void, AppError>>;

  /**
   * Retrieves a project list
   * Note: Repository performs defensive parsing with timestamp conversion
   * @param projectId - The project ID
   * @returns The project list or error if not found
   */
  getProjectList(projectId: string): Promise<Result<TList, AppError>>;

  /**
   * Saves a project list
   * Note: Repository sanitizes input; validation happens in service layer
   * @param projectId - The project ID
   * @param list - The list to save
   * @returns Success or error
   */
  saveProjectList(projectId: string, list: TList): Promise<Result<void, AppError>>;

  /**
   * Deletes a project list
   * @param projectId - The project ID
   * @returns Success or error
   */
  deleteProjectList(projectId: string): Promise<Result<void, AppError>>;

  // --- Project Item Operations ---

  /**
   * Adds an item to a project list
   * Note: Repository sanitizes item; validation happens in service layer
   * @param projectId - The project ID
   * @param item - The item to add
   * @returns The added item or error
   */
  addProjectItem(projectId: string, item: TItem): Promise<Result<TItem, AppError>>;

  /**
   * Deletes an item from a project list
   * @param projectId - The project ID
   * @param itemId - The item ID to delete
   * @returns Success or error
   */
  deleteProjectItem(projectId: string, itemId: string): Promise<Result<void, AppError>>;

  /**
   * Updates multiple items in a project list (batch operation)
   * Note: Repository sanitizes items; validation happens in service layer
   * @param projectId - The project ID
   * @param updates - Array of item updates with IDs
   * @returns Success or error
   */
  batchUpdateProjectItems(
    projectId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>>;

  /**
   * Deletes multiple items from a project list (batch operation)
   * @param projectId - The project ID
   * @param itemIds - Array of item IDs to delete
   * @returns Success or error
   */
  batchDeleteProjectItems(projectId: string, itemIds: string[]): Promise<Result<void, AppError>>;

  // --- Real-time Subscriptions ---

  /**
   * Subscribes to real-time updates for a user list
   * Returns unsubscribe function for cleanup
   * @param userId - The user ID
   * @param onUpdate - Callback when data changes (Result type)
   * @returns Unsubscribe function for cleanup
   */
  subscribeToUserList(
    userId: string,
    onUpdate: (result: Result<TList | null, AppError>) => void,
  ): () => void;

  /**
   * Subscribes to real-time updates for a project list
   * Returns unsubscribe function for cleanup
   * @param projectId - The project ID
   * @param onUpdate - Callback when data changes (Result type)
   * @returns Unsubscribe function for cleanup
   */
  subscribeToProjectList(
    projectId: string,
    onUpdate: (result: Result<TList | null, AppError>) => void,
  ): () => void;
}
