/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

import { ClientPortalStatus, ProjectStatus } from '@/constants/enums';
import { BaseProject } from '@/domain/project/project.schema';
import { DEFAULTS } from '@/constants/defaults';

/**
 * Converts flat project schema to nested structure for display/compatibility
 */

export const projectToNested = (project: BaseProject) => ({
  id: project.id,
  userId: project.userId,
  photographerName: project.photographerName,
  projectName: project.projectName,
  projectStatus: project.projectStatus,
  eventDate: project.eventDate,
  coverImage: project.coverImage,
  personAName: {
    firstName: project.personAName.firstName,
    lastName: project.personAName.lastName,
  },
  personBName: {
    firstName: project.personBName.firstName,
    lastName: project.personBName.lastName,
  },
  email: project.email,
  phone: project.phone,
  cachedProjectDashboard: project.cachedProjectDashboard,
  clientPortalStatus: project.clientPortalStatus,
  clientPortalId: project.clientPortalId,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

/**
 * Converts nested structure to flat project schema
 */
export const nestedToProject = (nested: {
  id: string;
  userId: string;
  photographerName: string;
  projectName: string;
  projectStatus: ProjectStatus;
  eventDate: Date;
  coverImage?: string;
  personAName: { firstName: string; lastName: string };
  personBName: { firstName: string; lastName: string };
  email: string;
  phone: string;
  cachedProjectDashboard: boolean;
  clientPortalStatus: ClientPortalStatus;
  clientPortalId?: string;
  createdAt: Date;
  updatedAt?: Date;
}): BaseProject => ({
  id: nested.id,
  userId: nested.userId,
  photographerName: nested.photographerName,
  projectName: nested.projectName,
  projectStatus: nested.projectStatus,
  eventDate: nested.eventDate,
  coverImage: nested.coverImage,
  personAName: { firstName: nested.personAName.firstName, lastName: nested.personAName.lastName },
  personBName: { firstName: nested.personBName.firstName, lastName: nested.personBName.lastName },
  email: nested.email,
  phone: nested.phone,
  cachedProjectDashboard: nested.cachedProjectDashboard ?? DEFAULTS.DISABLED,
  clientPortalStatus: nested.clientPortalStatus,
  clientPortalId: nested.clientPortalId,
  createdAt: nested.createdAt,
  updatedAt: nested.updatedAt,
});
