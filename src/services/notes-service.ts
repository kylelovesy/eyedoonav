/*---------------------------------------
File: src/services/notes-service.ts
Description: Notes service wrapping ListService, preserving subscription checks and toggle operations
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { NoteList, NoteItem } from '@/domain/scoped/notes.schema';
import { noteListSchema } from '@/domain/scoped/notes.schema';
import { ZodSchema } from 'zod';
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';
import { err } from '@/domain/common/result';
/**
 * Service for managing notes lists
 * Wraps the generic ListService with Notes-specific types
 */
export class NoteListService extends ListService<NoteList, NoteItem> {
  constructor(repository: IListRepository<NoteList, NoteItem>) {
    super(repository, noteListSchema as ZodSchema<NoteList>, 'NoteListService');
  }

  /**
   * Toggles the pinned status of a note
   * Works for both user (global) and project (local) notes
   *
   * @param userId - User ID for user-scoped notes (optional if projectId provided)
   * @param projectId - Project ID for project-scoped notes (optional if userId provided)
   * @param noteId - The ID of the note to toggle
   * @param isPinned - The new pinned status
   * @returns Result indicating success or error
   *
   * @example
   *cript
   * const result = await noteService.togglePinned(userId, undefined, noteId, true);
   * if (result.success) {
   *   console.log('Note pinned successfully');
   * }
   *    */
  async togglePinned(
    userId: string | undefined,
    projectId: string | undefined,
    noteId: string,
    isPinned: boolean,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      'NoteListService',
      'togglePinned',
      userId,
      projectId,
      { noteId, isPinned },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Validate that either userId or projectId is provided
    if (!userId && !projectId) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Missing scope identifier',
          'Either userId or projectId must be provided',
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Use appropriate batch update method based on scope
    if (userId) {
      return await this.batchUpdateUserItems(userId, [{ id: noteId, isPinned }]);
    } else {
      return await this.batchUpdateProjectItems(projectId!, [{ id: noteId, isPinned }]);
    }
  }

  /**
   * Toggles the read status of a note
   * Works for both user (global) and project (local) notes
   *
   * @param userId - User ID for user-scoped notes (optional if projectId provided)
   * @param projectId - Project ID for project-scoped notes (optional if userId provided)
   * @param noteId - The ID of the note to toggle
   * @param isRead - The new read status
   * @returns Result indicating success or error
   *
   * @example
   *
   * const result = await noteService.toggleRead(undefined, projectId, noteId, true);
   * if (result.success) {
   *   console.log('Note marked as read');
   * }
   *    */
  async toggleRead(
    userId: string | undefined,
    projectId: string | undefined,
    noteId: string,
    isRead: boolean,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      'NoteListService',
      'toggleRead',
      userId,
      projectId,
      { noteId, isRead },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Validate that either userId or projectId is provided
    if (!userId && !projectId) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Missing scope identifier',
          'Either userId or projectId must be provided',
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Use appropriate batch update method based on scope
    if (userId) {
      return await this.batchUpdateUserItems(userId, [{ id: noteId, isRead }]);
    } else {
      return await this.batchUpdateProjectItems(projectId!, [{ id: noteId, isRead }]);
    }
  }
}

// Export interface for compatibility with hooks
export interface INotesService {
  // Inherit all ListService methods
  getUserList(userId: string): Promise<Result<NoteList, AppError>>;
  getProjectList(projectId: string): Promise<Result<NoteList, AppError>>;
  addUserItem(userId: string, item: NoteItem): Promise<Result<NoteItem, AppError>>;
  addProjectItem(projectId: string, item: NoteItem): Promise<Result<NoteItem, AppError>>;
  deleteUserItem(userId: string, itemId: string): Promise<Result<void, AppError>>;
  deleteProjectItem(projectId: string, itemId: string): Promise<Result<void, AppError>>;
  batchUpdateUserItems(
    userId: string,
    updates: Array<{ id: string } & Partial<NoteItem>>,
  ): Promise<Result<void, AppError>>;
  batchUpdateProjectItems(
    projectId: string,
    updates: Array<{ id: string } & Partial<NoteItem>>,
  ): Promise<Result<void, AppError>>;
  batchDeleteUserItems(userId: string, itemIds: string[]): Promise<Result<void, AppError>>;
  batchDeleteProjectItems(projectId: string, itemIds: string[]): Promise<Result<void, AppError>>;
  subscribeToUserList(
    userId: string,
    onUpdate: (result: Result<NoteList | null, AppError>) => void,
  ): () => void;
  subscribeToProjectList(
    projectId: string,
    onUpdate: (result: Result<NoteList | null, AppError>) => void,
  ): () => void;

  // Note-specific operations
  togglePinned(
    userId: string | undefined,
    projectId: string | undefined,
    noteId: string,
    isPinned: boolean,
  ): Promise<Result<void, AppError>>;
  toggleRead(
    userId: string | undefined,
    projectId: string | undefined,
    noteId: string,
    isRead: boolean,
  ): Promise<Result<void, AppError>>;
}
