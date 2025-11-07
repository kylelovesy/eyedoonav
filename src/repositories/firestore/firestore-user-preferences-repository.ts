/*---------------------------------------
File: src/repositories/firestore/firestore-user-preferences-repository.ts
Description: Firestore implementation for user preferences repository (fetch-only with optional listener)
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
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import { sanitizeString } from '@/utils/sanitization-helpers';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import {
  userPreferencesSchema,
  UserPreferences,
  UserPreferencesCreate,
  UserPreferencesUpdate,
} from '@/domain/user/user.schema';
import { ErrorCode } from '@/constants/error-code-registry';
import { USER_PATHS } from '@/repositories/firestore/paths/firestore-user-paths';
import { IUserPreferencesRepository } from '@/repositories/i-user-preferences-repository';

export class FirestoreUserPreferencesRepository implements IUserPreferencesRepository {
  private readonly context = 'FirestoreUserPreferencesRepository';

  /**
   * Sanitizes preferences creation input
   */
  private sanitizePreferencesCreate(payload: UserPreferencesCreate): UserPreferencesCreate {
    return {
      ...payload,
      timezone: sanitizeString(payload.timezone) || 'UTC',
      dateFormat: sanitizeString(payload.dateFormat) || 'DD/MM/YYYY',
      // Other fields are enums/booleans/numbers, no sanitization needed
    };
  }

  /**
   * Sanitizes preferences update input
   */
  private sanitizePreferencesUpdate(payload: UserPreferencesUpdate): UserPreferencesUpdate {
    const sanitized: UserPreferencesUpdate = { ...payload };

    if (sanitized.timezone !== undefined) {
      sanitized.timezone = sanitizeString(sanitized.timezone) || undefined;
    }

    if (sanitized.dateFormat !== undefined) {
      sanitized.dateFormat = sanitizeString(sanitized.dateFormat) || undefined;
    }

    // Booleans, enums, and numbers don't need sanitization

    return sanitized;
  }

  /**
   * Parses Firestore snapshot to UserPreferences with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<UserPreferences, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'Preferences not found',
          'Preferences not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps({ id: snapshot.id, ...rawData });

    // Validate with schema
    const validationResult = validateWithSchema(userPreferencesSchema, data, contextString);

    if (!validationResult.success) {
      return err(validationResult.error);
    }

    return ok(validationResult.value as UserPreferences);
  }

  async get(userId: string, preferencesId: string): Promise<Result<UserPreferences, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.PREFERENCES_DOC(userId, preferencesId));
      const snapshot = await getDoc(ref);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getByUserId(userId: string): Promise<Result<UserPreferences, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getByUserId', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const colRef = collection(firestore, USER_PATHS.PREFERENCES(userId));
      const q = query(colRef, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Preferences not found',
            'Preferences not found',
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

  async create(
    userId: string,
    payload: UserPreferencesCreate,
  ): Promise<Result<UserPreferences, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizePreferencesCreate(payload);

      const colRef = collection(firestore, USER_PATHS.PREFERENCES(userId));
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
    preferencesId: string,
    updates: UserPreferencesUpdate,
  ): Promise<Result<UserPreferences, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizePreferencesUpdate(updates);
      const ref = doc(firestore, USER_PATHS.PREFERENCES_DOC(userId, preferencesId));

      await updateDoc(ref, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });

      return await this.get(userId, preferencesId);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * ⚙️ OPTIONAL: Light listener for instant UI reflection
   * Use only if you need real-time updates (e.g., darkMode toggle)
   */
  subscribeToPreferences(
    userId: string,
    preferencesId: string,
    onData: (result: Result<UserPreferences, AppError>) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'subscribeToPreferences',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);
    const ref = doc(firestore, USER_PATHS.PREFERENCES_DOC(userId, preferencesId));

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
}
