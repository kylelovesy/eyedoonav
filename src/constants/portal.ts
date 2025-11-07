/*---------------------------------------
File: src/constants/portal.ts
Description: Portal constants for the Eye-Doo application.

Author: Kyle Lovesy
Date: 29/10-2025 - 11.00
Version: 1.1.0
---------------------------------------*/

import { ActionOn, PortalStepID, SectionStatus } from '@/constants/enums';
import { PortalStep } from '@/domain/project/portal.schema';

/**
 * Default portal steps for the Eye-Doo application.
 * @returns A record of portal steps with their ID, title, number, icon, status, required step, and action on.
 */
export const DEFAULT_PORTAL_STEPS: Record<string, PortalStep> = {
  KEY_PEOPLE: {
    portalStepID: PortalStepID.KEY_PEOPLE,
    stepTitle: 'Key People',
    stepNumber: 1,
    stepIcon: '/icons/key-people-section.svg',
    stepStatus: SectionStatus.UNLOCKED,
    requiredStep: false,
    actionOn: ActionOn.CLIENT,
  },
  LOCATIONS: {
    portalStepID: PortalStepID.LOCATIONS,
    stepTitle: 'Locations',
    stepNumber: 2,
    stepIcon: '/icons/locations-section.svg',
    stepStatus: SectionStatus.UNLOCKED,
    requiredStep: true,
    actionOn: ActionOn.CLIENT,
  },
  GROUP_SHOTS: {
    portalStepID: PortalStepID.GROUP_SHOTS,
    stepTitle: 'Group Shots',
    stepNumber: 3,
    stepIcon: '/icons/group-shots-section.svg',
    stepStatus: SectionStatus.UNLOCKED,
    requiredStep: true,
    actionOn: ActionOn.CLIENT,
  },
  PHOTO_REQUESTS: {
    portalStepID: PortalStepID.PHOTO_REQUESTS,
    stepTitle: 'Photo Requests',
    stepNumber: 4,
    stepIcon: '/icons/photo-requests-section.svg',
    stepStatus: SectionStatus.UNLOCKED,
    requiredStep: false,
    actionOn: ActionOn.CLIENT,
  },
  TIMELINE: {
    portalStepID: PortalStepID.TIMELINE,
    stepTitle: 'Timeline',
    stepNumber: 5,
    stepIcon: '/icons/timeline-section.svg',
    stepStatus: SectionStatus.UNLOCKED,
    requiredStep: true,
    actionOn: ActionOn.CLIENT,
  },
};

/**
 * Portal step descriptions for the Eye-Doo application.
 * @returns A record of portal step descriptions with their ID and description.
 */
// export const PORTAL_STEP_DESCRIPTIONS: Record<PortalStepID, string> = {
//   [PortalStepID.KEY_PEOPLE]: 'Important people',
//   [PortalStepID.LOCATIONS]: 'Venue and location details',
//   [PortalStepID.GROUP_SHOTS]: 'Group photo combinations',
//   [PortalStepID.PHOTO_REQUESTS]: 'Specific photo requests',
//   [PortalStepID.TIMELINE]: 'Detailed timeline for the event',
//   [PortalStepID.WELCOME]: 'Welcome to the portal',
// };

/**
 * Portal step display information for the Eye-Doo application.
 * @returns A record of portal step display information with their ID, description, and estimated time.
 */
// export const PORTAL_STEP_DISPLAY_INFO: Record<PortalStepID, { description: string; estimatedTime: string }> = {
//   [PortalStepID.KEY_PEOPLE]: {
//     description: 'Help us identify the important people in your life',
//     estimatedTime: '5-10 minutes',
//   },
//   [PortalStepID.LOCATIONS]: {
//     description: 'Share details about your venue and photo locations',
//     estimatedTime: '5-15 minutes',
//   },
//   [PortalStepID.GROUP_SHOTS]: {
//     description: 'Plan your group photo combinations',
//     estimatedTime: '10-20 minutes',
//   },
//   [PortalStepID.PHOTO_REQUESTS]: {
//     description: 'Tell us about specific shots you want captured',
//     estimatedTime: '5-15 minutes',
//   },
//   [PortalStepID.TIMELINE]: {
//     description: 'Build your event timeline together',
//     estimatedTime: '15-30 minutes',
//   },
//   [PortalStepID.WELCOME]: {
//     description: 'Welcome to the portal',
//     estimatedTime: '0-5 minutes',
//   },
// };
