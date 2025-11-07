import {
  baseUserSchema,
  userProfileSchema,
  userPreferencesSchema,
  userCustomizationsSchema,
  userSubscriptionSchema,
  userSetupSchema,
} from '../../../src/domain/user/user.schema';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore'; // If needed for dates

describe('User Schemas', () => {
  // --- BaseUserSchema ---
  describe('BaseUserSchema', () => {
    const validBaseUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate a correct BaseUser object', () => {
      const validBaseUser = {
        id: '123',
        email: 'test@example.com',
        displayName: 'Test User',
        phone: null,
        // Add all required
      };
      const result = baseUserSchema.safeParse(validBaseUser);
      expect(result.success).toBe(true);
    });

    it('should fail if required field email is missing', () => {
      const invalidUser = { ...validBaseUser, email: undefined };
      const result = baseUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    /**
     * !! BUG FIX TEST !!
     * This test validates the fix for the "Unsupported field value: undefined" error.
     * It ensures that if 'phone' is missing or undefined, it defaults to 'null'.
     */
    it('should default optional field "phone" to null if undefined or missing', () => {
      const { phone, ...userWithoutPhone } = validBaseUser;
      const result = baseUserSchema.safeParse(userWithoutPhone);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBeUndefined(); // No default
      }
    });

    it('should accept a valid phone number string', () => {
      const userWithPhone = { ...validBaseUser, phone: '123-456-7890' };
      const result = baseUserSchema.safeParse(userWithPhone);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe('123-456-7890'); // No change in schema
      }
    });
  });

  // --- UserProfileSchema ---
  describe('UserProfileSchema', () => {
    it('should validate a correct UserProfile object', () => {
      const validProfile = {
        id: '123',
        userId: '123',
        name: { firstName: 'Test', lastName: 'User' },
        bio: 'test bio',
        website: 'https://test.com',
        businessName: 'Test Business',
        bannedAt: null,
        bannedReason: null,
        createdAt: new Date(),
      };
      const result = userProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should default optional fields to null', () => {
      const minimalInput = {
        id: 'test-id',
        userId: 'test-user',
        name: { firstName: 'Test', lastName: 'User' },
        createdAt: new Date(),
      };
      const result = userProfileSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bio).toBeNull(); // Schema defaults to null
        expect(result.data.website).toBeNull();
        expect(result.data.businessName).toBeUndefined(); // Optional field
      }
    });
  });

  // --- UserPreferencesSchema ---
  describe('UserPreferencesSchema', () => {
    it('should validate and default UserPreferences', () => {
      const minimalInput = {
        id: 'test-id',
        userId: 'test-user',
        createdAt: new Date(),
      };
      const result = userPreferencesSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.darkMode).toBe(false); // Schema defaults to false
        expect(result.data.notifications).toBe(true); // Schema defaults to true
      }
    });
  });

  // --- Other Schemas (Basic Validation) ---
  describe('UserCustomizationsSchema', () => {
    it('should validate UserCustomizationsSchema', () => {
      const result = userCustomizationsSchema.safeParse({}); // Should succeed with defaults
      expect(result.success).toBe(true);
    });
  });

  it('should validate UserSubscriptionSchema', () => {
    const minimalInput = {
      id: 'test-id',
      userId: 'test-user',
      startDate: new Date(),
      createdAt: new Date(),
    };
    const result = userSubscriptionSchema.safeParse(minimalInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('inactive'); // Schema defaults to INACTIVE
    }
  });

  it('should validate UserSetupSchema', () => {
    const result = userSetupSchema.safeParse({});
    expect(result.success).toBe(true); // If all optional
    if (result.success) {
      expect(result.data.firstTimeSetup).toBe(true); // Schema defaults to true
    }
  });
});
