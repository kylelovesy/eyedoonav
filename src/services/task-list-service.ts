/*---------------------------------------
File: src/services/task-list-service.ts
Description: Task list service - project task management
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { TaskList, TaskItem } from '@/domain/user/task.schema';
import { taskListSchema } from '@/domain/user/task.schema';
import { ZodSchema } from 'zod';
/**
 * Service for managing task lists
 * Wraps the generic ListService with Task-specific types
 */
export class TaskListService extends ListService<TaskList, TaskItem> {
  constructor(repository: IListRepository<TaskList, TaskItem>) {
    super(repository, taskListSchema as ZodSchema<TaskList>, 'TaskListService');
  }
}
