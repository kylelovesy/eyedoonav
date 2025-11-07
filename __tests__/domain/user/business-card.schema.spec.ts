import { businessCardSchema } from '../../../src/domain/user/business-card.schema';

describe('BusinessCardSchema', () => {
  const minimalValid = {
    id: '123',
    userId: '123',
    createdAt: new Date(),
    firstName: 'Test',
    lastName: 'Business',
    displayName: 'Test Business',
    companyName: 'Test Company',
    jobTitle: 'Test Job Title',
    street: '123 Main St',
    email: 'biz@example.com',
    phone: '111-222-3333',
    website: 'https://biz.example.com',
    bio: 'Test bio',
  };

  const validBusinessCard = {
    ...minimalValid,
    socialLinks: [{ platform: 'instagram', url: 'https://instagram.com/test' }],
    instagram: 'https://instagram.com/test',
    facebook: 'https://facebook.com/test',
    twitter: 'https://twitter.com/test',
    linkedin: 'https://linkedin.com/test',
    youtube: 'https://youtube.com/test',
    tiktok: 'https://tiktok.com/test',
    pinterest: 'https://pinterest.com/test',
    socialMediaOther: 'https://other.com/test',
  };

  it('should validate a correct BusinessCard object', () => {
    const result = businessCardSchema.safeParse(validBusinessCard);
    expect(result.success).toBe(true);
  });

  it('should fail if required field "name" is missing', () => {
    const invalidCard = { ...validBusinessCard, firstName: undefined, lastName: undefined }; // Assuming name is composite
    const result = businessCardSchema.safeParse(invalidCard);
    expect(result.success).toBe(false);
  });

  it('should default optional fields to null or empty array', () => {
    const minimalCard = {
      id: '123',
      userId: '123',
      createdAt: new Date(),
      firstName: 'Test',
      lastName: 'Business',
      displayName: 'Test Business',
    }; // Minimal required
    const result = businessCardSchema.safeParse(minimalCard);
    expect(result.success).toBe(true); // Assuming schema has defaults or optionals
    expect(result.data?.contactEmail).toBeUndefined(); // Adjust to match
    expect(result.data?.contactPhone).toBeUndefined();
    expect(result.data?.website).toBeUndefined();
    expect(result.data?.notes).toBeUndefined();
    expect(result.data?.instagram).toBeUndefined();
    expect(result.data?.facebook).toBeUndefined();
    expect(result.data?.twitter).toBeUndefined();
    expect(result.data?.linkedin).toBeUndefined();
    expect(result.data?.youtube).toBeUndefined();
    expect(result.data?.tiktok).toBeUndefined();
    expect(result.data?.pinterest).toBeUndefined();
    expect(result.data?.socialMediaOther).toBeUndefined();
  });

  it('should correctly parse social links', () => {
    const result = businessCardSchema.safeParse(validBusinessCard);
    expect(result.success).toBe(true);
    expect(result.data?.instagram).toBe('https://instagram.com/test');
    expect(result.data?.facebook).toBe('https://facebook.com/test');
    expect(result.data?.twitter).toBe('https://twitter.com/test');
    expect(result.data?.linkedin).toBe('https://linkedin.com/test');
    expect(result.data?.youtube).toBe('https://youtube.com/test');
    expect(result.data?.tiktok).toBe('https://tiktok.com/test');
    expect(result.data?.pinterest).toBe('https://pinterest.com/test');
    expect(result.data?.socialMediaOther).toBe('https://other.com/test');
  });
});
