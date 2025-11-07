/*---------------------------------------
File: src/services/couple-shot-list-service.ts
Description: Couple shot list service - couple photo shot management
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { CoupleShotList, CoupleShotItem } from '@/domain/user/shots.schema';
import { coupleShotListSchema } from '@/domain/user/shots.schema';
import { ZodSchema } from 'zod';

/**
 * Service for managing couple shot lists
 * Wraps the generic ListService with CoupleShot-specific types
 */
export class CoupleShotListService extends ListService<CoupleShotList, CoupleShotItem> {
  constructor(repository: IListRepository<CoupleShotList, CoupleShotItem>) {
    super(repository, coupleShotListSchema as ZodSchema<CoupleShotList>, 'CoupleShotListService');
  }
}
