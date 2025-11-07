/*---------------------------------------
File: src/repositories/firestore/firestore-list-repository.ts
Description: Firestore implementation of the generic list repository (refactored to follow project rules)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot,
  Transaction,
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  ListBaseItem,
  ListConstraint,
  ListConstraintOptionalCategories,
} from '@/domain/common/list-base.schema';
import { IListRepository } from '@/repositories/i-list-repository';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import { sanitizeString } from '@/utils/sanitization-helpers';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import { ErrorCode } from '@/constants/error-code-registry';
import { ListSource } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';
import { ZodSchema } from 'zod';

interface RepositoryConfig<
  TList extends ListConstraint<ListBaseItem> | ListConstraintOptionalCategories<ListBaseItem>,
  TItem extends ListBaseItem,
> {
  masterPath: readonly string[];
  userPath: (userId: string) => readonly string[];
  projectPath: (projectId: string) => readonly string[];
  listSchema: ZodSchema<TList>;
  listType: string;
  serviceName: string;
}

/**
 * Generic Firestore repository implementation for list operations
 * Handles sanitization and defensive parsing (validation happens in service layer)
 *
 * Supports both lists with required categories (Kit, Task, CoupleShot, GroupShot)
 * and lists with optional categories (Notes, Vendors, Key-People, Photo-Request)
 */
export class FirestoreListRepository<
  TList extends ListConstraint<TItem> | ListConstraintOptionalCategories<TItem>,
  TItem extends ListBaseItem,
