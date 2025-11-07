import { withRetry, withFallback, withTimeout } from '../../src/utils/error-recovery';
import { ok, err, Result } from '../../src/domain/common/result';
import { AppError } from '../../src/domain/common/errors';
import { ErrorCode } from '../../src/constants/error-code-registry';

// Mock LoggingService
jest.mock('@/services/logging-service', () => ({
  LoggingService: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock AppError as constructor
jest.mock('@/domain/common/errors', () => ({
  AppError: jest.fn((code, message, userMessage, context, metadata, retryable) => ({
    code,
    message,
    userMessage,
    context,
    metadata,
    retryable,
  })),
}));

// Define mock error locally or inside factory
const mockTimeoutError = new Error('Timeout'); // Or require if defined elsewhere

jest.mock('@/utils/error-mapper', () => ({
  ErrorMapper: {
    createGenericError: jest.fn(() => ({
      ...mockTimeoutError,
      code: 'TIMEOUT', // Assume ErrorCode.TIMEOUT
      retryable: true,
      userMessage: 'Request timed out',
    })),
  },
}));

const retryableError = new AppError('E1', 'Retryable', 'Retry', 'ctx', null, true);
const nonRetryableError = new AppError('E2', 'No Retry', 'No Retry', 'ctx', null, false);
const timeoutError = new AppError(
  ErrorCode.NETWORK_TIMEOUT,
  'Timeout',
  'Timeout',
  'ctx',
  null,
  true,
);

describe('ErrorRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should return success on the first attempt', async () => {
      const operation = jest.fn().mockResolvedValue(ok('success'));
      const result = await withRetry(operation, { maxAttempts: 3, delayMs: 10 });
      expect(result).toEqual(ok('success'));
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry a retryable error and succeed', async () => {
      const operation = jest
        .fn()
        .mockResolvedValueOnce(err(retryableError))
        .mockResolvedValueOnce(err(retryableError))
        .mockResolvedValueOnce(ok('success'));

      const result = await withRetry(operation, { maxAttempts: 3, delayMs: 10 });
      expect(result).toEqual(ok('success'));
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockResolvedValue(err(retryableError));
      const result = await withRetry(operation, { maxAttempts: 3, delayMs: 10 });
      expect(result).toEqual(err(retryableError));
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry a non-retryable error', async () => {
      const operation = jest.fn().mockResolvedValue(err(nonRetryableError));
      const result = await withRetry(operation, { maxAttempts: 3, delayMs: 10 });
      expect(result).toEqual(err(nonRetryableError));
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('withFallback', () => {
    it('should return success value if operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue(ok('success'));
      const result = await withFallback(operation, 'fallback');
      expect(result).toEqual(ok('success'));
    });

    it('should return fallback value if operation fails', async () => {
      const operation = jest.fn().mockResolvedValue(err(nonRetryableError));
      const result = await withFallback(operation, 'fallback');
      expect(result).toEqual(ok('fallback'));
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return success if operation completes within timeout', async () => {
      const operation = () =>
        new Promise<Result<string, AppError>>(resolve => {
          setTimeout(() => resolve(ok('success')), 50);
        });
      const promise = withTimeout(operation, 100);
      jest.advanceTimersByTime(60);
      const result = await promise;
      expect(result).toEqual(ok('success'));
    });

    it('should return timeout error if operation exceeds timeout', async () => {
      const operation = () =>
        new Promise<Result<string, AppError>>(resolve => {
          setTimeout(() => resolve(ok('success')), 200);
        });
      const promise = withTimeout(operation, 100);
      jest.advanceTimersByTime(110);
      const result = await promise;
      expect(result).toEqual(err(timeoutError));
    });
  });
});
