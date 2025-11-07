/*---------------------------------------
File: src/ports/i-storage-repository.ts
Description: Storage repository interface for the Eye-Doo application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';

/**
 * @interface IStorageRepository
 * @description Defines the contract for data access operations related to Storage. This includes photos, videos, and other media files.
 * This is the "Port" in the Ports & Adapters architecture.
 */
export interface IStorageRepository {
  /**
   * Uploads a reference image for a photo request item.
   * @param projectId The ID of the project the photo request belongs to.
   * @param itemId The ID of the photo request item.
   * @param imageBlob The image blob to upload.
   * @param imageIndex The index of the image (for multiple images per request).
   * @returns The download URL of the uploaded image or an error.
   */
  uploadPhotoRequestImage(
    projectId: string,
    itemId: string,
    imageBlob: Blob,
    imageIndex: number,
  ): Promise<Result<string, AppError>>;

  /**
   * Deletes a specific reference image for a photo request item.
   * @param projectId The ID of the project the photo request belongs to.
   * @param itemId The ID of the photo request item.
   * @param imageUrl The URL of the image to delete.
   * @returns A void result.
   */
  deletePhotoRequestImage(
    projectId: string,
    itemId: string,
    imageUrl: string,
  ): Promise<Result<void, AppError>>;

  /**
   * Deletes all reference images for a photo request item.
   * @param projectId The ID of the project the photo request belongs to.
   * @param itemId The ID of the photo request item.
   * @returns A void result.
   */
  deleteAllPhotoRequestImages(projectId: string, itemId: string): Promise<Result<void, AppError>>;

  /**
   * Uploads an avatar image for a key people item.
   * @param projectId The ID of the project the key people belongs to.
   * @param itemId The ID of the key people item.
   * @param imageBlob The image blob to upload.
   * @returns The download URL of the uploaded image or an error.
   */
  uploadKeyPeopleAvatar(
    projectId: string,
    itemId: string,
    imageBlob: Blob,
  ): Promise<Result<string, AppError>>;

  /**
   * Deletes an avatar image for a key people item.
   * @param projectId The ID of the project the key people belongs to.
   * @param itemId The ID of the key people item.
   * @param imageUrl The URL of the image to delete.
   * @returns A void result.
   */
  deleteKeyPeopleAvatar(
    projectId: string,
    itemId: string,
    imageUrl: string,
  ): Promise<Result<void, AppError>>;
}
