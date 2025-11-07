/*---------------------------------------
File: src/services/kit-list-service.ts
Description: Kit list service - equipment and gear management
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { ListService } from './list-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { KitList, KitItem } from '@/domain/user/kit.schema';
import { kitListSchema } from '@/domain/user/kit.schema';
import { ZodSchema } from 'zod';
/**
 * Service for managing kit lists (equipment and gear)
 * Wraps the generic ListService with Kit-specific types
 */
export class KitListService extends ListService<KitList, KitItem> {
  constructor(repository: IListRepository<KitList, KitItem>) {
    super(repository, kitListSchema as ZodSchema<KitList>, 'KitListService');
  }
}
