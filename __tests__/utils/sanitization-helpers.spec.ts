import { removeUndefinedValues } from '../../src/utils/sanitization-helpers';

describe('sanitization-helpers', () => {
  describe('removeUndefinedValues', () => {
    it('should remove top-level undefined values', () => {
      const obj = { a: 1, b: 'hello', c: undefined };
      const result = removeUndefinedValues(obj);
      expect(result).toEqual({ a: 1, b: 'hello' });
      expect(result).not.toHaveProperty('c');
    });

    it('should keep null, 0, false, and empty strings', () => {
      const obj = {
        a: null,
        b: 0,
        c: false,
        d: '',
      };
      const result = removeUndefinedValues(obj);
      expect(result).toEqual(obj);
    });

    it('should not mutate the original object', () => {
      const obj = { a: 1, b: undefined };
      removeUndefinedValues(obj);
      expect(obj).toEqual({ a: 1, b: undefined });
    });

    it('should handle nested objects (but only removes top-level undefined)', () => {
      // Note: This helper is shallow, as intended for Firestore updates.
      const obj = { a: { b: undefined }, c: undefined };
      const result = removeUndefinedValues(obj);
      expect(result).toEqual({ a: { b: undefined } });
      expect(result).not.toHaveProperty('c');
    });

    it('should return an empty object if all values are undefined', () => {
      const obj = { a: undefined, b: undefined };
      const result = removeUndefinedValues(obj);
      expect(result).toEqual({});
    });
  });
});
