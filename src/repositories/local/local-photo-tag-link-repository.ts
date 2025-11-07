/*---------------------------------------
File: src/repositories/local/local-photo-tag-link-repository.ts
Description: Local file storage repository for PhotoTagLinks.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 2.0.0
---------------------------------------*/

import * as FileSystem from 'expo-file-system';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  PhotoTagLink,
  PhotoTagLinkUpdate,
  photoTagLinkSchema,
  photoTagLinkUpdateSchema,
} from '@/domain/scoped/tag.schema';
import { IPhotoTagLinkRepository } from '@/repositories/i-photo-tag-link-repository';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { ErrorCode } from '@/constants/error-code-registry';

/**
 * @class LocalPhotoTagLinkRepository
 * @description Implements the IPhotoTagLinkRepository interface for local file storage.
 * PhotoTagLinks are stored as JSON files in: {documentDirectory}/photoTagLinks/{id}.json
 * This is the "Adapter" that connects our application to the local file system.
 */
export class LocalPhotoTagLinkRepository implements IPhotoTagLinkRepository {
  private readonly context = 'LocalPhotoTagLinkRepository';
  private readonly baseDirectory = 'photoTagLinks';

  /**
   * Gets the full directory path for photo tag links
   */
  private getDirectoryPath(): string {
    // documentDirectory is a constant in expo-file-system
    const docDir = (FileSystem as unknown as { documentDirectory: string | null })
      .documentDirectory;
    if (!docDir) {
      throw new Error('Document directory not available');
    }
    return `${docDir}${this.baseDirectory}/`;
  }

  /**
   * Gets the full file path for a photo tag link
   */
  private getFilePath(id: string): string {
    return `${this.getDirectoryPath()}${id}.json`;
  }

  /**
   * Ensures the directory exists, creating it if necessary
   */
  private async ensureDirectoryExists(): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'ensureDirectoryExists');
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const dirPath = this.getDirectoryPath();
      const dirInfo = await FileSystem.getInfoAsync(dirPath);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Parses JSON content into a PhotoTagLink
   */
  private parseJsonContent(jsonContent: string, context: string): Result<PhotoTagLink, AppError> {
    try {
      const data = JSON.parse(jsonContent);

      // Convert createdAt string to Date if present
      if (data.createdAt && typeof data.createdAt === 'string') {
        data.createdAt = new Date(data.createdAt);
      }

      const validation = validateWithSchema(photoTagLinkSchema, data, context);
      if (!validation.success) {
        return validation as Result<PhotoTagLink, AppError>;
      }

      return ok(validation.value as PhotoTagLink);
    } catch {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Failed to parse photo tag link JSON',
          'Photo tag link file is corrupted',
          context,
        ),
      );
    }
  }

  async getAll(): Promise<Result<PhotoTagLink[], AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getAll');
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // Ensure directory exists
      const dirResult = await this.ensureDirectoryExists();
      if (!dirResult.success) {
        return dirResult as Result<PhotoTagLink[], AppError>;
      }

      const dirPath = this.getDirectoryPath();
      const files = await FileSystem.readDirectoryAsync(dirPath);

      const links: PhotoTagLink[] = [];

      // Read all JSON files
      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        const filePath = `${dirPath}${file}`;
        try {
          const content = await FileSystem.readAsStringAsync(filePath);
          const parseResult = this.parseJsonContent(content, contextString);

          if (parseResult.success) {
            links.push(parseResult.value);
          }
          // Skip corrupted files (already logged in parseJsonContent)
        } catch {
          // Skip files that can't be read
          continue;
        }
      }

      // Sort by createdAt descending (newest first)
      links.sort((a, b) => {
        const aDate = a.createdAt?.getTime() || 0;
        const bDate = b.createdAt?.getTime() || 0;
        return bDate - aDate;
      });

      return ok(links);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getById(id: string): Promise<Result<PhotoTagLink, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'getById',
      undefined,
      undefined,
      {
        linkId: id,
      },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const filePath = this.getFilePath(id);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Photo tag link not found',
            'Photo tag link not found',
            contextString,
          ),
        );
      }

      const content = await FileSystem.readAsStringAsync(filePath);
      return this.parseJsonContent(content, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async create(link: PhotoTagLink): Promise<Result<PhotoTagLink, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'create',
      undefined,
      undefined,
      { linkId: link.id },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Validate input
      const validation = validateWithSchema(photoTagLinkSchema, link, contextString);
      if (!validation.success) {
        return validation as Result<PhotoTagLink, AppError>;
      }

      // 2. Ensure directory exists
      const dirResult = await this.ensureDirectoryExists();
      if (!dirResult.success) {
        return dirResult as Result<PhotoTagLink, AppError>;
      }

      // 3. Write file
      const filePath = this.getFilePath(link.id);
      // createdAt is validated as Date | undefined by Zod
      const createdAtDate: Date =
        validation.value.createdAt instanceof Date ? validation.value.createdAt : new Date();
      const jsonContent = JSON.stringify({
        ...validation.value,
        createdAt: createdAtDate.toISOString(),
      });

      await FileSystem.writeAsStringAsync(filePath, jsonContent);

      return ok(validation.value as PhotoTagLink);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async update(id: string, updates: PhotoTagLinkUpdate): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'update',
      undefined,
      undefined,
      { linkId: id },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get existing link
      const existingResult = await this.getById(id);
      if (!existingResult.success) {
        return existingResult as Result<void, AppError>;
      }

      const existing = existingResult.value;

      // 2. Validate partial updates
      const validation = validatePartialWithSchema(
        photoTagLinkUpdateSchema,
        updates,
        contextString,
      );
      if (!validation.success) {
        return validation as Result<void, AppError>;
      }

      // 3. Merge updates
      const updated: PhotoTagLink = {
        ...existing,
        ...validation.value,
      };

      // 4. Validate complete object
      const completeValidation = validateWithSchema(photoTagLinkSchema, updated, contextString);
      if (!completeValidation.success) {
        return completeValidation as Result<void, AppError>;
      }

      // 5. Write updated file
      const filePath = this.getFilePath(id);
      // createdAt is validated as Date | undefined by Zod
      const createdAtDate: Date =
        completeValidation.value.createdAt instanceof Date
          ? completeValidation.value.createdAt
          : new Date();
      const jsonContent = JSON.stringify({
        ...completeValidation.value,
        createdAt: createdAtDate.toISOString(),
      });

      await FileSystem.writeAsStringAsync(filePath, jsonContent);

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'delete',
      undefined,
      undefined,
      { linkId: id },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get existing link to get photoUri
      const existingResult = await this.getById(id);
      if (existingResult.success) {
        const photoUri = existingResult.value.photoUri;

        // 2. Try to delete photo file if it exists
        if (photoUri) {
          try {
            const photoInfo = await FileSystem.getInfoAsync(photoUri);
            if (photoInfo.exists) {
              await FileSystem.deleteAsync(photoUri, { idempotent: true });
            }
          } catch {
            // Continue even if photo deletion fails
            // Log error but don't fail the operation
          }
        }
      }

      // 3. Delete JSON file
      const filePath = this.getFilePath(id);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }
}
