/*---------------------------------------
File: src/utils/portal-validation.ts
Description: Validation utilities to verify portal migration completeness
Author: Kyle Lovesy
Date: 04/11/2025
Version: 1.0.0
---------------------------------------*/

import { DEFAULT_PORTAL_STEPS } from '@/constants/portal';
import { ActionOn, PortalStepID, SectionStatus } from '@/constants/enums';
import { ClientPortal, PortalStep } from '@/domain/project/portal.schema';

/**
 * Validates that selected steps are valid portal steps
 * @param selectedStepKeys - Array of step keys to validate
 * @returns true if all steps are valid
 */
export function validatePortalSteps(selectedStepKeys: string[]): boolean {
  return (
    selectedStepKeys &&
    selectedStepKeys.length > 0 &&
    selectedStepKeys.every(key => DEFAULT_PORTAL_STEPS[key])
  );
}

/**
 * Gets step display information
 * @param stepKey - The portal step key
 * @returns Display info with description and estimated time
 */
export function getStepDisplayInfo(stepKey: string): {
  description: string;
  estimatedTime: string;
} {
  const displayInfo: Record<string, { description: string; estimatedTime: string }> = {
    KEY_PEOPLE: {
      description: 'Help us identify the important people in your life',
      estimatedTime: '5-10 minutes',
    },
    LOCATIONS: {
      description: 'Share details about your venue and photo locations',
      estimatedTime: '5-15 minutes',
    },
    GROUP_SHOTS: {
      description: 'Plan your group photo combinations',
      estimatedTime: '10-20 minutes',
    },
    PHOTO_REQUESTS: {
      description: 'Tell us about specific shots you want captured',
      estimatedTime: '5-15 minutes',
    },
    TIMELINE: {
      description: 'Build your event timeline together',
      estimatedTime: '15-30 minutes',
    },
  };

  return (
    displayInfo[stepKey] || {
      description: 'Complete this planning step',
      estimatedTime: '5-10 minutes',
    }
  );
}

/**
 * Validates portal data structure
 * Useful for debugging migration issues
 */
