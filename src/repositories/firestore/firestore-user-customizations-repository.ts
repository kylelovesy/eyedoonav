/*---------------------------------------
File: src/repositories/firestore/firestore-user-customizations-repository.ts
Description: Firestore implementation for user customizations repository (fetch-only)
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
import { sanitizeString } from '@/utils/sanitization-helpers';
import { sanitizeUrl } from '@/utils/sanitization-helpers';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import {
  userCustomizationsSchema,
  UserCustomizations,
  UserCustomizationsCreate,
  UserCustomizationsUpdate,
} from '@/domain/user/user.schema';
import { ErrorCode } from '@/constants/error-code-registry';
import { USER_PATHS } from '@/repositories/firestore/paths/firestore-user-paths';
import { IUserCustomizationsRepository } from '@/repositories/i-user-customizations-repository';

export class FirestoreUserCustomizationsRepository implements IUserCustomizationsRepository {
  private readonly context = 'FirestoreUserCustomizationsRepository';

  /**
   * Sanitizes hex color string (trims and converts to uppercase)
   */
  private sanitizeHexColor(color: string | null | undefined): string | undefined {
    if (!color) return undefined;
    const trimmed = sanitizeString(color);
    if (!trimmed) return undefined;
    // Convert to uppercase for consistency (hex colors are case-insensitive but uppercase is standard)
    return trimmed.toUpperCase();
  }

  /**
   * Sanitizes customizations creation input
   */
  private sanitizeCustomizationsCreate(
    payload: UserCustomizationsCreate,
  ): UserCustomizationsCreate {
    return {
      ...payload,
      primaryColor: this.sanitizeHexColor(payload.primaryColor),
      secondaryColor: this.sanitizeHexColor(payload.secondaryColor),
      accentColor: this.sanitizeHexColor(payload.accentColor),
      backgroundColor: this.sanitizeHexColor(payload.backgroundColor),
      textColor: this.sanitizeHexColor(payload.textColor),
      logo: payload.logo ? sanitizeUrl(payload.logo) || undefined : undefined,
    };
  }

  /**
   * Sanitizes customizations update input
   */
  private sanitizeCustomizationsUpdate(
    payload: UserCustomizationsUpdate,
  ): UserCustomizationsUpdate {
    const sanitized: UserCustomizationsUpdate = { ...payload };

    if (sanitized.primaryColor !== undefined) {
      sanitized.primaryColor = this.sanitizeHexColor(sanitized.primaryColor);
    }

    if (sanitized.secondaryColor !== undefined) {
      sanitized.secondaryColor = this.sanitizeHexColor(sanitized.secondaryColor);
    }

    if (sanitized.accentColor !== undefined) {
      sanitized.accentColor = this.sanitizeHexColor(sanitized.accentColor);
    }

    if (sanitized.backgroundColor !== undefined) {
      sanitized.backgroundColor = this.sanitizeHexColor(sanitized.backgroundColor);
    }

    if (sanitized.textColor !== undefined) {
      sanitized.textColor = this.sanitizeHexColor(sanitized.textColor);
    }

    if (sanitized.logo !== undefined) {
      sanitized.logo = sanitizeUrl(sanitized.logo) || undefined;
    }

    return sanitized;
  }

  /**
   * Parses Firestore snapshot to UserCustomizations with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<UserCustomizations, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'Customizations not found',
          'Customizations not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps({ id: snapshot.id, ...rawData });

    // Validate with schema
    const validationResult = validateWithSchema(userCustomizationsSchema, data, contextString);

    if (!validationResult.success) {
      return err(validationResult.error);
    }

    return ok(validationResult.value as UserCustomizations);
  }

  async get(
    userId: string,
    customizationsId: string,
  ): Promise<Result<UserCustomizations, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.CUSTOMIZATIONS_DOC(userId, customizationsId));
      const snapshot = await getDoc(ref);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getByUserId(userId: string): Promise<Result<UserCustomizations, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getByUserId', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const colRef = collection(firestore, USER_PATHS.CUSTOMIZATIONS(userId));
      const q = query(colRef, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Customizations not found',
            'Customizations not found',
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
    payload: UserCustomizationsCreate,
  ): Promise<Result<UserCustomizations, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeCustomizationsCreate(payload);

      const colRef = collection(firestore, USER_PATHS.CUSTOMIZATIONS(userId));
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
    customizationsId: string,
    updates: UserCustomizationsUpdate,
  ): Promise<Result<UserCustomizations, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeCustomizationsUpdate(updates);
      const ref = doc(firestore, USER_PATHS.CUSTOMIZATIONS_DOC(userId, customizationsId));

      await updateDoc(ref, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });

      return await this.get(userId, customizationsId);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async delete(userId: string, customizationsId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.CUSTOMIZATIONS_DOC(userId, customizationsId));
      await deleteDoc(ref);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }
}
