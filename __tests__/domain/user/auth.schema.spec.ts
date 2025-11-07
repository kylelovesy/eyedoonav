// This file tests the Zod schemas in auth.schema.ts
// Note the updated import path!
import { emailSchema, passwordSchema } from '../../../src/domain/common/shared-schemas';
import { signUpInputSchema } from '../../../src/domain/user/auth.schema';

// Mock Firebase Core
jest.mock('firebase/app', () => {
  const mockApp = {
    // return mock app object
  };

  return {
    initializeApp: jest.fn(() => mockApp),
    getApp: jest.fn(() => mockApp),
    getApps: jest.fn(() => []),
    // Add other core exports if needed
  };
});

describe('Auth Schemas', () => {
  // Test the EmailSchema
  describe('EmailSchema', () => {
    it('should pass for a valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should fail for an invalid email (no @)', () => {
      const result = emailSchema.safeParse('testexample.com');
      expect(result.success).toBe(false);
    });
  });

  // Test the PasswordSchema
  describe('PasswordSchema', () => {
    it('should pass for a strong password', () => {
      const result = passwordSchema.safeParse('Password123!');
      expect(result.success).toBe(true);
    });

    it('should fail for a password that is too short', () => {
      const result = passwordSchema.safeParse('Pass1!');
      expect(result.success).toBe(false);
    });
  });

  // Test the SignUpSchema
  describe('SignUpSchema', () => {
    it('should pass for valid sign-up data', () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        displayName: 'Test User',
        subscriptionPlan: 'free' as any, // Use SubscriptionPlan enum value
        acceptTerms: true,
        acceptPrivacy: true,
      };
      const result = signUpInputSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail if passwords do not match', () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password1234!', // Mismatch
        displayName: 'Test User',
        subscriptionPlan: 'free' as any,
        acceptTerms: true,
        acceptPrivacy: true,
      };
      const result = signUpInputSchema.safeParse(data);
      expect(result.success).toBe(false);
      // Check for the specific refinement error - need to find the right error
      const confirmPasswordError = result.error?.errors.find(
        err => err.path.includes('confirmPassword') || err.message === "Passwords don't match",
      );
      expect(confirmPasswordError?.message).toBe("Passwords don't match");
    });
  });
});
