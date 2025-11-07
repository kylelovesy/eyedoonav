// __tests__/services/list-service.spec.ts

import { ListService } from '@/services/list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { KitItem, KitList, kitItemSchema, kitListSchema } from '@/domain/user/kit.schema';
import { ok, err } from '@/domain/common/result';
import { FirestoreError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ListSource, ListType } from '@/constants/enums';

// Mock the generic repository interface
const mockRepository: jest.Mocked<IListRepository<KitList, KitItem>> = {
  getMaster: jest.fn(),
  upsertMaster: jest.fn(),
  createOrResetUserList: jest.fn(),
  getUserList: jest.fn(),
  saveUserList: jest.fn(),
  deleteUserList: jest.fn(),
  addUserItem: jest.fn(),
  deleteUserItem: jest.fn(),
  batchUpdateUserItems: jest.fn(),
  batchDeleteUserItems: jest.fn(),
  subscribeToUserList: jest.fn(),
  getProjectList: jest.fn(),
  saveProjectList: jest.fn(),
  createOrResetProjectList: jest.fn(),
  deleteProjectList: jest.fn(),
  addProjectItem: jest.fn(),
  deleteProjectItem: jest.fn(),
  batchUpdateProjectItems: jest.fn(),
  batchDeleteProjectItems: jest.fn(),
  subscribeToProjectList: jest.fn(),
};

describe('ListService (Generic)', () => {
  let service: ListService<KitList, KitItem>;
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
    // Inject the mock repository
    service = new ListService<KitList, KitItem>(mockRepository, kitListSchema as any, 'KitService');
  });

  describe('getUserList', () => {
    it('should return a list from the repository', async () => {
      const mockList: KitList = {
        config: {
          id: 'list-123',
          type: ListType.KIT,
          source: ListSource.USER_LIST,
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
      mockRepository.getUserList.mockResolvedValue(ok(mockList));

      const result = await service.getUserList('user-123');

      expect(mockRepository.getUserList).toHaveBeenCalledWith('user-123');
      expect(result.success).toBe(true);
    });

    it('should return an error if repository fails', async () => {
      const dbError = new FirestoreError(ErrorCode.DB_READ_ERROR, 'DB error', 'DB error');
      mockRepository.getUserList.mockResolvedValue(err(dbError));

      const result = await service.getUserList('user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(dbError);
      }
    });
  });

  describe('addUserItem', () => {
    it('should call addUserItem on the repository', async () => {
      mockRepository.addUserItem.mockResolvedValue(ok(mockItem));

      const result = await service.addUserItem('user-123', mockItem);

      expect(mockRepository.addUserItem).toHaveBeenCalledWith('user-123', mockItem);
      expect(result.success).toBe(true);
    });
  });

  describe('batchUpdateUserItems', () => {
    it('should call batchUpdateUserItems on the repository', async () => {
      const updates = [{ id: mockItem.id, isChecked: true }];
      mockRepository.batchUpdateUserItems.mockResolvedValue(ok(undefined));

      const result = await service.batchUpdateUserItems('user-123', updates);

      expect(mockRepository.batchUpdateUserItems).toHaveBeenCalledWith('user-123', updates);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteUserItem', () => {
    it('should call deleteUserItem on the repository', async () => {
      mockRepository.deleteUserItem.mockResolvedValue(ok(undefined));

      const result = await service.deleteUserItem('user-123', mockItem.id);

      expect(mockRepository.deleteUserItem).toHaveBeenCalledWith('user-123', mockItem.id);
      expect(result.success).toBe(true);
    });
  });
});