> implements IListRepository<TList, TItem>
{
  private readonly context: string;

  constructor(private readonly config: RepositoryConfig<TList, TItem>) {
    this.context = config.serviceName;
  }

  // --- Helper Methods ---

  /**
   * Gets a Firestore document reference from a path
   */
  private getDocRef(path: string | readonly string[]) {
    if (Array.isArray(path)) {
      const [collection, docId, subCollection, subDocId] = path as [string, string, string, string];
      return doc(firestore, collection, docId, subCollection, subDocId);
    }
    return doc(firestore, path as string);
  }

  /**
   * Parses Firestore snapshot to TList with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<TList, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'List not found',
          'List not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps(rawData);

    // Validate with schema (DEFENSIVE parsing FROM Firestore)
    const validation = validateWithSchema(this.config.listSchema, data, contextString);

    if (!validation.success) {
      return err(validation.error);
    }

    return ok(validation.value as TList);
  }

  /**
   * Sanitizes a list by cleaning string fields and calculating metadata
   * Note: Config structure is flattened (totalCategories, totalItems directly in config)
   */
  private sanitizeList(list: TList, lastModifiedBy: string): TList {
    // Ensure arrays exist
    const categories = Array.isArray(list.categories) ? list.categories : [];
    const items = Array.isArray(list.items) ? list.items : [];

    // Sanitize item strings
    const sanitizedItems = items.map(item => this.sanitizeItem(item));

    // Calculate which categories have items
    const categoriesWithItems = categories.filter(category =>
      sanitizedItems.some(item => item.categoryId === category.id),
    );

    // Update config with flattened structure (no nested metadata)
    return {
      ...list,
      config: {
        ...list.config,
        totalCategories: categoriesWithItems.length,
        totalItems: sanitizedItems.length,
        lastModifiedBy: lastModifiedBy || list.config.lastModifiedBy,
      },
      categories,
      items: sanitizedItems,
    };
  }

  /**
   * Sanitizes a list item by cleaning string fields
   */
  private sanitizeItem(item: TItem): TItem {
    return {
      ...item,
      itemName: sanitizeString(item.itemName) || '',
      itemDescription: sanitizeString(item.itemDescription) || '',
    };
  }

  /**
   * Creates a default empty list
   */
  private createDefaultList(lastModifiedBy: string): TList {
    return {
      config: {
        id: '', // Will be set by Firestore
        type: this.config.listType,
        source: ListSource.MASTER_LIST,
        defaultValues: DEFAULTS.ENABLED,
        version: DEFAULTS.VERSION,
        createdBy: lastModifiedBy,
        lastModifiedBy: lastModifiedBy,
        totalCategories: 0,
        totalItems: 0,
        createdAt: new Date(),
        updatedAt: undefined,
      },
      categories: [],
      items: [],
      pendingUpdates: [],
    } as unknown as TList;
  }

  /**
   * Converts list to Firestore document format
   */
  private toFirestoreDoc(list: TList) {
    return {
      config: {
        ...list.config,
        createdAt: list.config.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      categories: list.categories,
      items: list.items,
      pendingUpdates: list.pendingUpdates || [],
    };
  }

  // --- Master List Operations ---

  async getMaster(): Promise<Result<TList, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getMaster');
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getDocRef(this.config.masterPath);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        // Return default list if master doesn't exist
        return ok(this.createDefaultList('master'));
      }

      // Defensive parsing with timestamp conversion
      const result = this.parseSnapshot(snapshot, contextString);
      if (!result.success) {
        return result;
      }

      // Additional sanitization after parsing
      return ok(this.sanitizeList(result.value, 'master'));
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async upsertMaster(list: TList): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'upsertMaster');
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeList(list, 'master');

      // 2. Perform operation (no validation here)
      const docRef = this.getDocRef(this.config.masterPath);
      await setDoc(docRef, this.toFirestoreDoc(sanitized), { merge: true });
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  // --- User List Operations ---

  async createOrResetUserList(userId: string, sourceList: TList): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'createOrResetUserList',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize and personalize list (validation happens in service layer)
      const personalized = this.sanitizeList(
        {
          ...sourceList,
          config: {
            ...sourceList.config,
            source: ListSource.USER_LIST,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        },
        userId,
      );

      // 2. Perform operation (no validation here)
      const docRef = this.getDocRef(this.config.userPath(userId));
      await setDoc(docRef, this.toFirestoreDoc(personalized));
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getUserList(userId: string): Promise<Result<TList, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getUserList', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getDocRef(this.config.userPath(userId));
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'List not found',
            'List not found',
            contextString,
          ),
        );
      }

      // Defensive parsing with timestamp conversion
      const result = this.parseSnapshot(snapshot, contextString);
      if (!result.success) {
        return result;
      }

      // Additional sanitization after parsing
      return ok(this.sanitizeList(result.value, userId));
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async saveUserList(userId: string, list: TList): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'saveUserList', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeList(list, userId);

      // 2. Perform operation (no validation here)
      const docRef = this.getDocRef(this.config.userPath(userId));
      await setDoc(docRef, this.toFirestoreDoc(sanitized), { merge: true });
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async deleteUserList(userId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'deleteUserList', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getDocRef(this.config.userPath(userId));
      await deleteDoc(docRef);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  // --- User Item Operations ---

  async addUserItem(userId: string, item: TItem): Promise<Result<TItem, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'addUserItem', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize item (validation happens in service layer)
      const sanitizedItem = this.sanitizeItem(item);

      // 2. Get current list
      const listResult = await this.getUserList(userId);
      if (!listResult.success) {
        return err(listResult.error);
      }

      // 3. Check for duplicate item ID
      if (listResult.value.items.some(existing => existing.id === sanitizedItem.id)) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            `Item with id ${sanitizedItem.id} already exists`,
            'This item already exists in the list',
            contextString,
          ),
        );
      }

      // 4. Add item and save
      const updatedList = {
        ...listResult.value,
        items: [...listResult.value.items, sanitizedItem],
      };

      const saveResult = await this.saveUserList(userId, updatedList);
      if (!saveResult.success) {
        return err(saveResult.error);
      }

      return ok(sanitizedItem);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async deleteUserItem(userId: string, itemId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'deleteUserItem', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get current list
      const listResult = await this.getUserList(userId);
      if (!listResult.success) {
        return err(listResult.error);
      }

      // 2. Filter out item
      const updatedList = {
        ...listResult.value,
        items: listResult.value.items.filter(item => item.id !== itemId),
      };

      // 3. Save updated list
      return await this.saveUserList(userId, updatedList);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async batchUpdateUserItems(
    userId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'batchUpdateUserItems',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get current list
      const docRef = this.getDocRef(this.config.userPath(userId));
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'List not found',
            'List not found',
            contextString,
          ),
        );
      }

      // 2. Defensive parsing of current list
      const parseResult = this.parseSnapshot(snapshot, contextString);
      if (!parseResult.success) {
        return err(parseResult.error);
      }

      // 3. Sanitize list
      const sanitized = this.sanitizeList(parseResult.value, userId);
      const itemsMap = new Map(sanitized.items.map(item => [item.id, item]));

      // 4. Apply updates and sanitize each updated item
      updates.forEach(({ id, ...itemUpdates }) => {
        const existing = itemsMap.get(id);
        if (existing) {
          const updatedItem = { ...existing, ...itemUpdates };
          itemsMap.set(id, this.sanitizeItem(updatedItem));
        }
      });

      const updatedItems = Array.from(itemsMap.values());

      // 5. Update list with new items (no validation here - service handles it)
      await updateDoc(docRef, {
        items: updatedItems,
        'config.totalItems': updatedItems.length,
        'config.lastModifiedBy': userId,
        'config.updatedAt': serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async batchDeleteUserItems(userId: string, itemIds: string[]): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'batchDeleteUserItems',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get current list
      const docRef = this.getDocRef(this.config.userPath(userId));
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'List not found',
            'List not found',
            contextString,
          ),
        );
      }

      // 2. Defensive parsing of current list
      const parseResult = this.parseSnapshot(snapshot, contextString);
      if (!parseResult.success) {
        return err(parseResult.error);
      }

      // 3. Sanitize list and filter items
      const sanitized = this.sanitizeList(parseResult.value, userId);
      const filteredItems = sanitized.items.filter(item => !itemIds.includes(item.id));

      // 4. Update list (no validation here - service handles it)
      await updateDoc(docRef, {
        items: filteredItems,
        'config.totalItems': filteredItems.length,
        'config.lastModifiedBy': userId,
        'config.updatedAt': serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  // --- Project List Operations ---

  async createOrResetProjectList(
    userId: string,
    projectId: string,
    sourceList: TList,
    tx?: Transaction,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'createOrResetProjectList',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize and personalize list (validation happens in service layer)
      const personalized = this.sanitizeList(
        {
          ...sourceList,
          config: {
            ...sourceList.config,
            source: ListSource.PROJECT_LIST,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        },
        projectId,
      );

      // 2. Perform operation (no validation here)
      const docRef = this.getDocRef(this.config.projectPath(projectId));
      if (tx) {
        tx.set(docRef, this.toFirestoreDoc(personalized)); // Use transaction 'set'
      } else {
        await setDoc(docRef, this.toFirestoreDoc(personalized)); // Use normal 'setDoc'
      }
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getProjectList(projectId: string): Promise<Result<TList, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'getProjectList',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getDocRef(this.config.projectPath(projectId));
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'List not found',
            'List not found',
            contextString,
          ),
        );
      }

      // Defensive parsing with timestamp conversion
      const result = this.parseSnapshot(snapshot, contextString);
      if (!result.success) {
        return result;
      }

      // Additional sanitization after parsing
      return ok(this.sanitizeList(result.value, projectId));
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async saveProjectList(projectId: string, list: TList): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'saveProjectList',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeList(list, projectId);

      // 2. Perform operation (no validation here)
      const docRef = this.getDocRef(this.config.projectPath(projectId));
      await setDoc(docRef, this.toFirestoreDoc(sanitized), { merge: true });
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async deleteProjectList(projectId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'deleteProjectList',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getDocRef(this.config.projectPath(projectId));
      await deleteDoc(docRef);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  // --- Project Item Operations ---

  async addProjectItem(projectId: string, item: TItem): Promise<Result<TItem, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'addProjectItem',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize item (validation happens in service layer)
      const sanitizedItem = this.sanitizeItem(item);

      // 2. Get current list
      const listResult = await this.getProjectList(projectId);
      if (!listResult.success) {
        return err(listResult.error);
      }

      // 3. Check for duplicate item ID
      if (listResult.value.items.some(existing => existing.id === sanitizedItem.id)) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            `Item with id ${sanitizedItem.id} already exists`,
            'This item already exists in the list',
            contextString,
          ),
        );
      }

      // 4. Add item and save
      const updatedList = {
        ...listResult.value,
        items: [...listResult.value.items, sanitizedItem],
      };

      const saveResult = await this.saveProjectList(projectId, updatedList);
      if (!saveResult.success) {
        return err(saveResult.error);
      }

      return ok(sanitizedItem);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async deleteProjectItem(projectId: string, itemId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'deleteProjectItem',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get current list
      const listResult = await this.getProjectList(projectId);
      if (!listResult.success) {
        return err(listResult.error);
      }

      // 2. Filter out item
      const updatedList = {
        ...listResult.value,
        items: listResult.value.items.filter(item => item.id !== itemId),
      };

      // 3. Save updated list
      return await this.saveProjectList(projectId, updatedList);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async batchUpdateProjectItems(
    projectId: string,
    updates: Array<{ id: string } & Partial<TItem>>,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'batchUpdateProjectItems',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get current list
      const docRef = this.getDocRef(this.config.projectPath(projectId));
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'List not found',
            'List not found',
            contextString,
          ),
        );
      }

      // 2. Defensive parsing of current list
      const parseResult = this.parseSnapshot(snapshot, contextString);
      if (!parseResult.success) {
        return err(parseResult.error);
      }

      // 3. Sanitize list
      const sanitized = this.sanitizeList(parseResult.value, projectId);
      const itemsMap = new Map(sanitized.items.map(item => [item.id, item]));

      // 4. Apply updates and sanitize each updated item
      updates.forEach(({ id, ...itemUpdates }) => {
        const existing = itemsMap.get(id);
        if (existing) {
          const updatedItem = { ...existing, ...itemUpdates };
          itemsMap.set(id, this.sanitizeItem(updatedItem));
        }
      });

      const updatedItems = Array.from(itemsMap.values());

      // 5. Update list with new items (no validation here - service handles it)
      await updateDoc(docRef, {
        items: updatedItems,
        'config.totalItems': updatedItems.length,
        'config.lastModifiedBy': projectId,
        'config.updatedAt': serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async batchDeleteProjectItems(
    projectId: string,
    itemIds: string[],
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'batchDeleteProjectItems',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get current list
      const docRef = this.getDocRef(this.config.projectPath(projectId));
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'List not found',
            'List not found',
            contextString,
          ),
        );
      }

      // 2. Defensive parsing of current list
      const parseResult = this.parseSnapshot(snapshot, contextString);
      if (!parseResult.success) {
        return err(parseResult.error);
      }

      // 3. Sanitize list and filter items
      const sanitized = this.sanitizeList(parseResult.value, projectId);
      const filteredItems = sanitized.items.filter(item => !itemIds.includes(item.id));

      // 4. Update list (no validation here - service handles it)
      await updateDoc(docRef, {
        items: filteredItems,
        'config.totalItems': filteredItems.length,
        'config.lastModifiedBy': projectId,
        'config.updatedAt': serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  // --- Real-time Subscriptions ---

  subscribeToUserList(
    userId: string,
    onUpdate: (result: Result<TList | null, AppError>) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(this.context, 'subscribeToUserList', userId);
    const contextString = ErrorContextBuilder.toString(context);
    const docRef = this.getDocRef(this.config.userPath(userId));

    const unsubscribe = onSnapshot(
      docRef,
      snapshot => {
        if (!snapshot.exists()) {
          onUpdate(ok(null));
          return;
        }

        // Defensive parsing with timestamp conversion
        const result = this.parseSnapshot(snapshot, contextString);
        if (!result.success) {
          onUpdate(result);
          return;
        }

        // Additional sanitization after parsing
        onUpdate(ok(this.sanitizeList(result.value, userId)));
      },
      error => {
        onUpdate(err(ErrorMapper.fromFirestore(error, contextString)));
      },
    );

    return unsubscribe;
  }

  subscribeToProjectList(
    projectId: string,
    onUpdate: (result: Result<TList | null, AppError>) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'subscribeToProjectList',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);
    const docRef = this.getDocRef(this.config.projectPath(projectId));

    const unsubscribe = onSnapshot(
      docRef,
      snapshot => {
        if (!snapshot.exists()) {
          onUpdate(ok(null));
          return;
        }

        // Defensive parsing with timestamp conversion
        const result = this.parseSnapshot(snapshot, contextString);
        if (!result.success) {
          onUpdate(result);
          return;
        }

        // Additional sanitization after parsing
        onUpdate(ok(this.sanitizeList(result.value, projectId)));
      },
      error => {
        onUpdate(err(ErrorMapper.fromFirestore(error, contextString)));
      },
    );

    return unsubscribe;
  }
}
