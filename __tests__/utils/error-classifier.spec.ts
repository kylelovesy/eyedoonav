import { ErrorClassifier } from '../../src/utils/error-classifier';
import { ErrorCode } from '../../src/constants/error-code-registry';

describe('error-classifier', () => {
  describe('classify', () => {
    it('should classify AppError based on error code', () => {
      const mockAppError = {
        code: ErrorCode.AUTH_USER_NOT_FOUND, // Use actual enum value
        userMessage: 'Permission denied',
        message: 'Permission denied',
        retryable: false,
        timestamp: new Date(),
        context: 'test',
      };

      const category = ErrorClassifier.classify(mockAppError);
      expect(category.severity).toBe('non-critical');
      expect(category.canRecover).toBe(false);
      expect(category.shouldShowFullScreen).toBe(false);
      expect(category.requiresUserAction).toBe(false);
    });

    it('should classify critical errors', () => {
      const mockCriticalError = {
        code: ErrorCode.AUTH_SESSION_EXPIRED, // Use actual enum value 'AUTH_006'
        userMessage: 'Session expired',
        message: 'Session expired',
        retryable: false,
        timestamp: new Date(),
        context: 'test',
      };

      const category = ErrorClassifier.classify(mockCriticalError);
      expect(category.severity).toBe('critical');
      expect(category.canRecover).toBe(false);
      expect(category.shouldShowFullScreen).toBe(true);
      expect(category.requiresUserAction).toBe(true);
    });

    it('should classify generic errors', () => {
      const genericError = new Error('Network timeout occurred');

      const category = ErrorClassifier.classify(genericError);
      expect(category.severity).toBe('recoverable');
      expect(category.canRecover).toBe(true);
      expect(category.shouldShowFullScreen).toBe(false);
      expect(category.requiresUserAction).toBe(false);
    });
  });

  describe('shouldShowFullScreen', () => {
    it('should return true for critical errors', () => {
      const mockCriticalError = {
        code: ErrorCode.AUTH_SESSION_EXPIRED, // Use actual enum value
        userMessage: 'Session expired',
        message: 'Session expired',
        retryable: false,
        timestamp: new Date(),
        context: 'test',
      };

      expect(ErrorClassifier.shouldShowFullScreen(mockCriticalError)).toBe(true);
    });
  });

  describe('canRecover', () => {
    it('should return true for recoverable errors', () => {
      const mockRecoverableError = {
        code: ErrorCode.DB_NETWORK_ERROR, // Use actual enum value
        userMessage: 'Network error',
        message: 'Network error',
        retryable: true,
        timestamp: new Date(),
        context: 'test',
      };

      expect(ErrorClassifier.canRecover(mockRecoverableError)).toBe(true);
    });
  });
});
