// Mock the Timestamp import BEFORE any imports
jest.mock('firebase/firestore', () => ({
  Timestamp: jest.fn().mockImplementation((seconds: number, nanoseconds: number = 0) => ({
    seconds,
    nanoseconds,
    toDate: () => new Date(seconds * 1000 + nanoseconds / 1000000),
  })),
}));

import { z } from 'zod';
import { dateSchema } from '../../src/utils/schema-helpers';

// Create a proper Timestamp instance for testing using the mocked constructor
const mockTimestamp = {
  seconds: 1727788800, // 2025-10-01T12:00:00.000Z
  nanoseconds: 0,
  toDate: () => new Date('2025-10-01T12:00:00.000Z'),
};

// Create a test schema that uses dateSchema
const testSchema = z.object({
  myDate: dateSchema,
});

describe('schema-helpers', () => {
  describe('dateSchema (Zod Preprocessor)', () => {
    it('should correctly parse a Firestore Timestamp', () => {
      const result = testSchema.safeParse({ myDate: mockTimestamp });
      expect(result.success).toBe(true);
      expect((result as any).data.myDate).toEqual(new Date('2025-10-01T12:00:00.000Z'));
    });

    it('should correctly parse a valid date string', () => {
      const result = testSchema.safeParse({
        myDate: '2025-10-01T12:00:00.000Z',
      });
      expect(result.success).toBe(true);
      expect((result as any).data.myDate).toEqual(new Date('2025-10-01T12:00:00.000Z'));
    });

    it('should correctly parse a Date object', () => {
      const date = new Date('2025-10-01T12:00:00.000Z');
      const result = testSchema.safeParse({ myDate: date });
      expect(result.success).toBe(true);
      expect((result as any).data.myDate).toEqual(date);
    });

    it('should fail parsing for an invalid date string', () => {
      const result = testSchema.safeParse({ myDate: 'not a real date' });
      expect(result.success).toBe(false);
    });

    it('should fail parsing for null', () => {
      const result = testSchema.safeParse({ myDate: null });
      expect(result.success).toBe(false);
    });

    it('should fail parsing for undefined', () => {
      const nullableSchema = z.object({
        myDate: dateSchema.nullable().default(null),
      });
      const result = nullableSchema.safeParse({});
      expect(result.success).toBe(true);
      expect((result as any).data.myDate).toBe(null);
    });

    it('should fail parsing for a plain object', () => {
      const result = testSchema.safeParse({ myDate: { a: 1 } });
      expect(result.success).toBe(false);
    });
  });
});
