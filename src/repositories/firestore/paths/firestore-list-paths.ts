/**
 * ============================================================================
 * FIRESTORE PATH HELPERS
 * ============================================================================
 */

export const MASTER_LIST_PATHS = {
  KIT: ['masterData', 'kit'] as const,
  TASK: ['masterData', 'task'] as const,
  GROUP_SHOTS: ['masterData', 'groupShots'] as const,
  COUPLE_SHOTS: ['masterData', 'coupleShots'] as const,
} as const;

export const USER_LIST_PATHS = {
  KIT: (userId: string) => ['users', userId, 'lists', 'kitList'] as const,
  TASK: (userId: string) => ['users', userId, 'lists', 'taskList'] as const,
  GROUP_SHOTS: (userId: string) => ['users', userId, 'lists', 'groupShots'] as const,
  COUPLE_SHOTS: (userId: string) => ['users', userId, 'lists', 'coupleShots'] as const,
  NOTES: (userId: string) => ['users', userId, 'lists', 'notes'] as const,
  VENDORS: (userId: string) => ['users', userId, 'lists', 'vendors'] as const,
  TAGS: (userId: string) => ['users', userId, 'lists', 'tags'] as const,
} as const;

export const PROJECT_LIST_PATHS = {
  KIT: (projectId: string) => ['projects', projectId, 'lists', 'kitList'] as const,
  TASK: (projectId: string) => ['projects', projectId, 'lists', 'taskList'] as const,
  GROUP_SHOTS: (projectId: string) => ['projects', projectId, 'lists', 'groupShots'] as const,
  COUPLE_SHOTS: (projectId: string) => ['projects', projectId, 'lists', 'coupleShots'] as const,
  NOTES: (projectId: string) => ['projects', projectId, 'lists', 'notes'] as const,
  VENDORS: (projectId: string) => ['projects', projectId, 'lists', 'vendors'] as const,
  TAGS: (projectId: string) => ['projects', projectId, 'lists', 'tags'] as const,
  PHOTO_REQUEST: (projectId: string) => ['projects', projectId, 'lists', 'photoRequests'] as const,
  KEY_PEOPLE: (projectId: string) => ['projects', projectId, 'lists', 'keyPeople'] as const,
} as const;
