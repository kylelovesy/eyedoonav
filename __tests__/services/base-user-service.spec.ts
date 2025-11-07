import { BaseUserService } from '../../src/services/base-user-service';
import { IBaseUserRepository } from '../../src/repositories/i-base-user-repository';
import { ok, err } from '../../src/domain/common/result';
import { BaseUser, BaseUserCreate, UserRole } from '../../src/domain/user/user.schema';
import { ErrorCode } from '@/constants/error-code-registry';
import { ErrorMapper } from '@/utils/error-mapper';

// Remove store mock and spies
const mockUserRepository: jest.Mocked<IBaseUserRepository> = {
  create: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  subscribeToUser: jest.fn(),
  updateLastLogin: jest.fn(),
  updateEmailVerification: jest.fn(),
  banUser: jest.fn(),
  unbanUser: jest.fn(),
  updateRole: jest.fn(),
  permanentlyDelete: jest.fn(),
};

const mockUserCreate: BaseUserCreate = {
  id: 'userId-123',
  email: 'test@example.com',
  displayName: 'Test User',
  phone: null,
};

const mockUser: BaseUser = {
  ...mockUserCreate,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
  isEmailVerified: true,
  isActive: true,
  isBanned: false,
  hasCustomizations: false,
  deletedAt: null,
  role: UserRole.USER,
};

const mockError = ErrorMapper.createGenericError(
  ErrorCode.DB_NOT_FOUND,
  'Database error',
  'Test error message',
  'test-context',
);

describe('BaseUserService', () => {
  let service: BaseUserService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    service = new BaseUserService(mockUserRepository);
  });

  describe('getById', () => {
    it('should get user and return user on success', async () => {
      // Arrange
      mockUserRepository.getById.mockResolvedValue(ok(mockUser));

      // Act
      const result = await service.getById('userId-123');

      // Assert - remove store spies
      expect(mockUserRepository.getById).toHaveBeenCalledWith('userId-123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(mockUser);
      }
    });

    it('should return error on failure', async () => {
      // Arrange
      mockUserRepository.getById.mockResolvedValue(err(mockError));

      // Act
      const result = await service.getById('userId-123');

      // Assert - remove store spies
      expect(mockUserRepository.getById).toHaveBeenCalledWith('userId-123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(mockError);
      }
    });
  });

  describe('create', () => {
    it('should call repository.create and return ok', async () => {
      // Arrange
      mockUserRepository.create.mockResolvedValue(ok(mockUser));

      // Act
      const result = await service.create(mockUser.id, mockUserCreate);

      // Assert - remove store
      expect(mockUserRepository.create).toHaveBeenCalledWith(mockUser.id, mockUserCreate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value?.id).toEqual(mockUser.id);
      }
    });
  });

  describe('update', () => {
    it('should call repository.update and return ok', async () => {
      // Arrange
      const updates: Partial<BaseUser> = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updates };
      mockUserRepository.update.mockResolvedValue(ok(updatedUser));
      // Remove getById mock for refresh if not needed

      // Act
      const result = await service.update(mockUser.id, updates);

      // Assert - remove store spies
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, updates);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value?.id).toEqual(updatedUser.id);
      }
    });
  });
});
