/*---------------------------------------
File: src/repositories/i-user-projects-repository.ts
Description: User projects repository interface - handles /users/{userId}/projects/{projectsId}
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { UserProjects, UserProjectsCreate, UserProjectsUpdate } from '@/domain/user/user.schema';

/**
 * Repository interface for user projects subcollection
 * Handles /users/{userId}/projects/{projectsId} - user's project tracking and statistics
 * ✅ YES real-time listener (active project only) - Dashboard and progress stats depend on live data
 * Detach when user switches project or leaves workspace
 */
export interface IUserProjectsRepository {
  /**
   * Gets user projects by ID (one-time fetch)
   * @param userId - The user ID
   * @param projectsId - The projects document ID
   * @returns UserProjects or error
   */
  get(userId: string, projectsId: string): Promise<Result<UserProjects, AppError>>;

  /**
   * Gets the user's projects (assumes single projects document)
   * Fetches first document in projects subcollection
   * @param userId - The user ID
   * @returns UserProjects or error
   */
  getByUserId(userId: string): Promise<Result<UserProjects, AppError>>;

  /**
   * Creates a new projects document
   * @param userId - The user ID
   * @param payload - Projects creation data
   * @returns Created UserProjects or error
   */
  create(userId: string, payload: UserProjectsCreate): Promise<Result<UserProjects, AppError>>;

  /**
   * Updates projects document
   * @param userId - The user ID
   * @param projectsId - The projects document ID
   * @param updates - Partial update data
   * @returns Updated UserProjects or error
   */
  update(
    userId: string,
    projectsId: string,
    updates: UserProjectsUpdate,
  ): Promise<Result<UserProjects, AppError>>;

  /**
   * Deletes projects document
   * @param userId - The user ID
   * @param projectsId - The projects document ID
   * @returns Success or error
   */
  delete(userId: string, projectsId: string): Promise<Result<void, AppError>>;

  /**
   * Subscribes to real-time updates for projects (✅ RECOMMENDED - active project only)
   * Dashboard and progress stats depend on live project data
   * Detach when user switches project or leaves workspace
   * @param userId - The user ID
   * @param projectsId - The projects document ID
   * @param onData - Callback when data changes (Result type)
   * @returns Unsubscribe function for cleanup
   */
  subscribeToProjects(
    userId: string,
    projectsId: string,
    onData: (result: Result<UserProjects, AppError>) => void,
  ): () => void;
}
