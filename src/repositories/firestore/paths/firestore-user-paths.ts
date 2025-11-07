/**
 * ============================================================================
 * FIRESTORE PATH HELPERS
 * ============================================================================
 */

export const USER_PATHS = {
  BASE: (userId: string) => `users/${userId}`,
  PROFILE: (userId: string) => `users/${userId}/profile`,
  PROFILE_DOC: (userId: string, profileId: string) => `users/${userId}/profile/${profileId}`,
  PREFERENCES: (userId: string) => `users/${userId}/preferences`,
  PREFERENCES_DOC: (userId: string, preferencesId: string) =>
    `users/${userId}/preferences/${preferencesId}`,
  CUSTOMIZATIONS: (userId: string) => `users/${userId}/customizations`,
  CUSTOMIZATIONS_DOC: (userId: string, customizationsId: string) =>
    `users/${userId}/customizations/${customizationsId}`,
  SUBSCRIPTION: (userId: string) => `users/${userId}/subscription`,
  SUBSCRIPTION_DOC: (userId: string, subscriptionId: string) =>
    `users/${userId}/subscription/${subscriptionId}`,
  SETUP: (userId: string) => `users/${userId}/setup`,
  SETUP_DOC: (userId: string, setupId: string) => `users/${userId}/setup/${setupId}`,
  PROJECTS: (userId: string) => `users/${userId}/projects`,
  PROJECTS_DOC: (userId: string, projectsId: string) => `users/${userId}/projects/${projectsId}`,
  VENDORS: (userId: string) => `users/${userId}/vendors`,
  VENDORS_DATA: (userId: string) => `users/${userId}/vendors/data`,
} as const;
