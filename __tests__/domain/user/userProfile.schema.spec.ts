// __tests__/domain/user/userProfile.schema.spec.ts
// Updated test file for userProfileSchema

import { userProfileSchema } from '@/domain/user/user.schema';

describe('userProfileSchema', () => {
  it('should validate a correct user profile', () => {
    const profile = {
      id: 'profile123',
      userId: 'user123',
      name: { firstName: 'John', lastName: 'Doe' },
      bio: 'Test bio',
      website: 'https://example.com',
      businessName: 'Test Business',
      bannedAt: null,
      bannedReason: null,
      createdAt: new Date(),
      updatedAt: null,
    };
    const result = userProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe('https://example.com');
    }
  });

  it('should fail if required field "name" is missing', () => {
    const profile = {
      id: 'profile123',
      userId: 'user123',
      // name is missing
      createdAt: new Date(),
    };
    const result = userProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name']);
      expect(result.error.issues[0].message).toContain('Required');
    }
  });

  it('should fail if name.firstName is empty', () => {
    const profile = {
      id: 'profile123',
      userId: 'user123',
      name: { firstName: '', lastName: 'Doe' },
      createdAt: new Date(),
    };
    const result = userProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name', 'firstName']);
      expect(result.error.issues[0].message).toContain('First name is required');
    }
  });

  it('should fail if website is an invalid URL', () => {
    const profile = {
      id: 'profile123',
      userId: 'user123',
      name: { firstName: 'John', lastName: 'Doe' },
      website: 'not-a-url', // Invalid
      createdAt: new Date(),
    };
    const result = userProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['website']);
      expect(result.error.issues[0].message).toContain('Invalid url');
    }
  });

  it('should accept null or undefined website', () => {
    const profileWithoutWebsite = {
      id: 'profile123',
      userId: 'user123',
      name: { firstName: 'John', lastName: 'Doe' },
      createdAt: new Date(),
    };
    const result = userProfileSchema.safeParse(profileWithoutWebsite);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBeNull();
    }
  });

  it('should fail if createdAt is invalid', () => {
    const profile = {
      id: 'profile123',
      userId: 'user123',
      name: { firstName: 'John', lastName: 'Doe' },
      createdAt: 'invalid-date',
    };
    const result = userProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['createdAt']);
    }
  });
});
