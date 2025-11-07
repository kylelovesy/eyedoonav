import { wrapAsyncOperation, wrapSyncOperation } from '../../src/utils/result-helpers';
import { ok, err } from '../../src/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ErrorMapper } from '@/utils/error-mapper';

const mockError = ErrorMapper.createGenericError(
  ErrorCode.TEST_ERROR,
  'Test Error',
  'A test error occurred',
);
const errorMapper = (error: unknown) => mockError;

describe('Result Helpers', () => {
  describe('wrapAsyncOperation', () => {
    it('should return ok on success', async () => {
      const operation = () => Promise.resolve('success');
      const result = await wrapAsyncOperation(operation, errorMapper);
      expect(result).toEqual(ok('success'));
    });

    it('should return err on failure', async () => {
      const operation = () => Promise.reject(new Error('failure'));
      const result = await wrapAsyncOperation(operation, errorMapper);
      expect(result).toEqual(err(mockError));
    });
  });

  describe('wrapSyncOperation', () => {
    it('should return ok on success', () => {
      const operation = () => 'success';
      const result = wrapSyncOperation(operation, errorMapper);
      expect(result).toEqual(ok('success'));
    });

    it('should return err on failure', () => {
      const operation = () => {
        throw new Error('failure');
      };
      const result = wrapSyncOperation(operation, errorMapper);
      expect(result).toEqual(err(mockError));
    });
  });

  // Note: wrapCloudFunction, wrapFetch, etc., would require mocking
  // the function/fetch calls, but their logic is identical to wrapAsyncOperation.
});
