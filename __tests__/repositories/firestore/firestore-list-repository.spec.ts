// __tests__/repositories/firestore/firestore-list-repository.spec.ts

import { FirestoreListRepository } from '@/repositories/firestore/firestore-list-repository';
import { KitItem, KitList, kitItemSchema, kitListSchema } from '@/domain/user/kit.schema';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ok, err, isErr } from '@/domain/common/result';
import { FirestoreError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import {
  USER_LIST_PATHS,
  MASTER_LIST_PATHS,
  PROJECT_LIST_PATHS,
} from '@/repositories/firestore/paths/firestore-list-paths';
import { ListType } from '@/constants/enums';
import { ZodSchema } from 'zod';

// Mock firebase config first
jest.mock('@/config/firebaseConfig', () => ({
  db: {},
  storage: {},
}));

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
}));

// Mocks
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;
const mockDoc = doc as jest.Mock;

describe('FirestoreListRepository (Generic)', () => {
  let repository: FirestoreListRepository<KitList, KitItem>;
  const userId = 'test-user-id';
  const mockDocRef = { id: 'mock-doc-ref' };
  const mockCollectionRef = { id: 'mock-collection-ref' };

  const mockItem: KitItem = {
    id: 'item-123',
    itemName: 'Test Camera',
    itemDescription: 'A test camera',
    quantity: 1,
    isCustom: false,
    isChecked: false,
    isDisabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize the generic repo for a Kit List
    repository = new FirestoreListRepository<KitList, KitItem>({
      masterPath: MASTER_LIST_PATHS.KIT,
      userPath: USER_LIST_PATHS.KIT,
      projectPath: PROJECT_LIST_PATHS.KIT,
      listSchema: kitListSchema as ZodSchema<KitList>,
      listType: ListType.KIT,
      serviceName: 'KitRepository',
    });

    mockDoc.mockReturnValue(mockDocRef);
    mockCollection.mockReturnValue(mockCollectionRef);
  });

  describe('getUserList', () => {
    it('should return a list of items', async () => {
      const mockList: KitList = {
        config: {
          id: 'list-123',
          type: ListType.KIT,
          source: 'user' as any,
          defaultValues: true,
          version: '1.0.0',
          totalCategories: 0,
          totalItems: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        categories: [],
        items: [mockItem],
        pendingUpdates: [],
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockList,
      });

      const result = await repository.getUserList(userId);

      expect(mockDoc).toHaveBeenCalledWith({}, 'users', userId, 'lists', 'kitList');
      expect(mockGetDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result.success).toBe(true);
    });

    it('should return a FirestoreError on getDoc failure', async () => {
      const error = new Error('Permission denied');
      mockGetDoc.mockRejectedValue(error);

      const result = await repository.getUserList(userId);

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(FirestoreError);
        expect(result.error.code).toBe(ErrorCode.DB_NETWORK_ERROR);
      }
    });
  });

  describe('addUserItem', () => {
    it('should add an item successfully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          config: {
            id: 'list-123',
            type: 'kit' as any,
            source: 'user' as any,
            defaultValues: true,
            version: '1.0.0',
            totalCategories: 0,
            totalItems: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          categories: [],
          items: [],
          pendingUpdates: [],
        }),
      });
      mockSetDoc.mockResolvedValue(undefined);

      const result = await repository.addUserItem(userId, mockItem);

      expect(mockSetDoc).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('batchUpdateUserItems', () => {
    it('should update items successfully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          config: {
            id: 'list-123',
            type: 'kit' as any,
            source: 'user' as any,
            defaultValues: true,
            version: '1.0.0',
            totalCategories: 0,
            totalItems: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          categories: [],
          items: [mockItem],
          pendingUpdates: [],
        }),
      });
      mockSetDoc.mockResolvedValue(undefined);
      const updates = [{ id: mockItem.id, isChecked: true, quantity: 2 }];

      const result = await repository.batchUpdateUserItems(userId, updates);

      expect(mockSetDoc).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('deleteUserItem', () => {
    it('should delete an item successfully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          config: {
            id: 'list-123',
            type: 'kit' as any,
            source: 'user' as any,
            defaultValues: true,
            version: '1.0.0',
            totalCategories: 0,
            totalItems: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          categories: [],
          items: [mockItem],
          pendingUpdates: [],
        }),
      });
      mockSetDoc.mockResolvedValue(undefined);

      const result = await repository.deleteUserItem(userId, mockItem.id);

      expect(mockSetDoc).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