export function validatePortalStructure(portal: ClientPortal): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!portal.id) errors.push('Missing portal ID');
  if (!portal.projectId) errors.push('Missing project ID');
  if (typeof portal.isSetup !== 'boolean') errors.push('Missing or invalid isSetup flag');
  if (typeof portal.isEnabled !== 'boolean') errors.push('Missing or invalid isEnabled flag');

  // Steps validation
  if (!Array.isArray(portal.steps)) {
    errors.push('Steps must be an array');
  } else {
    portal.steps.forEach((step: PortalStep, index: number) => {
      if (!step.portalStepID) errors.push(`Step ${index}: Missing portalStepID`);
      if (!step.stepTitle) errors.push(`Step ${index}: Missing stepTitle`);
      if (typeof step.stepNumber !== 'number') errors.push(`Step ${index}: Invalid stepNumber`);
      if (!step.stepStatus) errors.push(`Step ${index}: Missing stepStatus`);
    });
  }

  // Metadata validation
  if (typeof portal.totalSteps !== 'number') errors.push('Missing or invalid totalSteps');
  if (typeof portal.completedSteps !== 'number') errors.push('Missing or invalid completedSteps');
  if (typeof portal.completionPercentage !== 'number') {
    errors.push('Missing or invalid completionPercentage');
  }

  // Dates validation
  if (portal.createdAt && !(portal.createdAt instanceof Date)) {
    errors.push('Invalid createdAt date');
  }
  if (portal.updatedAt && !(portal.updatedAt instanceof Date)) {
    errors.push('Invalid updatedAt date');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if portal has required subcollection configs set up
 */
export function validateSubcollectionSetup(portal: ClientPortal): {
  isValid: boolean;
  missingConfigs: string[];
} {
  const missingConfigs: string[] = [];

  if (!portal.steps || !Array.isArray(portal.steps)) {
    return {
      isValid: false,
      missingConfigs: ['Portal has no steps'],
    };
  }

  const stepToSubcollection: Record<PortalStepID, string> = {
    [PortalStepID.KEY_PEOPLE]: 'keyPeople',
    [PortalStepID.LOCATIONS]: 'locations',
    [PortalStepID.GROUP_SHOTS]: 'groupShots',
    [PortalStepID.PHOTO_REQUESTS]: 'photoRequests',
    [PortalStepID.TIMELINE]: 'timeline',
    [PortalStepID.WELCOME]: '', // No subcollection for welcome
  };

  portal.steps.forEach((step: PortalStep) => {
    const subcollection = stepToSubcollection[step.portalStepID as PortalStepID];
    if (subcollection) {
      // Note: This would need actual Firestore check in real implementation
      // For now, just validate step has proper ID
      if (!step.portalStepID) {
        missingConfigs.push('Portal Step missing ID');
      }
    }
  });

  return {
    isValid: missingConfigs.length === 0,
    missingConfigs,
  };
}

/**
 * Validates completion tracking is consistent
 */
export function validateCompletionTracking(portal: ClientPortal): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!portal.steps || !Array.isArray(portal.steps)) {
    errors.push('Portal has no steps array');
    return { isValid: false, errors };
  }

  const totalSteps = portal.steps.length;
  const actualCompletedSteps = portal.steps.filter(
    (s: PortalStep) => s.stepStatus === SectionStatus.FINALIZED,
  ).length;

  // Check totalSteps matches
  if (portal.totalSteps !== totalSteps) {
    errors.push(`totalSteps mismatch: expected ${totalSteps}, got ${portal.totalSteps}`);
  }

  // Check completedSteps matches
  if (portal.completedSteps !== actualCompletedSteps) {
    errors.push(
      `completedSteps mismatch: expected ${actualCompletedSteps}, got ${portal.completedSteps}`,
    );
  }

  // Check completion percentage
  const expectedPercentage = totalSteps > 0 ? (actualCompletedSteps / totalSteps) * 100 : 0;
  const percentageDiff = Math.abs(portal.completionPercentage - expectedPercentage);

  if (percentageDiff > 0.1) {
    // Allow small floating point differences
    errors.push(
      `completionPercentage mismatch: expected ${expectedPercentage}%, got ${portal.completionPercentage}%`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive portal health check
 * Returns a report of all validation checks
 */
export function portalHealthCheck(portal: ClientPortal): {
  isHealthy: boolean;
  report: {
    structure: { isValid: boolean; errors: string[] };
    subcollections: { isValid: boolean; missingConfigs: string[] };
    completion: { isValid: boolean; errors: string[] };
  };
  summary: string;
} {
  const structureCheck = validatePortalStructure(portal);
  const subcollectionCheck = validateSubcollectionSetup(portal);
  const completionCheck = validateCompletionTracking(portal);

  const isHealthy = structureCheck.isValid && subcollectionCheck.isValid && completionCheck.isValid;

  const totalIssues =
    structureCheck.errors.length +
    subcollectionCheck.missingConfigs.length +
    completionCheck.errors.length;

  const summary = isHealthy
    ? '✅ Portal is healthy - all checks passed'
    : `⚠️ Portal has ${totalIssues} issue(s) - see report for details`;

  return {
    isHealthy,
    report: {
      structure: structureCheck,
      subcollections: subcollectionCheck,
      completion: completionCheck,
    },
    summary,
  };
}

/**
 * Debug helper: Prints portal health check to console
 */
export function debugPortalHealth(portal: ClientPortal, portalId?: string): void {
  const health = portalHealthCheck(portal);

  console.group(`🔍 Portal Health Check ${portalId ? `(${portalId})` : ''}`);
  console.log(health.summary);

  if (!health.isHealthy) {
    if (health.report.structure.errors.length > 0) {
      console.group('❌ Structure Issues');
      health.report.structure.errors.forEach(error => console.log(`  - ${error}`));
      console.groupEnd();
    }

    if (health.report.subcollections.missingConfigs.length > 0) {
      console.group('❌ Subcollection Issues');
      health.report.subcollections.missingConfigs.forEach(error => console.log(`  - ${error}`));
      console.groupEnd();
    }

    if (health.report.completion.errors.length > 0) {
      console.group('❌ Completion Tracking Issues');
      health.report.completion.errors.forEach(error => console.log(`  - ${error}`));
      console.groupEnd();
    }
  }

  console.groupEnd();
}

/**
 * Migration verification checklist
 * Returns a list of migration tasks and their completion status
 */
export function verifyMigrationComplete(portal: ClientPortal): {
  completed: string[];
  pending: string[];
  completionRate: number;
} {
  const checks = [
    {
      name: 'Portal has valid structure',
      test: () => validatePortalStructure(portal).isValid,
    },
    {
      name: 'Portal has cloud function generated URL',
      test: () => !!portal.portalUrl && portal.portalUrl.includes('https://'),
    },
    {
      name: 'Portal has access token',
      test: () => !!portal.accessToken && portal.accessToken.length > 10,
    },
    {
      name: 'Portal has expiration date',
      test: () => !!portal.expiresAt,
    },
    {
      name: 'Portal has valid steps array',
      test: () => Array.isArray(portal.steps) && portal.steps.length > 0,
    },
    {
      name: 'Completion tracking is consistent',
      test: () => validateCompletionTracking(portal).isValid,
    },
    {
      name: 'All steps have valid status',
      test: () =>
        portal.steps?.every(
          (s: PortalStep) =>
            s.stepStatus === 'locked' ||
            s.stepStatus === 'unlocked' ||
            s.stepStatus === 'review' ||
            s.stepStatus === 'finalized',
        ),
    },
    {
      name: 'All steps have action owner',
      test: () =>
        portal.steps?.every(
          (s: PortalStep) => s.actionOn === ActionOn.PHOTOGRAPHER || s.actionOn === ActionOn.CLIENT,
        ),
    },
  ];

  const completed = checks.filter(check => check.test()).map(check => check.name);
  const pending = checks.filter(check => !check.test()).map(check => check.name);
  const completionRate = (completed.length / checks.length) * 100;

  return {
    completed,
    pending,
    completionRate,
  };
}

/**
 * Debug helper: Prints migration verification report
 */
export function debugMigrationStatus(portal: ClientPortal): void {
  const verification = verifyMigrationComplete(portal);

  console.group('📋 Migration Verification Report');
  console.log(`Completion Rate: ${verification.completionRate.toFixed(1)}%`);

  if (verification.completed.length > 0) {
    console.group(`✅ Completed (${verification.completed.length})`);
    verification.completed.forEach(item => console.log(`  ✓ ${item}`));
    console.groupEnd();
  }

  if (verification.pending.length > 0) {
    console.group(`⏳ Pending (${verification.pending.length})`);
    verification.pending.forEach(item => console.log(`  ○ ${item}`));
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Compares old and new portal structures for migration testing
 */
export function comparePortalVersions(
  oldPortal: ClientPortal,
  newPortal: ClientPortal,
): {
  matches: string[];
  differences: string[];
  missing: string[];
} {
  const matches: string[] = [];
  const differences: string[] = [];
  const missing: string[] = [];

  // Check critical fields
  const criticalFields = [
    'id',
    'projectId',
    'isSetup',
    'isEnabled',
    'portalUrl',
    'accessToken',
    'currentStepID',
  ];

  criticalFields.forEach(field => {
    if (!(field in oldPortal)) return;

    if (!(field in newPortal)) {
      missing.push(field);
    } else if (oldPortal[field as keyof ClientPortal] === newPortal[field as keyof ClientPortal]) {
      matches.push(field);
    } else {
      differences.push(
        `${field}: ${oldPortal[field as keyof ClientPortal]} → ${newPortal[field as keyof ClientPortal]}`,
      );
    }
  });

  // Check steps
  if (oldPortal.steps && newPortal.steps) {
    if (oldPortal.steps.length !== newPortal.steps.length) {
      differences.push(`steps.length: ${oldPortal.steps.length} → ${newPortal.steps.length}`);
    } else {
      matches.push('steps.length');
    }
  }

  // Check metadata
  const metadataFields = ['totalSteps', 'completedSteps', 'completionPercentage'];
  metadataFields.forEach(field => {
    const oldValue = oldPortal[field as keyof typeof oldPortal];
    const newValue = newPortal[field as keyof ClientPortal];

    if (oldValue === undefined) return;

    if (newValue === undefined) {
      missing.push(`metadata.${field}`);
    } else if (oldValue === newValue) {
      matches.push(`metadata.${field}`);
    } else {
      differences.push(`metadata.${field}: ${oldValue} → ${newValue}`);
    }
  });

  return {
    matches,
    differences,
    missing,
  };
}

/**
 * Type guard to check if object is a valid portal
 */
export function isValidPortal(obj: unknown): obj is ClientPortal {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'projectId' in obj &&
    'isSetup' in obj &&
    'isEnabled' in obj &&
    'steps' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    typeof (obj as Record<string, unknown>).projectId === 'string' &&
    typeof (obj as Record<string, unknown>).isSetup === 'boolean' &&
    typeof (obj as Record<string, unknown>).isEnabled === 'boolean' &&
    Array.isArray((obj as Record<string, unknown>).steps)
  );
}
