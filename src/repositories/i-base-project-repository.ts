/*---------------------------------------
File: src/repositories/i-base-project-repository.ts
Description: Project repository interface - handles /projects/{projectId}
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { BaseProject, BaseProjectInput, BaseProjectUpdate } from '@/domain/project/project.schema';
import { Transaction } from 'firebase/firestore';
import { IListRepository } from './i-list-repository';
import { KitList, KitItem } from '@/domain/user/kit.schema';
import { TaskList, TaskItem } from '@/domain/user/task.schema';
import { GroupShotList, GroupShotItem } from '@/domain/user/shots.schema';
import { CoupleShotList, CoupleShotItem } from '@/domain/user/shots.schema';
/**
 * Repository interface for Project data access operations
 * This is the "Port" in the Ports & Adapters architecture
 *
 * ✅ RECOMMENDED: Real-time listener for user's projects list
 * Dashboard and project management screens need live updates
 * Detach when user logs out or switches accounts
 */
export interface IBaseProjectRepository {
  /**
   * Creates a new project
   * Note: Repository handles sanitization only - validation happens in service layer
   *
   * @param userId - The ID of the user creating the project
   * @param payload - Project creation data (already validated by service)
   * @returns Result containing the created project or an error
   */
  create(
    userId: string,
    payload: BaseProjectInput,
    tx?: Transaction,
  ): Promise<Result<BaseProject, AppError>>;

  /**
   * Retrieves a single project by its ID
   * Note: Repository performs defensive parsing (validation) of data FROM Firestore
   *
   * @param projectId - The ID of the project to retrieve
   * @returns Result containing the project or an error if not found
   */
  getById(projectId: string): Promise<Result<BaseProject, AppError>>;

  /**
   * Retrieves all projects for a specific user
   * Note: Repository performs defensive parsing of each document FROM Firestore
   *
   * @param userId - The ID of the user
   * @returns Result containing an array of projects or an error
   */
  listByUserId(userId: string): Promise<Result<BaseProject[], AppError>>;

  /**
   * ✅ RECOMMENDED: Subscribes to real-time updates for a user's projects
   * Only active when user is on project management screens
   * Detach when user leaves the project management screens, closes app, switches projects or logs out
   *
   * @param userId - The ID of the user
   * @param onData - Callback function for when data updates arrive
   * @returns Unsubscribe function - MUST be called to cleanup listener
   */
  subscribeToUserProjects(
    userId: string,
    onData: (result: Result<BaseProject[], AppError>) => void,
  ): () => void;

  /**
   * Updates an existing project
   * Note: Repository handles sanitization only - validation happens in service layer
   *
   * @param projectId - The ID of the project to update
   * @param payload - Partial project data to update (already validated by service)
   * @returns Result containing void on success or an error
   */
  update(projectId: string, payload: BaseProjectUpdate): Promise<Result<void, AppError>>;

  /**
   * Deletes a project by its ID
   *
   * @param projectId - The ID of the project to delete
   * @returns Result containing void on success or an error
   */
  delete(projectId: string, userId: string): Promise<Result<void, AppError>>;

  /**
   * Creates a project with all required list subcollections atomically using a transaction.
   * This method orchestrates the creation of the project document and all 4 list subcollections
   * in a single atomic operation.
   *
   * @param userId - The ID of the user creating the project
   * @param projectInput - Project creation data (already validated by service)
   * @param sourceLists - Source lists to use for initializing project lists
   * @param listRepositories - List repositories for creating project lists
   * @returns Result containing the created project or an error
   */
  createProjectWithLists(
    userId: string,
    projectInput: BaseProjectInput,
    sourceLists: {
      kit: KitList;
      task: TaskList;
      groupShot: GroupShotList;
      coupleShot: CoupleShotList;
    },
    listRepositories: {
      kit: IListRepository<KitList, KitItem>;
      task: IListRepository<TaskList, TaskItem>;
      groupShot: IListRepository<GroupShotList, GroupShotItem>;
      coupleShot: IListRepository<CoupleShotList, CoupleShotItem>;
    },
  ): Promise<Result<BaseProject, AppError>>;
}
