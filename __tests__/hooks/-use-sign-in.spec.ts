// This file tests the useSignIn hook
// Note the updated import paths!

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSignIn } from '../../src/hooks/-use-sign-in';
// import { authService } from '../../src/services/auth-service';
import { authService } from '../../src/services/ServiceFactory';
import { AuthError } from '../../src/domain/common/errors';
import type { AppError } from '../../src/domain/common/errors';
import { Result, err, ok } from '../../src/domain/common/result';
import { defaultUserPreferences, BaseUser, UserRole } from '../../src/domain/user/user.schema';
import { ErrorCode } from '../../src/constants/error-code-registry';
import { useAuthStore } from '../../src/stores/use-auth-store';

// Add at top, before other mocks
jest.mock('@/stores/use-auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    setUser: jest.fn(),
  })),
}));

// Mock Firebase before any imports
jest.mock('firebase/app', () => {
  const mockApp = {};
  return {
    initializeApp: jest.fn(() => mockApp),
    getApp: jest.fn(() => mockApp),
    getApps: jest.fn(() => []),
  };
});

jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(() => ({})),
  // ... other auth mocks
}));

// Mock the auth-service
// We use the new import path to tell Jest what to mock
jest.mock('../../src/services/auth-service');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Mock the useAuthStore
const mockSetAuthUser = jest.fn(); // <-- Rename your mock function
jest.mock('../../src/stores/use-auth-store', () => ({
  useAuthStore: () => ({
    setAuthUser: mockSetAuthUser, // <-- MATCH THE HOOK'S IMPLEMENTATION
  }),
}));

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

// Mock data
const mockAppUser: BaseUser = {
  id: '1234567890',
  email: 'test@example.com',
  displayName: 'Test User',
  phone: null,
  role: UserRole.USER,
  isEmailVerified: false,
  isActive: true,
  isBanned: false,
  hasCustomizations: false,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
};

const mockError = new AuthError(
  ErrorCode.AUTH_INVALID_CREDENTIALS,
  'Invalid credentials',
  'Invalid credentials',
);

// Mock zustand store
const mockSetUser = jest.fn();

jest.mock('@/stores/use-auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    setUser: mockSetUser,
  })),
}));

describe('useSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful sign-in', async () => {
    // Arrange
    mockedAuthService.signIn.mockResolvedValue(ok(mockAppUser));
    const { result } = renderHook(() => useSignIn());

    // Act: Call the signIn function
    act(() => {
      result.current.signIn({ email: 'test@example.com', password: 'password', rememberMe: false });
    });

    // Assert: Wait for async operations to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Assert: Check final state
    expect(mockedAuthService.signIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      rememberMe: false,
    });
    expect(mockSetUser).toHaveBeenCalledWith(mockAppUser);
    expect(result.current.error).toBeNull();
  });

  it('should handle failed sign-in', async () => {
    // Arrange
    mockedAuthService.signIn.mockResolvedValue(err(mockError));
    const { result } = renderHook(() => useSignIn());

    // Act: Call the signIn function
    act(() => {
      result.current.signIn({
        email: 'test@example.com',
        password: 'wrong-password',
        rememberMe: false,
      });
    });

    // Assert: Wait for async operations to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Assert: Check final state
    expect(mockedAuthService.signIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'wrong-password',
      rememberMe: false,
    });
    expect(mockSetAuthUser).not.toHaveBeenCalled();
    expect(result.current.error).toBe(mockError);
  });
});
