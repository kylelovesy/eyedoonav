import { renderHook, waitFor } from '@testing-library/react-native';
import { useBaseUser } from '../../src/hooks/use-base-user';
import { ok } from '../../src/domain/common/result';

// Mock service methods
const mockGetById = jest.fn();
const mockBaseUserService = {
  getById: mockGetById,
  create: jest.fn(),
  update: jest.fn(),
  subscribeToUser: jest.fn(),
  updateLastLogin: jest.fn(),
  updateEmailVerification: jest.fn(),
  banUser: jest.fn(),
  unbanUser: jest.fn(),
  updateRole: jest.fn(),
  delete: jest.fn(),
  permanentlyDelete: jest.fn(),
} as any; // Type as any for unit test flexibility

const mockUser = { email: 'test@example.com', name: 'Test User' };

describe('useBaseUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return user data on mount with autoFetch', async () => {
    // Arrange
    mockGetById.mockResolvedValue(ok(mockUser));

    // Act
    const { result } = renderHook(() =>
      useBaseUser('userId-123', mockBaseUserService, { autoFetch: true }),
    );

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
    });
    expect(mockGetById).toHaveBeenCalledWith('userId-123');
  });

  it('should call getById service on mount with autoFetch', async () => {
    // Arrange
    mockGetById.mockResolvedValue(ok(mockUser));

    // Act
    renderHook(() => useBaseUser('userId-123', mockBaseUserService, { autoFetch: true }));

    // Assert
    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith('userId-123');
    });
  });

  it('should return loading true initially with autoFetch', () => {
    // Arrange & Act
    const { result } = renderHook(() =>
      useBaseUser('userId-123', mockBaseUserService, { autoFetch: true }),
    );

    // Assert
    expect(result.current.loading).toBe(true);
  });

  it('should not fetch without autoFetch', () => {
    // Act
    renderHook(() => useBaseUser('userId-123', mockBaseUserService));

    // Assert
    expect(mockGetById).not.toHaveBeenCalled();
  });
});
