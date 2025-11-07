/*---------------------------------------
File: src/services/group-shot-list-service.ts
Description: Group shot list service - group photo shot management
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { GroupShotList, GroupShotItem } from '@/domain/user/shots.schema';
import { groupShotListSchema } from '@/domain/user/shots.schema';
import { ZodSchema } from 'zod';

/**
 * Service for managing group shot lists
 * Wraps the generic ListService with GroupShot-specific types
 */
export class GroupShotListService extends ListService<GroupShotList, GroupShotItem> {
  constructor(repository: IListRepository<GroupShotList, GroupShotItem>) {
    super(repository, groupShotListSchema as ZodSchema<GroupShotList>, 'GroupShotListService');
  }
}
