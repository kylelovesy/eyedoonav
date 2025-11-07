// __tests__/repositories/firestore/firestore-user-profile-repository.spec.ts

import { FirestoreUserProfileRepository } from '@/repositories/firestore/firestore-user-profile-repository';
import { ok, err, isErr } from '@/domain/common/result';
import { FirestoreError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; // Import the real functions

// --- Mocks ---
// Mock firebase config first
jest.mock('@/config/firebaseConfig', () => ({
  db: {},
  storage: {},
}));

// This mock overrides the global one from jest.setup.js for this file
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  // Add other firestore functions you use here if needed
}));

// Create typed mocks
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockDoc = doc as jest.Mock;

const mockDocRef = { path: 'users/test-user-id/profile/profile-id' };

describe('FirestoreUserProfileRepository', () => {
  let repository: FirestoreUserProfileRepository;
  const userId = 'test-user-id';
  const profileId = 'profile-id';
  const mockProfileData = {
    id: profileId,
    userId: userId,
    name: { firstName: 'Test', lastName: 'User' },
    bio: 'Test bio',
    website: 'https://example.com',
    businessName: null,
    bannedAt: null,
    bannedReason: null,
    createdAt: new Date(),
    updatedAt: null,
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
    mockUpdateDoc.mockReset();
    mockDoc.mockReset();

    repository = new FirestoreUserProfileRepository();

    // Mock the doc reference
    mockDoc.mockReturnValue(mockDocRef);
  });

  // --- Test get() ---
  describe('get', () => {
    it('should return a user profile if document exists', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProfileData,
      });

      // Act
      const result = await repository.get(userId, profileId);

      // Assert
      expect(mockDoc).toHaveBeenCalledWith({}, `users/${userId}/profile/${profileId}`);
      expect(mockGetDoc).toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(mockProfileData);
      }
    });

    it('should return null if document does not exist', async () => {
      // Arrange
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      // Act
      const result = await repository.get(userId, profileId);

      // Assert
      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCode.DB_NOT_FOUND);
      }
    });

    it('should return an error if getDoc fails', async () => {
      // Arrange
      const firestoreError = new Error('Permission denied');
      mockGetDoc.mockRejectedValue(firestoreError);

      // Act
      const result = await repository.get(userId, profileId);

      // Assert
      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(FirestoreError);
        expect(result.error.code).toBe(ErrorCode.DB_NETWORK_ERROR);
      }
    });
  });

  // --- Test update() ---
  describe('update', () => {
    it('should successfully update a profile', async () => {
      // Arrange
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProfileData,
      });
      const updateData = { bio: 'New bio' };

      // Act
      const result = await repository.update(userId, profileId, updateData);

      // Assert
      expect(mockDoc).toHaveBeenCalledWith({}, `users/${userId}/profile/${profileId}`);
      expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeDefined();
      }
    });

    it('should return an error if updateDoc fails', async () => {
      // Arrange
      const firestoreError = new Error('Permission denied');
      mockUpdateDoc.mockRejectedValue(firestoreError);
      const updateData = { bio: 'New bio' };

      // Act
      const result = await repository.update(userId, profileId, updateData);

      // Assert
      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(FirestoreError);
        expect(result.error.code).toBe(ErrorCode.DB_NETWORK_ERROR);
      }
    });
  });
});
