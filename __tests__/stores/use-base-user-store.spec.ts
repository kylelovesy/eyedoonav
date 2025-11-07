import { useBaseUserStore } from '../../src/stores/use-base-user-store';
import { act } from '@testing-library/react-native';
import { BaseUser, UserRole } from '../../src/domain/user/user.schema';
import { ErrorMapper } from '../../src/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';

// Mock data
const mockUser: BaseUser = {
  id: 'userId-123',
  email: 'test@example.com',
  displayName: 'Test User',
  phone: null,
  role: UserRole.USER,
  isEmailVerified: true,
  isActive: true,
  isBanned: false,
  hasCustomizations: false,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
};

const mockError = ErrorMapper.createGenericError(
  ErrorCode.DB_NOT_FOUND,
  'Test Error',
  'Test error message',
  'test-context',
);

describe('useBaseUserStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    act(() => {
      useBaseUserStore.getState().reset();
    });
  });

  it('should have the correct initial state', () => {
    const state = useBaseUserStore.getState();
    expect(state.user).toBe(null);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('should set user on setUser', () => {
    act(() => {
      useBaseUserStore.getState().setUser(mockUser);
    });

    const state = useBaseUserStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.error).toBe(null);
    expect(state.loading).toBe(false);
  });

  it('should set error and loading false on setError', () => {
    act(() => {
      useBaseUserStore.getState().setError(mockError);
    });

    const state = useBaseUserStore.getState();
    expect(state.error).toEqual(mockError);
    expect(state.loading).toBe(false);
    expect(state.user).toBe(null);
  });

  it('should set loading on setLoading', () => {
    act(() => {
      useBaseUserStore.getState().setLoading(true);
    });

    const state = useBaseUserStore.getState();
    expect(state.loading).toBe(true);
    expect(state.user).toBe(null);
    expect(state.error).toBe(null);
  });

  it('should reset the store to initial state', () => {
    // 1. Set some state
    act(() => {
      useBaseUserStore.getState().setUser(mockUser);
    });
    expect(useBaseUserStore.getState().user).toEqual(mockUser);

    // 2. Reset
    act(() => {
      useBaseUserStore.getState().reset();
    });

    // 3. Check initial state
    const state = useBaseUserStore.getState();
    expect(state.user).toBe(null);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });
});
