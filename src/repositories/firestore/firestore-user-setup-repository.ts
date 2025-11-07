/*---------------------------------------
File: src/repositories/firestore/firestore-user-setup-repository.ts
Description: Firestore implementation for user setup repository (fetch-only with optional temporary listener)
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
import { convertAllTimestamps } from '@/utils/date-time-utils';
import {
  userSetupSchema,
  UserSetup,
  UserSetupCreate,
  UserSetupUpdate,
} from '@/domain/user/user.schema';
import { ErrorCode } from '@/constants/error-code-registry';
import { USER_PATHS } from '@/repositories/firestore/paths/firestore-user-paths';
import { IUserSetupRepository } from '@/repositories/i-user-setup-repository';

export class FirestoreUserSetupRepository implements IUserSetupRepository {
  private readonly context = 'FirestoreUserSetupRepository';

  /**
   * Sanitizes setup creation input
   * Note: All fields are booleans or timestamps, no string sanitization needed
   */
  private sanitizeSetupCreate(payload: UserSetupCreate): UserSetupCreate {
    // All fields are booleans or timestamps, no sanitization needed
    return payload;
  }

  /**
   * Sanitizes setup update input
   */
  private sanitizeSetupUpdate(payload: UserSetupUpdate): UserSetupUpdate {
    // All fields are booleans or timestamps, no sanitization needed
    return payload;
  }

  /**
   * Parses Firestore snapshot to UserSetup with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<UserSetup, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'Setup not found',
          'Setup not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps({ id: snapshot.id, ...rawData });

    // Validate with schema
    const validationResult = validateWithSchema(userSetupSchema, data, contextString);

    if (!validationResult.success) {
      return err(validationResult.error);
    }

    return ok(validationResult.value as UserSetup);
  }

  async get(userId: string, setupId: string): Promise<Result<UserSetup, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.SETUP_DOC(userId, setupId));
      const snapshot = await getDoc(ref);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getByUserId(userId: string): Promise<Result<UserSetup, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getByUserId', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const colRef = collection(firestore, USER_PATHS.SETUP(userId));
      const q = query(colRef, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Setup not found',
            'Setup not found',
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

  async create(userId: string, payload: UserSetupCreate): Promise<Result<UserSetup, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeSetupCreate(payload);

      const colRef = collection(firestore, USER_PATHS.SETUP(userId));
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
    setupId: string,
    updates: UserSetupUpdate,
  ): Promise<Result<UserSetup, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeSetupUpdate(updates);
      const ref = doc(firestore, USER_PATHS.SETUP_DOC(userId, setupId));

      await updateDoc(ref, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });

      return await this.get(userId, setupId);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async delete(userId: string, setupId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.SETUP_DOC(userId, setupId));
      await deleteDoc(ref);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * ⚙️ OPTIONAL: Temporary listener for setup changes
   * Use only during onboarding or setup flow; remove afterward
   */
  subscribeToSetup(
    userId: string,
    setupId: string,
    onData: (result: Result<UserSetup, AppError>) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(this.context, 'subscribeToSetup', userId);
    const contextString = ErrorContextBuilder.toString(context);
    const ref = doc(firestore, USER_PATHS.SETUP_DOC(userId, setupId));

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
