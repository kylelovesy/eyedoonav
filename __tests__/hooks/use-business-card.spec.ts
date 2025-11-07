import { renderHook, waitFor } from '@testing-library/react-native';
import { useBusinessCard } from '../../src/hooks/use-business-card';
import { ok, err } from '../../src/domain/common/result';
import { ErrorMapper } from '../../src/utils/error-mapper';
import { BusinessCard, BusinessCardUpdate } from '../../src/domain/user/business-card.schema';
import { AppError } from '../../src/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
// No need to import BusinessCardService or ServiceFactory here anymore

// Mock service methods
const mockGetBusinessCard = jest.fn();
const mockUpdateBusinessCard = jest.fn();
const mockBusinessCardService = {
  getBusinessCard: mockGetBusinessCard,
  updateBusinessCard: mockUpdateBusinessCard,
  // Add other methods if future tests need them (e.g., hasBusinessCard)
} as any; // Type as any for simplicity in unit tests; refine if needed

const mockCard: BusinessCard = {
  id: 'test-id',
  userId: 'userId-123',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
  companyName: 'Test Business',
  createdAt: new Date(),
  contactEmail: 'test@biz.com',
  website: null,
  jobTitle: null,
  street: null,
  city: null,
  postalCode: null,
  contactPhone: null,
  tiktok: null,
  socialMediaOther: null,
  notes: null,
  facebook: null,
  instagram: null,
  twitter: null,
  linkedin: null,
  youtube: null,
  pinterest: null,
  updatedAt: null,
};

const mockUpdatedCard: BusinessCard = {
  ...mockCard,
  companyName: 'New Name',
};

const mockError = ErrorMapper.createGenericError(
  ErrorCode.TEST_ERROR,
  'Test Error',
  'Test error message',
  'test-context',
);

describe('useBusinessCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch card on mount and set state correctly', async () => {
    // Arrange
    mockGetBusinessCard.mockResolvedValue(ok(mockCard));

    // Act
    const { result } = renderHook(() =>
      useBusinessCard('userId-123', mockBusinessCardService, { autoFetch: true }),
    );

    // Assert
    expect(result.current.loading).toBe(true);
    expect(mockGetBusinessCard).toHaveBeenCalledWith('userId-123');

    // Wait for state update
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.card).toEqual(mockCard);
      expect(result.current.error).toBe(null);
    });
  });

  it('should set error state on fetch failure', async () => {
    // Arrange
    mockGetBusinessCard.mockResolvedValue(err(mockError));

    // Act
    const { result } = renderHook(() =>
      useBusinessCard('userId-123', mockBusinessCardService, { autoFetch: true }),
    );

    // Assert
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(mockError);
      expect(result.current.card).toBe(null);
    });
  });

  it('should call updateCard and refetch on success', async () => {
    // Arrange
    const updates: BusinessCardUpdate = { companyName: 'New Name' };
    mockGetBusinessCard.mockResolvedValueOnce(ok(mockCard)); // Initial fetch
    mockUpdateBusinessCard.mockResolvedValue(ok(undefined)); // Update call
    mockGetBusinessCard.mockResolvedValueOnce(ok(mockUpdatedCard)); // Refetch

    const { result } = renderHook(() =>
      useBusinessCard('userId-123', mockBusinessCardService, { autoFetch: true }),
    );

    // Wait for initial load
    await waitFor(() => expect(result.current.card).toEqual(mockCard));

    // Act
    await result.current.updateCard(updates);

    // Assert
    expect(mockUpdateBusinessCard).toHaveBeenCalledWith('userId-123', updates);
    expect(mockGetBusinessCard).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(result.current.card).toEqual(mockUpdatedCard);
    });
  });
});
