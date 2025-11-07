import { FirestoreUserPreferencesRepository } from '@/repositories/firestore/firestore-user-preferences-repository';
import { defaultUserPreferences, UserPreferences } from '@/domain/user/user.schema';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ok, err, isErr } from '@/domain/common/result';
import { FirestoreError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { LanguageOption } from '@/constants/enums';

// Mock firebase config first
jest.mock('@/config/firebaseConfig', () => ({
  db: {},
  storage: {},
}));

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
}));

const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockDoc = doc as jest.Mock;

describe('FirestoreUserPreferencesRepository', () => {
  let repository: FirestoreUserPreferencesRepository;
  const userId = 'test-user-id';
  const preferencesId = 'prefs-id';
  const mockDocRef = { id: 'mock-doc-ref' };
  const mockPreferences: UserPreferences = {
    ...defaultUserPreferences(userId),
    id: preferencesId,
    darkMode: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new FirestoreUserPreferencesRepository();
    mockDoc.mockReturnValue(mockDocRef);
  });

  describe('get', () => {
    it('should return preferences if document exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockPreferences,
      });

      const result = await repository.get(userId, preferencesId);

      expect(mockDoc).toHaveBeenCalledWith({}, `users/${userId}/preferences/${preferencesId}`);
      expect(mockGetDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result).toEqual(ok(mockPreferences));
    });

    it('should return null if document does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await repository.get(userId, preferencesId);

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCode.DB_NOT_FOUND);
      }
    });

    it('should return a FirestoreError on getDoc failure', async () => {
      const error = new Error('Permission denied');
      mockGetDoc.mockRejectedValue(error);

      const result = await repository.get(userId, preferencesId);

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(FirestoreError);
        expect(result.error.code).toBe(ErrorCode.DB_NETWORK_ERROR);
      }
    });
  });

  describe('create', () => {
    it('should create preferences document successfully', async () => {
      const mockCreatedDocRef = { id: 'created-doc-id' };
      mockAddDoc.mockResolvedValue(mockCreatedDocRef);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockPreferences,
      });

      const newPrefs = defaultUserPreferences(userId);

      const result = await repository.create(userId, newPrefs);

      expect(mockCollection).toHaveBeenCalledWith({}, `users/${userId}/preferences`);
      expect(mockAddDoc).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return a FirestoreError on addDoc failure', async () => {
      const error = new Error('Permission denied');
      mockAddDoc.mockRejectedValue(error);
      const newPrefs = defaultUserPreferences(userId);

      const result = await repository.create(userId, newPrefs);

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(FirestoreError);
        expect(result.error.code).toBe(ErrorCode.DB_NETWORK_ERROR);
      }
    });
  });

  describe('update', () => {
    it('should update preferences document successfully', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockPreferences,
      });

      const updates: Partial<UserPreferences> = { darkMode: true, language: LanguageOption.FRENCH };

      const result = await repository.update(userId, preferencesId, updates);

      expect(mockDoc).toHaveBeenCalledWith({}, `users/${userId}/preferences/${preferencesId}`);
      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return a FirestoreError on updateDoc failure', async () => {
      const error = new Error('Permission denied');
      mockUpdateDoc.mockRejectedValue(error);
      const updates: Partial<UserPreferences> = { darkMode: true };

      const result = await repository.update(userId, preferencesId, updates);

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(FirestoreError);
        expect(result.error.code).toBe(ErrorCode.DB_NETWORK_ERROR);
      }
    });
  });
});
