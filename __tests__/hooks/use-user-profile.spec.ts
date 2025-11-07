import { renderHook, waitFor } from '@testing-library/react-native';
import { useUserProfile } from '../../src/hooks/use-user-profile';
import { ok, err } from '../../src/domain/common/result';
import { ErrorMapper } from '../../src/utils/error-mapper';
import { UserProfile, UserProfileUpdate } from '../../src/domain/user/user.schema';
import { AppError } from '../../src/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';

// Mock service methods
const mockGetByUserId = jest.fn();
const mockUpdate = jest.fn();
const mockUserProfileService = {
  getByUserId: mockGetByUserId,
  update: mockUpdate,
  // Add other methods if future tests need them (e.g., get)
} as any; // Type as any for unit test flexibility

const mockProfile: UserProfile = {
  id: 'test-profile-id',
  userId: 'userId-123',
  name: { firstName: 'Test', lastName: 'User' },
  createdAt: new Date(),
  bio: 'Test bio',
  website: 'https://example.com',
  bannedAt: null,
  bannedReason: null,
  businessName: '',
};

const mockUpdatedProfile: UserProfile = {
  ...mockProfile,
  bio: 'New bio',
};

const mockError = ErrorMapper.createGenericError(
  ErrorCode.TEST_ERROR,
  'Test Error',
  'Test error message',
  'test-context',
);

describe('useUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch profile on mount and set state correctly', async () => {
    // Arrange
    mockGetByUserId.mockResolvedValue(ok(mockProfile));

    // Act
    const { result } = renderHook(() =>
      useUserProfile('userId-123', mockUserProfileService, { autoFetch: true }),
    );

    // Assert
    expect(result.current.loading).toBe(true);

    // Wait for state update
    await waitFor(() => {
      // Check that the fetch was called *and* the state updated
      expect(mockGetByUserId).toHaveBeenCalledWith('userId-123'); // <-- MOVE IT HERE
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBe(null);
    });
  });

  it('should set error state on fetch failure', async () => {
    // Arrange
    mockGetByUserId.mockResolvedValue(err(mockError));

    // Act
    const { result } = renderHook(() =>
      useUserProfile('userId-123', mockUserProfileService, { autoFetch: true }),
    );

    // Assert
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(mockError);
      expect(result.current.profile).toBe(null);
    });
  });

  it('should not fetch if userId is undefined', () => {
    // Act
    const { result } = renderHook(() => useUserProfile(null, mockUserProfileService));

    // Assert
    expect(mockGetByUserId).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.profile).toBe(null);
  });

  it('should call update and refetch on success', async () => {
    // Arrange
    const updates: UserProfileUpdate = { bio: 'New bio' };
    mockGetByUserId.mockResolvedValueOnce(ok(mockProfile)); // Initial fetch
    mockUpdate.mockResolvedValue(ok(mockUpdatedProfile)); // Update call
    mockGetByUserId.mockResolvedValueOnce(ok(mockUpdatedProfile)); // Refetch

    const { result } = renderHook(() =>
      useUserProfile('userId-123', mockUserProfileService, { autoFetch: true }),
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.profile).toEqual(mockProfile));

    // Act
    const success = await result.current.updateProfile(updates);

    // Assert
    expect(success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith('userId-123', 'test-profile-id', updates);
    expect(mockGetByUserId).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(result.current.profile).toEqual(mockUpdatedProfile);
    });
  });
});
