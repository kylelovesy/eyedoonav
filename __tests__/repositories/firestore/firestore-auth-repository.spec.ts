import { FirestoreAuthRepository } from '@/repositories/firestore/firestore-auth-repository';
import { IBaseUserRepository } from '@/repositories/i-base-user-repository';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '@/config/firebaseConfig';
import { ok, err, isErr } from '@/domain/common/result';
import { AuthError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { BaseUser } from '@/domain/user/user.schema';
import { UserRole, SubscriptionPlan } from '@/constants/enums';

// Mock firebase/auth
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendEmailVerification: jest.fn(),
}));

// Mock the imported 'auth' instance
jest.mock('@/config/firebaseConfig', () => ({
  auth: {}, // Mocked auth instance
}));

const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockSignUp = createUserWithEmailAndPassword as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockSendEmailVerification = sendEmailVerification as jest.Mock;

// Mock IBaseUserRepository
const mockBaseUserRepository: jest.Mocked<IBaseUserRepository> = {
  getById: jest.fn(),
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
};

describe('FirestoreAuthRepository', () => {
  let repository: FirestoreAuthRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new FirestoreAuthRepository(mockBaseUserRepository);
  });

  describe('signIn', () => {
    it('should return user credentials on successful sign-in', async () => {
      const mockUserCred = { user: { uid: '123', email: 'test@example.com' } };
      const mockUser: BaseUser = {
        id: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        phone: null,
        role: UserRole.USER,
        isEmailVerified: true,
        isActive: true,
        isBanned: false,
        hasCustomizations: false,
        createdAt: new Date(),
        deletedAt: null,
      };

      mockSignIn.mockResolvedValue(mockUserCred);
      mockBaseUserRepository.getById.mockResolvedValue(ok(mockUser));

      const result = await repository.signIn({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });

      expect(mockSignIn).toHaveBeenCalledWith(auth, 'test@example.com', 'password123');
      expect(mockBaseUserRepository.getById).toHaveBeenCalledWith('123');
      expect(result).toEqual(ok(mockUser));
    });

    it('should return an AuthError on invalid credentials', async () => {
      const error = { code: 'auth/invalid-credential' };
      mockSignIn.mockRejectedValue(error);

      const result = await repository.signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
        rememberMe: false,
      });

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(AuthError);
        expect(result.error.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
      }
    });

    it('should return a generic AuthError on other failures', async () => {
      const error = { code: 'auth/network-request-failed' };
      mockSignIn.mockRejectedValue(error);

      const result = await repository.signIn({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(AuthError);
        expect(result.error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      }
    });
  });

  describe('signUp', () => {
    it('should return user credentials on successful sign-up', async () => {
      const mockUserCred = { user: { uid: '456', email: 'new@example.com' } };
      const mockUser: BaseUser = {
        id: '456',
        email: 'new@example.com',
        displayName: 'New User',
        phone: null,
        role: UserRole.USER,
        isEmailVerified: false,
        isActive: true,
        isBanned: false,
        hasCustomizations: false,
        createdAt: new Date(),
        deletedAt: null,
      };

      mockSignUp.mockResolvedValue(mockUserCred);
      mockSendEmailVerification.mockResolvedValue(undefined);
      mockBaseUserRepository.create.mockResolvedValue(ok(mockUser));

      const result = await repository.signUp({
        email: 'new@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        displayName: 'New User',
        subscriptionPlan: SubscriptionPlan.FREE,
        acceptTerms: true,
        acceptPrivacy: true,
      });

      expect(mockSignUp).toHaveBeenCalledWith(auth, 'new@example.com', 'password123');
      expect(mockBaseUserRepository.create).toHaveBeenCalledWith('456', expect.any(Object));
      expect(result).toEqual(ok(mockUser));
    });

    it('should return an AuthError if email is in use', async () => {
      const error = { code: 'auth/email-already-in-use' };
      mockSignUp.mockRejectedValue(error);

      const result = await repository.signUp({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        displayName: 'Test User',
        subscriptionPlan: SubscriptionPlan.FREE,
        acceptTerms: true,
        acceptPrivacy: true,
      });

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(AuthError);
        expect(result.error.code).toBe(ErrorCode.AUTH_EMAIL_IN_USE);
      }
    });

    it('should return an AuthError for weak password', async () => {
      const error = { code: 'auth/weak-password' };
      mockSignUp.mockRejectedValue(error);

      const result = await repository.signUp({
        email: 'test@example.com',
        password: '123',
        confirmPassword: '123',
        displayName: 'Test User',
        subscriptionPlan: SubscriptionPlan.FREE,
        acceptTerms: true,
        acceptPrivacy: true,
      });

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(AuthError);
        expect(result.error.code).toBe(ErrorCode.AUTH_WEAK_PASSWORD);
      }
    });
  });

  describe('signOut', () => {
    it('should return ok on successful sign-out', async () => {
      mockSignOut.mockResolvedValue(undefined);

      const result = await repository.signOut();

      expect(mockSignOut).toHaveBeenCalledWith(auth);
      expect(result).toEqual(ok(undefined));
    });

    it('should return an AuthError on sign-out failure', async () => {
      const error = { code: 'auth/internal-error' };
      mockSignOut.mockRejectedValue(error);

      const result = await repository.signOut();

      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(AuthError);
        expect(result.error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      }
    });
  });
});
