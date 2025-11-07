/*---------------------------------------
File: src/services/ProjectManagementService.ts
Description: Project service with orchestration - creates project and initializes subcollections
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  BaseProject,
  BaseProjectInput,
  BaseProjectUpdate,
  baseProjectInputSchema,
} from '@/domain/project/project.schema';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import { BaseProjectService } from './base-project-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { ListConstraint } from '@/domain/common/list-base.schema';
import { KitList, KitItem } from '@/domain/user/kit.schema';
import { TaskList, TaskItem } from '@/domain/user/task.schema';
import { GroupShotList, GroupShotItem } from '@/domain/user/shots.schema';
import { CoupleShotList, CoupleShotItem } from '@/domain/user/shots.schema';
import { ListBaseItem } from '@/domain/common/list-base.schema';
import { ErrorCode } from '@/constants/error-code-registry';
import { LoggingService } from '@/services/logging-service';
import { BaseTimelineService } from './base-timeline-service';
import { IBaseProjectRepository } from '@/repositories/i-base-project-repository';

/**
 * Project service with orchestration
 * Handles project creation with subcollection initialization
 */
export class ProjectManagementService {
  private readonly context = 'ProjectManagementService';

  constructor(
    private baseProjectService: BaseProjectService,
    private baseProjectRepository: IBaseProjectRepository,
    private baseTimelineService: BaseTimelineService,
    private kitRepository: IListRepository<KitList, KitItem>,
    private taskRepository: IListRepository<TaskList, TaskItem>,
    private groupShotRepository: IListRepository<GroupShotList, GroupShotItem>,
    private coupleShotRepository: IListRepository<CoupleShotList, CoupleShotItem>,
  ) {}

  /**
   * Creates a new project and initializes its default subcollections.
   * This is an ORCHESTRATION method using Firestore transactions for atomicity.
   *
   * @param userId - The ID of the user creating the project
   * @param payload - Project creation input
   * @returns Result containing the created project or an error
   */
  async createProject(
    userId: string,
    payload: BaseProjectInput,
  ): Promise<Result<BaseProject, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'createProject', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate input
    const validation = validateWithSchema(baseProjectInputSchema, payload, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // 2. Perform all READS first (outside transaction)
    // Firestore transactions require all reads before writes
    const sourceListsResult = await this.prepareSourceLists(userId);
    if (!sourceListsResult.success) {
      return err(sourceListsResult.error);
    }
    const sourceLists = sourceListsResult.value;

    // 3. Create project with all lists atomically using repository transaction
    const projectResult = await this.baseProjectRepository.createProjectWithLists(
      userId,
      validation.value as BaseProjectInput,
      sourceLists,
      {
        kit: this.kitRepository,
        task: this.taskRepository,
        groupShot: this.groupShotRepository,
        coupleShot: this.coupleShotRepository,
      },
    );

    if (!projectResult.success) {
      return err(projectResult.error);
    }

    const newProject = projectResult.value;

    // 4. Initialize timeline (non-critical, outside transaction)
    // Timeline failure doesn't affect project creation
    const timelineResult = await this.baseTimelineService.createProjectTimeline(newProject.id);
    if (!timelineResult.success) {
      LoggingService.error(timelineResult.error, {
        component: this.context,
        method: 'createProject.timelineInit',
        metadata: { projectId: newProject.id, userId },
      });
      // Timeline failure is non-critical - continue with project creation
    }

    return ok(newProject);
  }

  /**
   * Helper function to prepare source lists for all list types.
   * Performs all READS before transaction (Firestore requirement).
   *
   * @param userId - The ID of the user
   * @returns Result containing source lists for all types or an error
   */
  private async prepareSourceLists(userId: string): Promise<
    Result<
      {
        kit: KitList;
        task: TaskList;
        groupShot: GroupShotList;
        coupleShot: CoupleShotList;
      },
      AppError
    >
  > {
    // Get source lists for all types in parallel (reads outside transaction)
    const [kitListResult, taskListResult, groupShotListResult, coupleShotListResult] =
      await Promise.all([
        this.getSourceList(userId, this.kitRepository, 'kit'),
        this.getSourceList(userId, this.taskRepository, 'task'),
        this.getSourceList(userId, this.groupShotRepository, 'groupShot'),
        this.getSourceList(userId, this.coupleShotRepository, 'coupleShot'),
      ]);

    // Check for any failures
    if (!kitListResult.success) {
      return err(kitListResult.error);
    }
    if (!taskListResult.success) {
      return err(taskListResult.error);
    }
    if (!groupShotListResult.success) {
      return err(groupShotListResult.error);
    }
    if (!coupleShotListResult.success) {
      return err(coupleShotListResult.error);
    }

    return ok({
      kit: kitListResult.value as KitList,
      task: taskListResult.value as TaskList,
      groupShot: groupShotListResult.value as GroupShotList,
      coupleShot: coupleShotListResult.value as CoupleShotList,
    });
  }

  /**
   * Helper function to get a source list (user list or fallback to master).
   * Used to prepare data before transaction.
   *
   * @param userId - The ID of the user
   * @param repository - The list repository to use
   * @param listName - Name of the list for error reporting
   * @returns Result containing the source list or an error
   */
  private async getSourceList<TList extends ListConstraint<TItem>, TItem extends ListBaseItem>(
    userId: string,
    repository: IListRepository<TList, TItem>,
    listName: string,
  ): Promise<Result<TList, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'getSourceList', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Try to get the user's master list first
    const listResult = await repository.getUserList(userId);
    if (listResult.success) {
      return ok(listResult.value);
    }

    // 2. Fallback to global master list
    const masterListResult = await repository.getMaster();
    if (!masterListResult.success) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          `Failed to get master list for ${listName}: ${masterListResult.error.message}`,
          `Unable to initialize ${listName} list. Please try again.`,
          contextString,
          masterListResult.error,
          false,
        ),
      );
    }

    return ok(masterListResult.value);
  }

  /**
   * Gets a project by ID (for launch/display)
   */
  async getById(projectId: string): Promise<Result<BaseProject, AppError>> {
    return await this.baseProjectService.getById(projectId);
  }

  /**
   * Gets all projects for a user
   */
  async listByUserId(userId: string): Promise<Result<BaseProject[], AppError>> {
    return await this.baseProjectService.listByUserId(userId);
  }

  /**
   * ✅ RECOMMENDED: Subscribes to real-time updates for user's projects
   */
  subscribeToUserProjects(
    userId: string,
    onData: (result: Result<BaseProject[], AppError>) => void,
  ): () => void {
    return this.baseProjectService.subscribeToUserProjects(userId, onData);
  }

  /**
   * Updates a project
   */
  async update(projectId: string, payload: BaseProjectUpdate): Promise<Result<void, AppError>> {
    return await this.baseProjectService.update(projectId, payload);
  }

  /**
   * Deletes a project
   */
  async delete(projectId: string, userId: string): Promise<Result<void, AppError>> {
    return await this.baseProjectService.delete(projectId, userId);
  }
}
