// __tests__/hooks/use-generic-list.spec.ts

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useList } from '@/hooks/use-generic-list';
import { KitList, KitItem } from '@/domain/user/kit.schema';
import { ok, err } from '@/domain/common/result';
import { FirestoreError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ListType, ListSource } from '@/constants/enums';

// Mock service that implements the full IListService interface
const mockService = {
  getMaster: jest.fn(),
  getUserList: jest.fn(),
  saveUserList: jest.fn(),
  createOrResetUserList: jest.fn(),
  deleteUserList: jest.fn(),
  addUserItem: jest.fn(),
  deleteUserItem: jest.fn(),
  batchUpdateUserItems: jest.fn(),
  batchDeleteUserItems: jest.fn(),
  getProjectList: jest.fn(),
  saveProjectList: jest.fn(),
  createOrResetProjectList: jest.fn(),
  deleteProjectList: jest.fn(),
  addProjectItem: jest.fn(),
  deleteProjectItem: jest.fn(),
  batchUpdateProjectItems: jest.fn(),
  batchDeleteProjectItems: jest.fn(),
};

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
  items: [],
  pendingUpdates: [],
};

const mockItem: KitItem = {
  id: 'item-123',
  itemName: 'Test Camera',
  itemDescription: 'A test camera',
  quantity: 1,
  isCustom: false,
  isChecked: false,
  isDisabled: false,
};

describe('useGenericList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should auto-fetch list on mount', async () => {
    const mockListWithItem = { ...mockList, items: [mockItem] };
    mockService.getUserList.mockResolvedValue(ok(mockListWithItem));

    const { result } = renderHook(() =>
      useList<KitList, KitItem>('useGenericList', mockService, {
        userId: 'test-user',
        autoFetch: true,
      }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockService.getUserList).toHaveBeenCalledWith('test-user');
    expect(result.current.list?.items).toEqual([mockItem]);
    expect(result.current.error).toBeNull();
  });

  it('should set error state if fetch fails', async () => {
    const testError = new FirestoreError(ErrorCode.DB_READ_ERROR, 'Fetch failed', 'Fetch failed');
    mockService.getUserList.mockResolvedValue(err(testError));

    const { result } = renderHook(() =>
      useList<KitList, KitItem>('useGenericList', mockService, {
        userId: 'test-user',
        autoFetch: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.list).toBeNull();
    expect(result.current.error).toEqual(testError);
  });

  it('should add an item and refetch', async () => {
    const newItem = { ...mockItem, id: 'item-456' };
    const initialList = { ...mockList, items: [mockItem] };
    const updatedList = { ...mockList, items: [mockItem, newItem] };

    mockService.getUserList
      .mockResolvedValueOnce(ok(initialList)) // Initial fetch
      .mockResolvedValueOnce(ok(updatedList)); // Refetch after add
    mockService.addUserItem.mockResolvedValue(ok(newItem));

    const { result } = renderHook(() =>
      useList<KitList, KitItem>('useGenericList', mockService, {
        userId: 'test-user',
        autoFetch: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.list?.items).toEqual([mockItem]);

    // Call addUserItem
    await act(async () => {
      await result.current.addUserItem(newItem);
    });

    expect(mockService.addUserItem).toHaveBeenCalledWith('test-user', newItem);
    expect(result.current.list?.items).toEqual([mockItem, newItem]);
  });

  it('should update an item and refetch', async () => {
    const updatedItem = { ...mockItem, isChecked: true };
    const initialList = { ...mockList, items: [mockItem] };
    const updatedList = { ...mockList, items: [updatedItem] };

    mockService.getUserList
      .mockResolvedValueOnce(ok(initialList)) // Initial fetch
      .mockResolvedValueOnce(ok(updatedList)); // Refetch after update
    mockService.batchUpdateUserItems.mockResolvedValue(ok(undefined));

    const { result } = renderHook(() =>
      useList<KitList, KitItem>('useGenericList', mockService, {
        userId: 'test-user',
        autoFetch: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call batchUpdateUserItems
    await act(async () => {
      await result.current.batchUpdateUserItems([{ id: mockItem.id, isChecked: true }]);
    });

    expect(mockService.batchUpdateUserItems).toHaveBeenCalledWith('test-user', [
      { id: mockItem.id, isChecked: true },
    ]);
    expect(result.current.list?.items).toEqual([updatedItem]);
  });
});
