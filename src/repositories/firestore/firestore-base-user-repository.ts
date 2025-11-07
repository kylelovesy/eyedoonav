/*---------------------------------------
File: src/repositories/firestore/firestore-base-user-repository.ts
Description: Firestore implementation for base user repository
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot, // ✅ FIX: Import DocumentSnapshot directly
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  removeUndefinedValues,
} from '@/utils/sanitization-helpers';
import {
  baseUserSchema,
  BaseUser,
  BaseUserCreate,
  BaseUserUpdate,
  UserBanInput,
  UserRoleUpdate,
} from '@/domain/user/user.schema';
import { ErrorCode } from '@/constants/error-code-registry';
import { USER_PATHS } from '@/repositories/firestore/paths/firestore-user-paths';
import { IBaseUserRepository } from '@/repositories/i-base-user-repository';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import { z } from 'zod';
import { LoggingService } from '@/services/logging-service';

export class FirestoreBaseUserRepository implements IBaseUserRepository {
  private readonly context = 'FirestoreBaseUserRepository';

  /**
   * Sanitizes base user creation input
   */
  private sanitizeBaseUserCreate(payload: BaseUserCreate): BaseUserCreate {
    const sanitizedEmail = sanitizeEmail(payload.email);
    if (!sanitizedEmail) {
      // This should be caught by validation, but defensive check
      throw new Error('Invalid email provided to repository');
    }

    return {
      ...payload,
      email: sanitizedEmail, // ✅ FIX: Removed unsafe ! assertion
      displayName: payload.displayName ? sanitizeString(payload.displayName) : '',
      phone: payload.phone ? sanitizePhone(payload.phone) || null : null,
    };
  }

  /**
   * Sanitizes base user update input
   */
  private sanitizeBaseUserUpdate(payload: BaseUserUpdate): BaseUserUpdate {
    const sanitized: BaseUserUpdate = { ...payload };

    if (sanitized.email !== undefined) {
      const sanitizedEmail = sanitizeEmail(sanitized.email);
      sanitized.email = sanitizedEmail || '';
    }

    if (sanitized.displayName !== undefined) {
      sanitized.displayName = sanitizeString(sanitized.displayName);
    }

    if (sanitized.phone !== undefined && sanitized.phone !== null) {
      sanitized.phone = sanitizePhone(sanitized.phone) || null;
    }

    return sanitized;
  }

  /**
   * Parses Firestore snapshot to BaseUser with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot, // ✅ FIX: Use imported DocumentSnapshot type
    contextString: string,
  ): Result<BaseUser, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'User not found',
          'User not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps({ id: snapshot.id, ...rawData });

    // Validate with schema (Zod will handle any remaining conversion via preprocessors)
    try {
      const validationResult = validateWithSchema(baseUserSchema, data, contextString);

      if (!validationResult.success) {
        return err(validationResult.error);
      }

      return ok(validationResult.value as BaseUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        LoggingService.error('Failed to parse user data from database', {
          component: this.context,
          method: 'parseSnapshot',
          // issues: error.issues,
        });
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_VALIDATION_ERROR,
            'Failed to parse user data from database',
            'Data integrity issue detected. Please contact support.',
            contextString,
            error.issues,
          ),
        );
      }
      // Re-throw other errors to be caught by outer catch
      throw error;
    }
  }

  async getById(userId: string): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getById', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.BASE(userId));
      const snapshot = await getDoc(ref);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async create(userId: string, payload: BaseUserCreate): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeBaseUserCreate(payload);

      const ref = doc(firestore, USER_PATHS.BASE(userId));

      await setDoc(ref, {
        ...sanitized,
        id: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Fetch and return (with defensive parsing)
      return await this.getById(userId);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async update(userId: string, updates: BaseUserUpdate): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeBaseUserUpdate(updates);
      const ref = doc(firestore, USER_PATHS.BASE(userId));

      // 2. Remove undefined values before updateDoc (Firestore doesn't accept undefined)
      const sanitizedData = removeUndefinedValues(sanitized);

      await updateDoc(ref, {
        ...sanitizedData,
        updatedAt: serverTimestamp(),
      });

      return await this.getById(userId);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  subscribeToUser(
    userId: string,
    onData: (result: Result<BaseUser, AppError>) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(this.context, 'subscribeToUser', userId);
    const contextString = ErrorContextBuilder.toString(context);
    const ref = doc(firestore, USER_PATHS.BASE(userId));

    const unsubscribe = onSnapshot(
      ref,
      snapshot => {
        const result = this.parseSnapshot(snapshot, contextString);
        onData(result);
      },
      error => {
        onData(err(ErrorMapper.fromFirestore(error, contextString)));
      },
    );

    return unsubscribe;
  }

  async updateLastLogin(userId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'updateLastLogin', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.BASE(userId));
      await updateDoc(ref, {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async updateEmailVerification(
    userId: string,
    isVerified: boolean,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'updateEmailVerification',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.BASE(userId));
      await updateDoc(ref, {
        isEmailVerified: isVerified,
        updatedAt: serverTimestamp(),
      });
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  // --- Admin Operations ---

  async banUser(userId: string, payload: UserBanInput): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'banUser', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // ✅ FIX: Sanitize reason field
      const sanitizedReason = sanitizeString(payload.reason);
      if (!sanitizedReason) {
        // This should be caught by validation, but defensive check
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            'Ban reason is required',
            'Ban reason cannot be empty',
            contextString,
          ),
        );
      }

      const ref = doc(firestore, USER_PATHS.BASE(userId));
      await updateDoc(ref, {
        isBanned: true,
        updatedAt: serverTimestamp(),
      });
      // Note: bannedAt and bannedReason should be in profile subcollection
      // Keeping minimal update here per base user schema
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async unbanUser(userId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'unbanUser', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.BASE(userId));
      await updateDoc(ref, {
        isBanned: false,
        updatedAt: serverTimestamp(),
      });
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async updateRole(userId: string, payload: UserRoleUpdate): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'updateRole', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.BASE(userId));
      await updateDoc(ref, {
        role: payload.role,
        updatedAt: serverTimestamp(),
      });
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async delete(userId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.BASE(userId));
      await updateDoc(ref, {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async permanentlyDelete(userId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'permanentlyDelete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.BASE(userId));
      await deleteDoc(ref);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }
}
