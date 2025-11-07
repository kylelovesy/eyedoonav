/*---------------------------------------
File: src/repositories/i-photo-tag-link-repository.ts
Description: PhotoTagLink repository interface for local file storage.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { PhotoTagLink, PhotoTagLinkInput, PhotoTagLinkUpdate } from '@/domain/scoped/tag.schema';

/**
 * @interface IPhotoTagLinkRepository
 * @description Defines the contract for local file storage operations related to PhotoTagLinks.
 * PhotoTagLinks are stored as JSON files in the device's document directory:
 * {documentDirectory}/photoTagLinks/{id}.json
 * This is the "Port" in the Ports & Adapters architecture.
 */
export interface IPhotoTagLinkRepository {
  /**
   * Retrieves all photo tag links from local storage.
   * @returns An array of PhotoTagLinks or an error.
   */
  getAll(): Promise<Result<PhotoTagLink[], AppError>>;

  /**
   * Retrieves a single photo tag link by its ID.
   * @param id The ID of the photo tag link to retrieve.
   * @returns The PhotoTagLink or an error if not found.
   */
  getById(id: string): Promise<Result<PhotoTagLink, AppError>>;

  /**
   * Creates a new photo tag link in local storage.
   * @param link The photo tag link data with id already assigned.
   * @returns The created PhotoTagLink or an error.
   */
  create(link: PhotoTagLink): Promise<Result<PhotoTagLink, AppError>>;

  /**
   * Updates an existing photo tag link in local storage.
   * @param id The ID of the photo tag link to update.
   * @param updates The partial photo tag link data to update.
   * @returns A void result.
   */
  update(id: string, updates: PhotoTagLinkUpdate): Promise<Result<void, AppError>>;

  /**
   * Deletes a photo tag link from local storage.
   * Also attempts to delete the referenced photo file (photoUri).
   * @param id The ID of the photo tag link to delete.
   * @returns A void result.
   */
  delete(id: string): Promise<Result<void, AppError>>;
}

