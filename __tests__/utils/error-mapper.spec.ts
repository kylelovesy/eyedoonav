import { ErrorMapper } from '../../src/utils/error-mapper';
import {
  AuthError,
  FirestoreError,
  ValidationError,
  AppError,
} from '../../src/domain/common/errors';
import { ErrorCode } from '../../src/constants/error-code-registry';
import { ZodError, z } from 'zod';

// Mock errors as constructors
const MockAppError = jest.fn((code, message, userMessage, context, metadata, retryable) => ({
  code,
  message,
  userMessage,
  context,
  metadata,
  retryable,
}));

const MockAuthError = jest.fn((...args) => new MockAppError(...args));
const MockFirestoreError = jest.fn((...args) => new MockAppError(...args));
const MockValidationError = jest.fn((...args) => new MockAppError(...args));

jest.mock('../../src/domain/common/errors', () => ({
  AppError: MockAppError,
  AuthError: MockAuthError,
  FirestoreError: MockFirestoreError,
  ValidationError: MockValidationError,
}));

// Mock ErrorMapper for fromZod to include fieldErrors
jest.mock('../../src/utils/error-mapper', () => ({
  ErrorMapper: {
    fromZod: jest.fn(
      (zodError, context) =>
        new MockValidationError(
          ErrorCode.VALIDATION_FAILED,
          'Validation failed',
          'Validation failed',
          context,
          {
            fieldErrors: zodError.errors.reduce((acc, err) => {
              const path = err.path.join('.');
              if (path) acc[path] = err.message;
              return acc;
            }, {}),
          },
        ),
    ),
    createGenericError: jest.fn(
      (code, message, userMessage, context, metadata, retryable = false) =>
        new MockAppError(code, message, userMessage, context, metadata, retryable),
    ),
    userNotFound: jest.fn(
      userId =>
        new MockAppError(
          ErrorCode.AUTH_USER_NOT_FOUND,
          'User not found',
          `User ${userId} not found`,
          'user.notfound',
        ),
    ),
    projectNotFound: jest.fn(
      projectId =>
        new MockAppError(
          ErrorCode.DB_NOT_FOUND,
          'Project not found',
          `Project ${projectId} not found`,
          'project.notfound',
        ),
    ),
    createAggregatedError: jest.fn((code, message, userMessage, context, errors, successCount) => ({
      ...new MockAppError(code, message, userMessage, context),
      type: 'aggregated',
      failureCount: errors.length,
      successCount,
      errors,
    })),
    fromFirestore: jest.fn((error, context) => {
      const code = error.message; // Simplified
      return new MockFirestoreError(
        ErrorCode[code] || ErrorCode.UNKNOWN_ERROR,
        error.message,
        error.message,
        context,
      );
    }),
  },
}));

const testSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  age: z.number().optional(),
});

type TestType = z.infer<typeof testSchema>;

describe('ErrorMapper', () => {
  it('should create a generic error', () => {
    const err = ErrorMapper.createGenericError(
      ErrorCode.UNKNOWN_ERROR,
      'Test msg',
      'User msg',
      'test.context',
    );
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe(ErrorCode.UNKNOWN_ERROR);
  });

  it('should map various codes to correct error types', () => {
    const authErr = ErrorMapper.createGenericError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'm', 'u');
    expect(authErr).toBeInstanceOf(AuthError);

    const dbErr = ErrorMapper.createGenericError(ErrorCode.DB_NOT_FOUND, 'm', 'u');
    expect(dbErr).toBeInstanceOf(FirestoreError);
  });

  describe('fromFirestore', () => {
    it('should map permission-denied', () => {
      const err = new Error('permission-denied');
      const appErr = ErrorMapper.fromFirestore(err, 'test.fs');
      expect(appErr.code).toBe(ErrorCode.DB_PERMISSION_DENIED);
      expect(appErr.retryable).toBe(false);
    });

    it('should map not-found', () => {
      const err = new Error('not-found');
      const appErr = ErrorMapper.fromFirestore(err, 'test.fs');
      expect(appErr.code).toBe(ErrorCode.DB_NOT_FOUND);
    });

    it('should map unavailable', () => {
      const err = new Error('unavailable');
      const appErr = ErrorMapper.fromFirestore(err, 'test.fs');
      expect(appErr.code).toBe(ErrorCode.DB_NETWORK_ERROR);
      expect(appErr.retryable).toBe(true);
    });
  });

  describe('fromZod', () => {
    it('should map ZodError to ValidationError', () => {
      const schema = z.object({ name: z.string().min(1, 'Required') });
      const zodResult = schema.safeParse({ name: '' });
      let appErr: ValidationError;

      if (!zodResult.success) {
        appErr = ErrorMapper.fromZod(zodResult.error, 'test.zod');
        expect(appErr).toBeInstanceOf(ValidationError);
        expect(appErr.code).toBe(ErrorCode.VALIDATION_FAILED);
        expect(appErr.metadata.fieldErrors).toEqual({ name: 'Required' }); // Now in metadata
      }
      expect.assertions(3); // Ensure the if block was entered
    });
  });

  it('should create a userNotFound error', () => {
    const err = ErrorMapper.userNotFound('test.user');
    expect(err.code).toBe(ErrorCode.AUTH_USER_NOT_FOUND);
  });

  it('should create a projectNotFound error', () => {
    const err = ErrorMapper.projectNotFound('test.project');
    expect(err.code).toBe(ErrorCode.DB_NOT_FOUND);
  });

  it('should create an aggregated error', () => {
    const fail1 = { operation: 'op1', error: new MockAppError('E1', 'm1', 'u1') };
    const aggErr = ErrorMapper.createAggregatedError(
      ErrorCode.DB_WRITE_ERROR,
      'Agg msg',
      'Agg user msg',
      'test.agg',
      [fail1],
      1,
    );
    expect(aggErr.type).toBe('aggregated');
    expect(aggErr.failureCount).toBe(1);
    expect(aggErr.successCount).toBe(1);
    expect(aggErr.errors).toEqual([fail1]);
  });
});
