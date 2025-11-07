/*---------------------------------------
File: src/repositories/firestore/firestore-user-subscription-repository.ts
Description: Firestore implementation for user subscription repository (with real-time listener)
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
  userSubscriptionSchema,
  UserSubscription,
  UserSubscriptionCreate,
  UserSubscriptionUpdate,
} from '@/domain/user/user.schema';
import { ErrorCode } from '@/constants/error-code-registry';
import { USER_PATHS } from '@/repositories/firestore/paths/firestore-user-paths';
import { IUserSubscriptionRepository } from '@/repositories/i-user-subscription-repository';

export class FirestoreUserSubscriptionRepository implements IUserSubscriptionRepository {
  private readonly context = 'FirestoreUserSubscriptionRepository';

  /**
   * Sanitizes subscription creation input
   */
  private sanitizeSubscriptionCreate(payload: UserSubscriptionCreate): UserSubscriptionCreate {
    // Note: transactionId and receipt are server-managed and not part of UserSubscriptionCreate
    // Other fields are enums/booleans/timestamps, no sanitization needed
    return payload;
  }

  /**
   * Sanitizes subscription update input
   */
  private sanitizeSubscriptionUpdate(payload: UserSubscriptionUpdate): UserSubscriptionUpdate {
    // Note: transactionId and receipt are server-managed and not part of UserSubscriptionUpdate
    // Booleans, enums, and timestamps don't need sanitization
    return payload;
  }

  /**
   * Parses Firestore snapshot to UserSubscription with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<UserSubscription, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'Subscription not found',
          'Subscription not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps({ id: snapshot.id, ...rawData });

    // Validate with schema
    const validationResult = validateWithSchema(userSubscriptionSchema, data, contextString);

    if (!validationResult.success) {
      return err(validationResult.error);
    }

    return ok(validationResult.value as UserSubscription);
  }

  async get(userId: string, subscriptionId: string): Promise<Result<UserSubscription, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.SUBSCRIPTION_DOC(userId, subscriptionId));
      const snapshot = await getDoc(ref);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getByUserId(userId: string): Promise<Result<UserSubscription, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getByUserId', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const colRef = collection(firestore, USER_PATHS.SUBSCRIPTION(userId));
      const q = query(colRef, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Subscription not found',
            'Subscription not found',
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
    payload: UserSubscriptionCreate,
  ): Promise<Result<UserSubscription, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeSubscriptionCreate(payload);

      const colRef = collection(firestore, USER_PATHS.SUBSCRIPTION(userId));
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
    subscriptionId: string,
    updates: UserSubscriptionUpdate,
  ): Promise<Result<UserSubscription, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeSubscriptionUpdate(updates);
      const ref = doc(firestore, USER_PATHS.SUBSCRIPTION_DOC(userId, subscriptionId));

      await updateDoc(ref, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });

      return await this.get(userId, subscriptionId);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async delete(userId: string, subscriptionId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.SUBSCRIPTION_DOC(userId, subscriptionId));
      await deleteDoc(ref);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * ✅ RECOMMENDED: Light listener for subscription changes
   * Needed for plan gating, feature unlocks, and renewal/cancel state
   */
  subscribeToSubscription(
    userId: string,
    subscriptionId: string,
    onData: (result: Result<UserSubscription, AppError>) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'subscribeToSubscription',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);
    const ref = doc(firestore, USER_PATHS.SUBSCRIPTION_DOC(userId, subscriptionId));

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
