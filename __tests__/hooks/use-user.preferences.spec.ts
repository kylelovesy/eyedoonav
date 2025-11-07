import { renderHook, act } from '@testing-library/react-native';
import { useUserPreferences } from '@/hooks/use-user.preferences';
import { UserPreferencesService } from '@/services/user-preferences-service';
import { UserPreferences, defaultUserPreferences } from '@/domain/user/user.schema';
import { ok, err } from '@/domain/common/result';
import { FirestoreError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';

// Mock the service
jest.mock('@/services/user-preferences-service');
const MockUserPreferencesService = UserPreferencesService as jest.MockedClass<
  typeof UserPreferencesService
>;

// Mock service methods
const mockGetPreferences = jest.fn();
const mockUpdatePreferences = jest.fn();

// Mock the service instance
const mockServiceInstance = {
  getPreferences: mockGetPreferences,
  updatePreferences: mockUpdatePreferences,
} as any;

describe('useUserPreferences', () => {
  const userId = 'test-user-id';
  const mockPreferences: UserPreferences = {
    ...defaultUserPreferences(userId),
    id: 'prefs-id',
    darkMode: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockUserPreferencesService.mockImplementation(() => mockServiceInstance);
  });

  it('should auto-fetch preferences on mount', async () => {
    mockGetPreferences.mockResolvedValue(ok(mockPreferences));

    const { result } = renderHook(() =>
      useUserPreferences(userId, mockServiceInstance, { autoFetch: true }),
    );

    expect(result.current.loading).toBe(true);

    expect(mockGetPreferences).toHaveBeenCalledWith(userId);
    expect(result.current.loading).toBe(false);
    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.error).toBeNull();
  });

  it('should set error state if fetch fails', async () => {
    const testError = new FirestoreError(ErrorCode.DB_READ_ERROR, 'Fetch failed', 'Fetch failed');
    mockGetPreferences.mockResolvedValue(err(testError));

    const { result } = renderHook(() =>
      useUserPreferences(userId, mockServiceInstance, { autoFetch: true }),
    );

    expect(result.current.loading).toBe(true);

    expect(result.current.loading).toBe(false);
    expect(result.current.preferences).toBeNull();
    expect(result.current.error).toEqual(testError);
  });

  it('should not fetch on mount if autoFetch is false', () => {
    renderHook(() => useUserPreferences(userId, mockServiceInstance, { autoFetch: false }));

    expect(mockGetPreferences).not.toHaveBeenCalled();
    expect(mockUpdatePreferences).not.toHaveBeenCalled();
  });

  it('should call updatePreferences and refetch data', async () => {
    const updatedPrefs = { ...mockPreferences, darkMode: false };
    mockGetPreferences
      .mockResolvedValueOnce(ok(mockPreferences)) // Initial fetch
      .mockResolvedValueOnce(ok(updatedPrefs)); // Refetch
    mockUpdatePreferences.mockResolvedValue(ok(undefined));

    // Initial render and fetch
    const { result } = renderHook(() =>
      useUserPreferences(userId, mockServiceInstance, { autoFetch: true }),
    );
    expect(result.current.preferences).toEqual(mockPreferences);

    // Call update
    await act(async () => {
      await result.current.updatePreferences({ darkMode: false });
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith(userId, { darkMode: false });
    expect(mockGetPreferences).toHaveBeenCalledTimes(2); // Initial fetch + refetch
    expect(result.current.preferences).toEqual(updatedPrefs);
    expect(result.current.error).toBeNull();
  });

  it('should set error state if update fails', async () => {
    const testError = new FirestoreError(
      ErrorCode.DB_WRITE_ERROR,
      'Update failed',
      'Update failed',
    );
    mockGetPreferences.mockResolvedValue(ok(mockPreferences)); // Initial fetch
    mockUpdatePreferences.mockResolvedValue(err(testError));

    // Initial render
    const { result } = renderHook(() =>
      useUserPreferences(userId, mockServiceInstance, { autoFetch: true }),
    );

    // Call update
    await act(async () => {
      await result.current.updatePreferences({ darkMode: false });
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith(userId, { darkMode: false });
    expect(mockGetPreferences).toHaveBeenCalledTimes(1); // No refetch on error
    expect(result.current.preferences).toEqual(mockPreferences); // State is unchanged
    expect(result.current.error).toEqual(testError);
  });
});
