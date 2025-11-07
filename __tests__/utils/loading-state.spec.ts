import {
  idle,
  loading,
  loadingWithProgress,
  success,
  error,
  isIdle,
  isLoading,
  isSuccess,
  hasError,
  hasData,
  isOptimistic,
  isInitialLoading,
  getData,
  getError,
} from '../../src/utils/loading-state';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ErrorMapper } from '@/utils/error-mapper';

const mockError = ErrorMapper.createGenericError(
  ErrorCode.TEST_ERROR,
  'Test Error',
  'An error occurred',
);
const mockData = { id: 1, name: 'Test' };

describe('Loading State', () => {
  describe('State Creators', () => {
    it('should create an idle state', () => {
      expect(idle()).toEqual({ status: 'idle' });
    });

    it('should create a loading state', () => {
      expect(loading()).toEqual({ status: 'loading', data: undefined, isOptimistic: false });
      expect(loading(mockData, true)).toEqual({
        status: 'loading',
        data: mockData,
        isOptimistic: true,
      });
    });

    it('should create a loading state with progress', () => {
      const state = loadingWithProgress(mockData, false, 'Uploading', 50);
      expect(state).toEqual({
        status: 'loading',
        data: mockData,
        isOptimistic: false,
        stage: 'Uploading',
        progress: 50,
      });
    });

    it('should create a success state', () => {
      expect(success(mockData)).toEqual({ status: 'success', data: mockData });
    });

    it('should create an error state', () => {
      expect(error(mockError, mockData, true)).toEqual({
        status: 'error',
        error: mockError,
        data: mockData,
        isOptimistic: true,
      });
    });
  });

  describe('Type Guards', () => {
    it('isIdle should return true for idle state', () => {
      expect(isIdle(idle())).toBe(true);
      expect(isIdle(loading())).toBe(false);
    });

    it('isLoading should return true for loading state', () => {
      expect(isLoading(loading())).toBe(true);
      expect(isLoading(idle())).toBe(false);
    });

    it('isSuccess should return true for success state', () => {
      expect(isSuccess(success(mockData))).toBe(true);
      expect(isSuccess(idle())).toBe(false);
    });

    it('hasError should return true for error state', () => {
      expect(hasError(error(mockError))).toBe(true);
      expect(hasError(idle())).toBe(false);
    });

    it('hasData should return true for states with data', () => {
      expect(hasData(success(mockData))).toBe(true);
      expect(hasData(loading(mockData))).toBe(true);
      expect(hasData(error(mockError, mockData))).toBe(true);
      expect(hasData(idle())).toBe(false);
      expect(hasData(loading())).toBe(false);
    });

    it('isOptimistic should return true for optimistic states', () => {
      expect(isOptimistic(loading(mockData, true))).toBe(true);
      expect(isOptimistic(error(mockError, mockData, true))).toBe(true);
      expect(isOptimistic(loading(mockData, false))).toBe(false);
    });

    it('isInitialLoading should return true only for non-optimistic loading', () => {
      expect(isInitialLoading(loading(undefined, false))).toBe(true);
      expect(isInitialLoading(loading(mockData, true))).toBe(false);
      expect(isInitialLoading(idle())).toBe(false);
    });
  });

  describe('Data Extractors', () => {
    it('getData should extract data', () => {
      expect(getData(success(mockData))).toEqual(mockData);
      expect(getData(loading(mockData))).toEqual(mockData);
      expect(getData(idle())).toBeUndefined();
    });

    it('getError should extract error', () => {
      expect(getError(error(mockError))).toEqual(mockError);
      expect(getError(success(mockData))).toBeUndefined();
    });
  });
});
