import { generateId } from '../../src/utils/id-generator';

describe('ID Generator', () => {
  describe('generateId', () => {
    it('should generate a string', () => {
      expect(typeof generateId()).toBe('string');
    });

    it('should generate different IDs on subsequent calls', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should use crypto.randomUUID', () => {
      const mockRandomUUID = jest.fn(() => 'mock-uuid');
      const originalCrypto = globalThis.crypto;

      // Mock globalThis.crypto
      Object.defineProperty(globalThis, 'crypto', {
        value: { randomUUID: mockRandomUUID },
        writable: true,
      });

      const id = generateId();
      expect(id).toBe('mock-uuid');
      expect(mockRandomUUID).toHaveBeenCalledTimes(1);

      // Restore original
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
      });
    });
  });
});
