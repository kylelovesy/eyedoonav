// This file tests the business logic in AuthService
// Note the updated import paths!

import { AuthService } from '../../src/services/auth-service';
import { IAuthRepository } from '../../src/repositories/i-auth-repository';
import { AuthError } from '../../src/domain/common/errors';
import type { AppError } from '../../src/domain/common/errors';
import { err, ok } from '../../src/domain/common/result';
import { defaultUserPreferences, BaseUser, UserRole } from '../../src/domain/user/user.schema';
import { ErrorCode } from '../../src/constants/error-code-registry';
import { IBaseUserRepository } from '@/repositories/i-base-user-repository';
import { ErrorMapper } from '@/utils/error-mapper';

// Mock rate limiter
jest.mock('../../src/utils/rate-limiter', () => ({
  signInRateLimiter: {
    canAttempt: jest.fn(() => true),
    reset: jest.fn(),
    getTimeUntilUnblocked: jest.fn(() => 0),
  },
  signUpRateLimiter: {
    canAttempt: jest.fn(() => true),
    reset: jest.fn(),
    getTimeUntilUnblocked: jest.fn(() => 0),
  },
  passwordResetRateLimiter: {
    canAttempt: jest.fn(() => true),
    reset: jest.fn(),
    getTimeUntilUnblocked: jest.fn(() => 0),
  },
  emailVerificationRateLimiter: {
    canAttempt: jest.fn(() => true),
    reset: jest.fn(),
    getTimeUntilUnblocked: jest.fn(() => 0),
  },
}));

// Mock validation helpers
jest.mock('../../src/utils/validation-helpers', () => ({
  validateWithSchema: jest.fn((schema, data, context) => ({
    success: true,
    value: data,
  })),
}));

// Create mock objects for the dependencies
const mockAuthRepository: jest.Mocked<IAuthRepository> = {
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  passwordReset: jest.fn(),
  passwordResetConfirm: jest.fn(),
  passwordChange: jest.fn(),
  getProfile: jest.fn(),
  verifyEmail: jest.fn(),
  resendEmailVerification: jest.fn(),
};

// Mock data
const mockUser: BaseUser = {
  id: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  phone: null as string | null,
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
  ErrorCode.AUTH_INVALID_CREDENTIALS,
  'Invalid credentials',
  'Invalid credentials',
  'test-context',
);

// The test suite
describe('AuthService', () => {
  let authService: AuthService;

  // Before each test, create a new instance of the service
  // and clear all mock function call histories.
  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(mockAuthRepository);
  });

  // Test the signIn method
  describe('signIn', () => {
    it('should return a user on successful sign-in and user fetch', async () => {
      // Arrange
      mockAuthRepository.signIn.mockResolvedValue(ok(mockUser));

      // Act
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password',
        rememberMe: false,
      });

      // Assert
      expect(mockAuthRepository.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        rememberMe: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(mockUser);
      }
    });

    it('should return a failure if auth repository fails', async () => {
      // Arrange
      mockAuthRepository.signIn.mockResolvedValue(err(mockError));

      // Act
      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'wrong-password',
        rememberMe: false,
      });

      // Assert
      expect(mockAuthRepository.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'wrong-password',
        rememberMe: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(mockError);
      }
    });
  });
});
