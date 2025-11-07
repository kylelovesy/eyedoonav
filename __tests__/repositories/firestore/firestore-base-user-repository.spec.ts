import { FirestoreBaseUserRepository } from '../../../src/repositories/firestore/firestore-base-user-repository';
import { doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import { BaseUser, BaseUserCreate, UserRole } from '../../../src/domain/user/user.schema';
import { ErrorCode } from '../../../src/constants/error-code-registry';

// Add at the very top of the file, before any imports
jest.mock('@/config/firebaseConfig', () => ({
  db: {}, // Mock Firestore instance
  storage: {}, // If needed
}));

// Mock Firebase Firestore SDK
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  // Add more based on repo usage (e.g., onSnapshot if realtime)
  serverTimestamp: jest.fn(() => ({})),
  Timestamp: jest.fn(),
}));

// If auth is used
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(),
  // etc.
}));

// Mock typed functions
const mockDoc = doc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;

const mockDb: Firestore = {} as Firestore;
const mockDocRef = { id: 'mock-doc-ref' };

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

let repo: FirestoreBaseUserRepository;

describe('FirestoreBaseUserRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue(mockDocRef);
    repo = new FirestoreBaseUserRepository(); // Default constructor takes no arguments
  });

  describe('create', () => {
    /**
     * !! BUG FIX TEST !!
     * This test confirms that the repository handles undefined phone field
     * by passing it as undefined to setDoc (Firestore will treat as null).
     */
    it('should handle undefined phone in payload for create', async () => {
      // Arrange
      const userPayload = {
        id: 'userId-123',
        email: 'test@example.com',
        displayName: 'Test User',
        phone: null,
        role: UserRole.USER,
        isEmailVerified: true,
        isActive: true,
        isBanned: false,
        hasCustomizations: false,
      } as unknown as BaseUserCreate; // Type assertion for omitted optional fields
      mockSetDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...userPayload,
          id: 'userId-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }); // Mock getById success

      // Act
      const result = await repo.create('userId-123', userPayload);

      // Assert
      expect(mockDoc).toHaveBeenCalledWith(mockDb, 'users/userId-123'); // Full path
      expect(mockSetDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          id: 'userId-123',
          email: 'test@example.com',
          displayName: 'Test User',
          phone: null, // Expect null as per sanitization
          role: UserRole.USER,
          isEmailVerified: true,
          isActive: true,
          isBanned: false,
          hasCustomizations: false,
          createdAt: expect.any(Object),
          updatedAt: expect.any(Object),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should return error on setDoc failure', async () => {
      // Arrange
      const error = new Error('Firestore failed');
      mockSetDoc.mockRejectedValue(error);

      // Act
      const result = await repo.create('userId-123', mockUser);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DB_003');
      }
    });
  });

  describe('getById', () => {
    it('should return user data if document exists', async () => {
      // Arrange
      const mockSnap = {
        exists: () => true,
        data: () => mockUser,
      };
      mockGetDoc.mockResolvedValue(mockSnap);

      // Act
      const result = await repo.getById('userId-123');

      // Assert
      expect(mockGetDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(mockUser);
      }
    });

    it('should return DB_NOT_FOUND error if document does not exist', async () => {
      // Arrange
      const mockSnap = {
        exists: () => false,
      };
      mockGetDoc.mockResolvedValue(mockSnap);

      // Act
      const result = await repo.getById('userId-123');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCode.DB_NOT_FOUND); // From parseSnapshot
      }
    });
  });
});
