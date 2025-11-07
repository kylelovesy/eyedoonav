/**
 * ============================================================================
 * FIRESTORE PROJECT PATH HELPERS
 * ============================================================================
 */

export const PROJECT_PATHS = {
  BASE: (projectId: string) => `projects/${projectId}`,
  KIT_LIST: (projectId: string) => `projects/${projectId}/lists/kitList`,
  TASK_LIST: (projectId: string) => `projects/${projectId}/lists/taskList`,
  GROUP_SHOTS_LIST: (projectId: string) => `projects/${projectId}/lists/groupShots`,
  COUPLE_SHOTS_LIST: (projectId: string) => `projects/${projectId}/lists/coupleShots`,
  LOCATIONS: (projectId: string) => `projects/${projectId}/locations`,
  TIMELINE: (projectId: string) => `projects/${projectId}/timeline`,
  VENDORS: (projectId: string) => `projects/${projectId}/vendors`,
  VENDORS_DATA: (projectId: string) => `projects/${projectId}/vendors/data`,
} as const;
