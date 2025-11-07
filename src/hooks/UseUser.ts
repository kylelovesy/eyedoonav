/*---------------------------------------
File: src/hooks/Use-User.ts
Description: Composite React hook for managing all user-related data
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { useBaseUser } from './use-base-user';
import { useUserProfile } from './use-user-profile';
import { useUserPreferences } from './use-user.preferences';
import { useUserCustomizations } from './use-user-customizations';
import { useUserSubscription } from './use-user-subscription';
import { useUserSetup } from './use-user-setup';
import { useUserProjects } from './use-user-projects';
import { ServiceFactory } from '@/services/ServiceFactory';
import { AppError } from '@/domain/common/errors';

interface UseUserCompleteOptions {
  /**
   * Enable real-time updates for base user (✅ RECOMMENDED - always active after login)
   * @default true
   */
  enableRealtimeBase?: boolean;

  /**
   * Enable real-time updates for subscription (✅ RECOMMENDED - needed for plan gating, feature unlocks)
   * @default true
   */
  enableRealtimeSubscription?: boolean;

  /**
   * Enable real-time updates for projects (✅ RECOMMENDED - needed for dashboard and progress stats, active project only)
   * @default true
   */
  enableRealtimeProjects?: boolean;

  /**
   * Enable real-time updates for preferences (⚙️ OPTIONAL - only if instant UI reflection needed, e.g., darkMode toggle)
   * @default false
   */
  enableRealtimePreferences?: boolean;

  /**
   * Enable temporary real-time listener for setup (⚙️ OPTIONAL - use during onboarding/setup flow; remove afterward)
   * @default false
   */
  enableTemporarySetupListener?: boolean;

  /**
   * Auto-fetch all user data on mount
   * @default true
   */
  autoFetch?: boolean;
}

interface UseUserCompleteResult {
  // Individual hook results
  baseUser: ReturnType<typeof useBaseUser>;
  profile: ReturnType<typeof useUserProfile>;
  preferences: ReturnType<typeof useUserPreferences>;
  customizations: ReturnType<typeof useUserCustomizations>;
  subscription: ReturnType<typeof useUserSubscription>;
  setup: ReturnType<typeof useUserSetup>;
  projects: ReturnType<typeof useUserProjects>;

  // Combined states
  /**
   * True if any hook is currently loading
   */
  loading: boolean;

  /**
   * First error encountered, or null if all hooks are successful
   */
  error: AppError | null;

  /**
   * True if all hooks have successfully loaded their data
   */
  allLoaded: boolean;

  /**
   * Refresh all user data
   */
  refreshAll: () => Promise<void>;

  /**
   * Clear all errors
   */
  clearAllErrors: () => void;
}

/**
 * Composite hook for managing all user-related data
 * Combines all individual user hooks into a single convenient interface
 *
 * @param userId - The ID of the user to manage
 * @param options - Configuration options for real-time updates and auto-fetching
 * @returns Object with all user data, combined states, and convenience methods
 *
 * @example
 * ```typescript
 * const { baseUser, profile, preferences, subscription, loading, error } = useUserComplete(userId, {
 *   enableRealtimeBase: true,
 *   enableRealtimeSubscription: true,
 *   enableRealtimeProjects: true,
 * });
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return (
 *   <View>
 *     <Text>Welcome, {baseUser.user?.displayName}</Text>
 *     <Text>Plan: {subscription.subscription?.plan}</Text>
 *   </View>
 * );
 * ```
 */
export function useUserComplete(
  userId: string | null,
  options: UseUserCompleteOptions = {},
): UseUserCompleteResult {
  const {
    enableRealtimeBase = true,
    enableRealtimeSubscription = true,
    enableRealtimeProjects = true,
    enableRealtimePreferences = false,
    enableTemporarySetupListener = false,
    autoFetch = true,
  } = options;

  // Initialize all individual hooks
  const baseUser = useBaseUser(userId, ServiceFactory.baseUser, {
    autoFetch,
    enableRealtime: enableRealtimeBase,
  });

  const profile = useUserProfile(userId, ServiceFactory.userProfile, {
    autoFetch,
  });

  const preferences = useUserPreferences(userId, ServiceFactory.userPreferences, {
    autoFetch,
    enableRealtime: enableRealtimePreferences,
  });

  const customizations = useUserCustomizations(userId, ServiceFactory.userCustomizations, {
    autoFetch,
  });

  const subscription = useUserSubscription(userId, ServiceFactory.userSubscription, {
    autoFetch,
    enableRealtime: enableRealtimeSubscription,
  });

  const setup = useUserSetup(userId, ServiceFactory.userSetup, {
    autoFetch,
    enableTemporaryListener: enableTemporarySetupListener,
  });

  const projects = useUserProjects(userId, ServiceFactory.userProjects, {
    autoFetch,
    enableRealtime: enableRealtimeProjects,
  });

  // Combined loading state - true if any hook is loading
  const loading =
    baseUser.loading ||
    profile.loading ||
    preferences.loading ||
    customizations.loading ||
    subscription.loading ||
    setup.loading ||
    projects.loading;

  // Combined error state - return first error encountered
  const error =
    baseUser.error ||
    profile.error ||
    preferences.error ||
    customizations.error ||
    subscription.error ||
    setup.error ||
    projects.error ||
    null;

  // Check if all hooks have successfully loaded their data
  const allLoaded =
    !loading &&
    baseUser.user !== null &&
    profile.profile !== null &&
    preferences.preferences !== null &&
    customizations.customizations !== null &&
    subscription.subscription !== null &&
    setup.setup !== null &&
    projects.projects !== null;

  // Refresh all user data
  const refreshAll = async () => {
    await Promise.all([
      baseUser.refresh(),
      profile.refresh(),
      preferences.refresh(),
      customizations.refresh(),
      subscription.refresh(),
      setup.refresh(),
      projects.refresh(),
    ]);
  };

  // Clear all errors
  const clearAllErrors = () => {
    baseUser.clearError();
    profile.clearError();
    preferences.clearError();
    customizations.clearError();
    subscription.clearError();
    setup.clearError();
    projects.clearError();
  };

  return {
    baseUser,
    profile,
    preferences,
    customizations,
    subscription,
    setup,
    projects,
    loading,
    error,
    allLoaded,
    refreshAll,
    clearAllErrors,
  };
}
