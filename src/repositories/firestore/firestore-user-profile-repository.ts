/*---------------------------------------
File: src/repositories/firestore/firestore-user-profile-repository.ts
Description: Firestore implementation for user profile repository (fetch-only)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  limit,
  serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import {
  sanitizeString,
  sanitizePersonInfo,
  sanitizeUrl,
  removeUndefinedValues,
} from '@/utils/sanitization-helpers';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import {
  userProfileSchema,
  UserProfile,
  UserProfileCreate,
  UserProfileUpdate,
} from '@/domain/user/user.schema';
import { ErrorCode } from '@/constants/error-code-registry';
import { USER_PATHS } from '@/repositories/firestore/paths/firestore-user-paths';
import { IUserProfileRepository } from '@/repositories/i-user-profile-repository';

export class FirestoreUserProfileRepository implements IUserProfileRepository {
  private readonly context = 'FirestoreUserProfileRepository';

  /**
   * Sanitizes profile creation input
   */
  private sanitizeProfileCreate(payload: UserProfileCreate): UserProfileCreate {
    return {
      ...payload,
      name: sanitizePersonInfo(payload.name),
      bio: payload.bio ? sanitizeString(payload.bio) || null : null,
      website: payload.website ? sanitizeUrl(payload.website) || null : null,
      businessName: payload.businessName ? sanitizeString(payload.businessName) || '' : '',
    };
  }

  /**
   * Sanitizes profile update input
   */
  private sanitizeProfileUpdate(payload: UserProfileUpdate): UserProfileUpdate {
    const sanitized: UserProfileUpdate = { ...payload };

    if (sanitized.name !== undefined) {
      sanitized.name = sanitizePersonInfo(sanitized.name);
    }

    if (sanitized.bio !== undefined) {
      sanitized.bio = sanitizeString(sanitized.bio);
    }

    if (sanitized.website !== undefined) {
      sanitized.website = sanitizeUrl(sanitized.website) || undefined;
    }

    if (sanitized.businessName !== undefined) {
      sanitized.businessName = sanitizeString(sanitized.businessName);
    }

    return sanitized;
  }

  /**
   * Parses Firestore snapshot to UserProfile with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<UserProfile, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'Profile not found',
          'Profile not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps({ id: snapshot.id, ...rawData });

    // Validate with schema
    const validationResult = validateWithSchema(userProfileSchema, data, contextString);

    if (!validationResult.success) {
      return err(validationResult.error);
    }

    return ok(validationResult.value as UserProfile);
  }

  async get(userId: string, profileId: string): Promise<Result<UserProfile, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.PROFILE_DOC(userId, profileId));
      const snapshot = await getDoc(ref);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getByUserId(userId: string): Promise<Result<UserProfile, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getByUserId', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const colRef = collection(firestore, USER_PATHS.PROFILE(userId));
      const q = query(colRef, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Profile not found',
            'Profile not found',
            contextString,
          ),
        );
      }

      const docSnapshot = snapshot.docs[0];
      return this.parseSnapshot(docSnapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async create(userId: string, payload: UserProfileCreate): Promise<Result<UserProfile, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeProfileCreate(payload);

      const colRef = collection(firestore, USER_PATHS.PROFILE(userId));
      const docRef = await addDoc(colRef, {
        ...sanitized,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return await this.get(userId, docRef.id);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async update(
    userId: string,
    profileId: string,
    updates: UserProfileUpdate,
  ): Promise<Result<UserProfile, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeProfileUpdate(updates);
      const ref = doc(firestore, USER_PATHS.PROFILE_DOC(userId, profileId));

      // 2. Remove undefined values before updateDoc (Firestore doesn't accept undefined)
      const sanitizedData = removeUndefinedValues(sanitized);

      await updateDoc(ref, {
        ...sanitizedData,
        updatedAt: serverTimestamp(),
      });

      return await this.get(userId, profileId);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async delete(userId: string, profileId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.PROFILE_DOC(userId, profileId));
      await deleteDoc(ref);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }
}
