import { UserPreferencesService } from '@/services/user-preferences-service';
import { IUserPreferencesRepository } from '@/repositories/i-user-preferences-repository';
import { UserPreferences, defaultUserPreferences } from '@/domain/user/user.schema';
import { ok, err } from '@/domain/common/result';
import { FirestoreError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';

// Create a mock repository
const mockRepository: jest.Mocked<IUserPreferencesRepository> = {
  get: jest.fn(),
  getByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  const userId = 'test-user-id';
  const mockPreferences: UserPreferences = {
    ...defaultUserPreferences(userId),
    id: 'prefs-id',
    darkMode: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserPreferencesService(mockRepository);
  });

  describe('getByUserId', () => {
    it('should return preferences from repository', async () => {
      mockRepository.getByUserId.mockResolvedValue(ok(mockPreferences));

      const result = await service.getByUserId(userId);

      expect(mockRepository.getByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(ok(mockPreferences));
    });

    it('should return null if repository returns null', async () => {
      mockRepository.getByUserId.mockResolvedValue(ok(null as any));

      const result = await service.getByUserId(userId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeNull();
      }
    });

    it('should return error if repository fails', async () => {
      const dbError = new FirestoreError(ErrorCode.DB_READ_ERROR, 'DB error', 'DB error');
      mockRepository.getByUserId.mockResolvedValue(err(dbError));

      const result = await service.getByUserId(userId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(dbError);
      }
    });
  });

  describe('update', () => {
    it('should call update on the repository', async () => {
      const preferencesId = 'prefs-id';
      const updates: Partial<UserPreferences> = { darkMode: false };
      mockRepository.update.mockResolvedValue(ok(mockPreferences));

      const result = await service.update(userId, preferencesId, updates);

      expect(mockRepository.update).toHaveBeenCalledWith(userId, preferencesId, updates);
      expect(result.success).toBe(true);
    });

    it('should return error if update fails', async () => {
      const preferencesId = 'prefs-id';
      const dbError = new FirestoreError(ErrorCode.DB_WRITE_ERROR, 'DB error', 'DB error');
      const updates: Partial<UserPreferences> = { darkMode: false };
      mockRepository.update.mockResolvedValue(err(dbError));

      const result = await service.update(userId, preferencesId, updates);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(dbError);
      }
    });
  });
});
