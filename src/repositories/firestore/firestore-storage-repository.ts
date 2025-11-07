/*---------------------------------------
File: src/repositories/firestore/firestore-storage-repository.ts
Description: Firestore storage repository implementation for the Eye-Doo application.

Author: Kyle Lovesy
Date: 04/11-2025 - 16.00
Version: 2.0.0
---------------------------------------*/
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '@/config/firebaseConfig';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { IStorageRepository } from '@/repositories/i-storage-repository';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { ErrorCode } from '@/constants/error-code-registry';
import { FirebaseStorageError } from '@/domain/common/errors';

/**
 * @class FirestoreStorageRepository
 * @description Implements the IStorageRepository interface for Firebase Storage.
 * This is the "Adapter" that connects our application to Firebase Storage.
 */
export class FirestoreStorageRepository implements IStorageRepository {
  private readonly context = 'FirestoreStorageRepository';

  /**
   * Gets a storage reference for a photo request image
   */
  private getPhotoRequestImageRef(projectId: string, itemId: string, imageIndex: number) {
    return ref(storage, `photo-requests/${projectId}/${itemId}/image-${imageIndex}.jpg`);
  }

  /**
   * Gets a storage reference for a photo request item directory
   */
  private getPhotoRequestItemDirRef(projectId: string, itemId: string) {
    return ref(storage, `photo-requests/${projectId}/${itemId}`);
  }

  /**
   * Gets a storage reference for a key people avatar
   */
  private getKeyPeopleAvatarRef(projectId: string, itemId: string) {
    return ref(storage, `key-people/${projectId}/${itemId}/avatar.jpg`);
  }

  /**
   * Extracts the storage path from a download URL
   */
  private extractStoragePathFromUrl(imageUrl: string): string | null {
    try {
      const url = new URL(imageUrl);
      // Firebase Storage URLs contain the path after /o/
      const match = url.pathname.match(/\/o\/(.+)\?/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
      return null;
    } catch {
      return null;
    }
  }

  async uploadPhotoRequestImage(
    projectId: string,
    itemId: string,
    imageBlob: Blob,
    imageIndex: number,
  ): Promise<Result<string, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'uploadPhotoRequestImage',
      undefined,
      projectId,
      { itemId, imageIndex },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const storageRef = this.getPhotoRequestImageRef(projectId, itemId, imageIndex);
      await uploadBytes(storageRef, imageBlob);
      const url = await getDownloadURL(storageRef);

      return ok(url);
    } catch (error) {
      return err(this.mapStorageError(error, contextString));
    }
  }

  async deletePhotoRequestImage(
    projectId: string,
    itemId: string,
    imageUrl: string,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'deletePhotoRequestImage',
      undefined,
      projectId,
      { itemId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const storagePath = this.extractStoragePathFromUrl(imageUrl);
      if (!storagePath) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            'Invalid image URL format',
            'Invalid image URL. Unable to delete image.',
            contextString,
          ),
        );
      }

      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);

      return ok(undefined);
    } catch (error) {
      return err(this.mapStorageError(error, contextString));
    }
  }

  async deleteAllPhotoRequestImages(
    projectId: string,
    itemId: string,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'deleteAllPhotoRequestImages',
      undefined,
      projectId,
      { itemId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const dirRef = this.getPhotoRequestItemDirRef(projectId, itemId);
      const listResult = await listAll(dirRef);

      // Delete all items in the directory
      const deletePromises = listResult.items.map(item => deleteObject(item));
      await Promise.all(deletePromises);

      return ok(undefined);
    } catch (error) {
      // If directory doesn't exist, that's fine - nothing to delete
      if (error instanceof Error && error.message.includes('object-not-found')) {
        return ok(undefined);
      }
      return err(this.mapStorageError(error, contextString));
    }
  }

  async uploadKeyPeopleAvatar(
    projectId: string,
    itemId: string,
    imageBlob: Blob,
  ): Promise<Result<string, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'uploadKeyPeopleAvatar',
      undefined,
      projectId,
      { itemId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const storageRef = this.getKeyPeopleAvatarRef(projectId, itemId);
      await uploadBytes(storageRef, imageBlob);
      const url = await getDownloadURL(storageRef);

      return ok(url);
    } catch (error) {
      return err(this.mapStorageError(error, contextString));
    }
  }

  async deleteKeyPeopleAvatar(
    projectId: string,
    itemId: string,
    imageUrl: string,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'deleteKeyPeopleAvatar',
      undefined,
      projectId,
      { itemId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const storagePath = this.extractStoragePathFromUrl(imageUrl);
      if (!storagePath) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            'Invalid image URL format',
            'Invalid image URL. Unable to delete image.',
            contextString,
          ),
        );
      }

      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);

      return ok(undefined);
    } catch (error) {
      return err(this.mapStorageError(error, contextString));
    }
  }

  /**
   * Maps Firebase Storage errors to AppError instances
   */
  private mapStorageError(error: unknown, context: string): AppError {
    let message = 'An unknown storage error occurred';
    let userMessage = 'A storage error occurred. Please try again.';
    let code = ErrorCode.FIREBASE_STORAGE_ERROR;
    let retryable = false;

    if (error instanceof Error) {
      message = error.message;

      // Map common Firebase Storage errors
      if (message.includes('permission-denied') || message.includes('unauthorized')) {
        code = ErrorCode.FIREBASE_STORAGE_PERMISSION_DENIED;
        userMessage = 'You do not have permission to perform this storage operation.';
        retryable = false;
      } else if (message.includes('object-not-found') || message.includes('not-found')) {
        code = ErrorCode.FIREBASE_STORAGE_NOT_FOUND;
        userMessage = 'The requested file was not found.';
        retryable = false;
      } else if (message.includes('quota-exceeded') || message.includes('quota')) {
        code = ErrorCode.FIREBASE_STORAGE_ERROR;
        userMessage = 'Storage quota exceeded. Please free up space or upgrade your plan.';
        retryable = false;
      } else if (message.includes('unavailable') || message.includes('network')) {
        code = ErrorCode.FIREBASE_STORAGE_UNAVAILABLE;
        userMessage = 'Storage service temporarily unavailable. Please try again.';
        retryable = true;
      }
    }

    return new FirebaseStorageError(
      code,
      `Storage Error: ${message}`,
      userMessage,
      context,
      error,
      retryable,
    );
  }
}

export const storageRepository = new FirestoreStorageRepository();
