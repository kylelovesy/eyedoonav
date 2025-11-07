/*---------------------------------------
File: src/domain/project/project.schema.ts
Description: Project schemas - flattened structure
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { z } from 'zod';
import {
  idSchema,
  displayNameSchema,
  personInfoSchema,
  requiredTimestampSchema,
  optionalTimestampSchema,
  phoneSchema,
  emailSchema,
} from '@/domain/common/shared-schemas';
import { ClientPortalStatus, ProjectStatus } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';
import { coupleShotListSchema, groupShotListSchema } from '../user/shots.schema';
import { timelineListSchema } from './timeline.schema';
import { kitListSchema } from '../user/kit.schema';
import { taskListSchema } from '../user/task.schema';
// import {clientPortalSchema } from './portal.schema';
// import {locationListSchema} from './location.schema';
// import {photoRequestListSchema} from './photo-request.schema';
// import {keyPeopleListSchema} from './key-people.schema';

/**
 * ============================================================================
 * PROJECT SCHEMA - Flattened structure
 * ============================================================================
 */
export const baseProjectSchema = z.object({
  id: idSchema,
  userId: idSchema,
  photographerName: displayNameSchema,
  projectName: z
    .string()
    .min(1, `Name ${DEFAULTS.TEXT_LENGTHS_MSG.REQUIRED}`)
    .max(DEFAULTS.TEXT_LENGTHS.NAME, `Name ${DEFAULTS.TEXT_LENGTHS_MSG.NAME}`)
    .trim(),
  projectStatus: z.nativeEnum(ProjectStatus).default(ProjectStatus.SETUP),
  eventDate: requiredTimestampSchema,
  coverImage: z.string().optional(),
  personAName: personInfoSchema,
  personBName: personInfoSchema,
  email: emailSchema,
  phone: phoneSchema,
  cachedProjectDashboard: z.boolean().default(DEFAULTS.DISABLED),
  firstLaunchDate: optionalTimestampSchema.optional(),
  clientPortalStatus: z.nativeEnum(ClientPortalStatus).default(ClientPortalStatus.NONE),
  clientPortalId: idSchema.optional(),
  createdAt: requiredTimestampSchema,
  updatedAt: optionalTimestampSchema.optional(),
});

export const baseProjectInputSchema = baseProjectSchema.omit({
  id: true,
  userId: true,
  photographerName: true,
  projectStatus: true,
  cachedProjectDashboard: true,
  clientPortalStatus: true,
  clientPortalId: true,
  firstLaunchDate: true,
  createdAt: true,
  updatedAt: true,
});

export const baseProjectUpdateSchema = baseProjectInputSchema.partial();

// export const baseProjectCreateSchema = baseProjectInputSchema.extend({
//   id: idSchema,
// });

/**
 * ============================================================================
 * COMPOSITE SCHEMAS (for joins/aggregation)
 * ============================================================================
 */

export const projectWithSubcollectionsSchema = baseProjectSchema.extend({
  timeline: timelineListSchema.optional(),
  kitList: kitListSchema.optional(),
  taskList: taskListSchema.optional(),
  coupleShotList: coupleShotListSchema.optional(),
  groupShotList: groupShotListSchema.optional(),
  // portal: clientPortalSchema.optional(),
  // locationList: locationListSchema.optional(),
  // photoRequestList: photoRequestListSchema.optional(),
  // keyPeopleList: keyPeopleListSchema.optional(),
});

/**
 * ============================================================================
 * QUERY SCHEMAS
 * ============================================================================
 */
export const baseProjectFilterSchema = z.object({
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: optionalTimestampSchema.optional(),
  endDate: optionalTimestampSchema.optional(),
  searchTerm: z.string().optional(),
});

export const baseProjectSortSchema = z.object({
  field: z.enum(['eventDate', 'createdAt', 'updatedAt', 'projectName']),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * ============================================================================
 * TYPE EXPORTS
 * ============================================================================
 */
export type BaseProject = z.infer<typeof baseProjectSchema>;
export type BaseProjectInput = z.infer<typeof baseProjectInputSchema>;
export type BaseProjectUpdate = z.infer<typeof baseProjectUpdateSchema>;
export type ProjectWithSubcollections = z.infer<typeof projectWithSubcollectionsSchema>;

export type BaseProjectFilter = z.infer<typeof baseProjectFilterSchema>;
export type BaseProjectSort = z.infer<typeof baseProjectSortSchema>;

/**
 * ============================================================================
 * DEFAULT VALUE FACTORIES
 * ============================================================================
 */
export const defaultBaseProject = (
  id: string,
  userId: string,
  photographerName: string,
): BaseProject => ({
  id,
  userId,
  photographerName,
  projectName: '',
  projectStatus: ProjectStatus.SETUP,
  eventDate: new Date(),
  coverImage: '',
  personAName: {
    firstName: '',
    lastName: '',
  },
  personBName: {
    firstName: '',
    lastName: '',
  },
  email: '',
  phone: '',
  cachedProjectDashboard: DEFAULTS.DISABLED,
  clientPortalStatus: ClientPortalStatus.NONE,
  clientPortalId: '',
  createdAt: new Date(),
  updatedAt: null as Date | null,
});
