import { UserProfileService } from '../../src/services/user-profile-service';
import { IUserProfileRepository } from '../../src/repositories/i-user-profile-repository';
import { ok, err } from '../../src/domain/common/result';
import { ErrorMapper } from '../../src/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';
import { UserProfile, UserProfileUpdate } from '../../src/domain/user/user.schema';

// Mocks
const mockProfileRepository: jest.Mocked<IUserProfileRepository> = {
  get: jest.fn(),
  getByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockProfile: UserProfile = {
  id: 'test-profile-id',
  userId: 'userId-123',
  name: { firstName: 'Test', lastName: 'User' },
  createdAt: new Date(),
  bio: 'Test bio',
  website: 'https://example.com',
  bannedAt: null,
  bannedReason: null,
};

const mockError = ErrorMapper.createGenericError(
  ErrorCode.DB_NOT_FOUND,
  'Database error',
  'Test error message',
  'test-context',
);

describe('UserProfileService', () => {
  let service: UserProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserProfileService(mockProfileRepository);
  });

  describe('getByUserId', () => {
    it('should get profile and return it on success', async () => {
      // Arrange
      mockProfileRepository.getByUserId.mockResolvedValue(ok(mockProfile));

      // Act
      const result = await service.getByUserId('userId-123');

      // Assert
      expect(mockProfileRepository.getByUserId).toHaveBeenCalledWith('userId-123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(mockProfile);
      }
    });

    it('should return error on failure', async () => {
      // Arrange
      mockProfileRepository.getByUserId.mockResolvedValue(err(mockError));

      // Act
      const result = await service.getByUserId('userId-123');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(mockError);
      }
    });
  });

  describe('update', () => {
    it('should call repository.update and return updated profile', async () => {
      // Arrange
      const updates: UserProfileUpdate = { bio: 'New bio' };
      mockProfileRepository.update.mockResolvedValue(ok(mockProfile));

      // Act
      const result = await service.update('userId-123', 'test-profile-id', updates);

      // Assert
      expect(mockProfileRepository.update).toHaveBeenCalledWith(
        'userId-123',
        'test-profile-id',
        updates,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(mockProfile);
      }
    });
  });
});
