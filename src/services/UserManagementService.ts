/*---------------------------------------
File: src/services/UserManagementService.ts
Description: Composite service for coordinating all user-related operations
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, err, ok } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import {
  BaseUser,
  BaseUserCreate,
  UserWithSubcollections,
  UserProfile,
  UserProfileCreate,
  UserPreferences,
  UserPreferencesCreate,
  UserCustomizations,
  UserCustomizationsCreate,
  UserSubscription,
  UserSubscriptionCreate,
  UserSetup,
  UserSetupCreate,
  UserProjects,
  UserProjectsCreate,
  defaultUserProfile,
  defaultUserPreferences,
  defaultUserCustomizations,
  defaultUserSubscription,
  defaultUserSetup,
  defaultUserProjects,
} from '@/domain/user/user.schema';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { ErrorMapper } from '@/utils/error-mapper';
import { BaseUserService } from './base-user-service';
import { UserProfileService } from './user-profile-service';
import { UserPreferencesService } from './user-preferences-service';
import { UserCustomizationsService } from './user-customizations-service';
import { UserSubscriptionService } from './user-subscription-service';
import { UserSetupService } from './user-setup-service';
import { UserProjectsService } from './user-projects-service';

/**
 * Composite service for coordinating all user-related operations
 * Orchestrates multiple user services to provide high-level operations
 */
export class UserManagementService {
  private readonly context = 'UserManagementService';

  constructor(
    private baseUserService: BaseUserService,
    private profileService: UserProfileService,
    private preferencesService: UserPreferencesService,
    private customizationsService: UserCustomizationsService,
    private subscriptionService: UserSubscriptionService,
    private setupService: UserSetupService,
    private projectsService: UserProjectsService,
  ) {}

  /**
   * Creates a complete user with all subcollections
   * Creates base user document and initializes all subcollections with defaults
   *
   * @param userId - The user ID from authentication
   * @param baseData - Base user document data
   * @param profileData - Optional profile data (uses defaults if not provided)
   * @param preferencesData - Optional preferences data (uses defaults if not provided)
   * @param customizationsData - Optional customizations data (uses defaults if not provided)
   * @param subscriptionData - Optional subscription data (uses defaults if not provided)
   * @param setupData - Optional setup data (uses defaults if not provided)
   * @param projectsData - Optional projects data (uses defaults if not provided)
   * @returns Result containing complete user data or error
   *
   * @example
   * ```typescript
   * const result = await userManagementService.createCompleteUser(
   *   userId,
   *   { id: userId, email: 'user@example.com' },
   *   { userId, name: { firstName: 'John', lastName: 'Doe' } },
   * );
   *
   * if (result.success) {
   *   console.log('User created:', result.value);
   * }
   * ```
   */
  async createCompleteUser(
    userId: string,
    baseData: BaseUserCreate,
    profileData?: UserProfileCreate,
    preferencesData?: UserPreferencesCreate,
    customizationsData?: UserCustomizationsCreate,
    subscriptionData?: UserSubscriptionCreate,
    setupData?: UserSetupCreate,
    projectsData?: UserProjectsCreate,
  ): Promise<Result<UserWithSubcollections, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'createCompleteUser',
      userId,
      undefined,
      { operation: 'create-complete-user' },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Create base user document (required)
    const baseResult = await this.baseUserService.create(userId, baseData);
    if (!baseResult.success) {
      return err(baseResult.error);
    }

    const baseUser = baseResult.value;

    // 2. Initialize all subcollections in parallel with defaults or provided data
    const subcollectionResults = await Promise.all([
      // Profile
      this.profileService.create(
        userId,
        profileData || {
          ...defaultUserProfile(userId),
          userId,
        },
      ),
      // Preferences
      this.preferencesService.create(
        userId,
        preferencesData || {
          ...defaultUserPreferences(userId),
          userId,
        },
      ),
      // Customizations
      this.customizationsService.create(
        userId,
        customizationsData || {
          ...defaultUserCustomizations(userId),
          userId,
        },
      ),
      // Subscription
      this.subscriptionService.create(
        userId,
        subscriptionData || {
          ...defaultUserSubscription(userId),
          userId,
          startDate: new Date(),
        },
      ),
      // Setup
      this.setupService.create(
        userId,
        setupData || {
          ...defaultUserSetup(userId),
          userId,
        },
      ),
      // Projects
      this.projectsService.create(
        userId,
        projectsData || {
          ...defaultUserProjects(userId),
          userId,
        },
      ),
    ]);

    // 3. Collect failures
    const failures = subcollectionResults
      .map((result, index) => {
        if (!result.success) {
          const operationNames = [
            'profile',
            'preferences',
            'customizations',
            'subscription',
            'setup',
            'projects',
          ];
          return {
            operation: operationNames[index],
            error: result.error,
          };
        }
        return null;
      })
      .filter((f): f is { operation: string; error: AppError } => f !== null);

    // 4. If any subcollections failed, return aggregated error
    if (failures.length > 0) {
      const successCount = subcollectionResults.length - failures.length;

      return err(
        ErrorMapper.createAggregatedError(
          ErrorCode.DB_WRITE_ERROR,
          `Failed to initialize ${failures.length} subcollection(s)`,
          'User created but some features may not be available.',
          contextString,
          failures,
          successCount,
        ),
      );
    }

    // 5. Fetch all created data to return complete user
    const fetchResults = await Promise.all([
      this.profileService.getByUserId(userId),
      this.preferencesService.getByUserId(userId),
      this.customizationsService.getByUserId(userId),
      this.subscriptionService.getByUserId(userId),
      this.setupService.getByUserId(userId),
      this.projectsService.getByUserId(userId),
    ]);

    // 6. Check if any fetch failed (shouldn't happen, but handle gracefully)
    const fetchFailures = fetchResults.filter(r => !r.success);
    if (fetchFailures.length > 0) {
      // Base user exists, but we couldn't fetch some subcollections
      // Return partial data with aggregated error
      const operationNames = [
        'profile',
        'preferences',
        'customizations',
        'subscription',
        'setup',
        'projects',
      ];
      const fetchErrors = fetchResults
        .map((result, index) => {
          if (!result.success) {
            return {
              operation: `fetch-${operationNames[index]}`,
              error: result.error,
            };
          }
          return null;
        })
        .filter((f): f is { operation: string; error: AppError } => f !== null);

      const successCount = fetchResults.length - fetchFailures.length;

      // Return partial data
      const [profile, preferences, customizations, subscription, setup, projects] =
        fetchResults.map(r => (r.success ? r.value : undefined));

      return err(
        ErrorMapper.createAggregatedError(
          ErrorCode.DB_READ_ERROR,
          `Failed to fetch ${fetchFailures.length} subcollection(s)`,
          'User created but some data could not be retrieved.',
          contextString,
          fetchErrors,
          successCount,
        ),
      );
    }

    // 7. Combine all data into complete user object
    // All fetch results succeeded at this point, so we can safely access .value
    const [profile, preferences, customizations, subscription, setup, projects] = fetchResults.map(
      r => (r.success ? r.value : undefined),
    );

    const completeUser: UserWithSubcollections = {
      ...baseUser,
      profile: profile as UserProfile,
      preferences: preferences as UserPreferences,
      customizations: customizations as UserCustomizations,
      subscription: subscription as UserSubscription,
      setup: setup as UserSetup,
      projects: projects as UserProjects,
    };

    return ok(completeUser);
  }

  /**
   * Gets complete user data including all subcollections
   * Fetches base user and all subcollections in parallel
   *
   * @param userId - The user ID
   * @returns Result containing complete user data or error
   *
   * @example
   * ```typescript
   * const result = await userManagementService.getUserComplete(userId);
   *
   * if (result.success) {
   *   console.log('User data:', result.value);
   *   console.log('Profile:', result.value.profile);
   *   console.log('Preferences:', result.value.preferences);
   * }
   * ```
   */
  async getUserComplete(userId: string): Promise<Result<UserWithSubcollections, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'getUserComplete',
      userId,
      undefined,
      { operation: 'get-complete-user' },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Fetch all user data in parallel
    const [base, profile, preferences, customizations, subscription, setup, projects] =
      await Promise.all([
        this.baseUserService.getById(userId),
        this.profileService.getByUserId(userId),
        this.preferencesService.getByUserId(userId),
        this.customizationsService.getByUserId(userId),
        this.subscriptionService.getByUserId(userId),
        this.setupService.getByUserId(userId),
        this.projectsService.getByUserId(userId),
      ]);

    // Check if base user exists (required)
    if (!base.success) {
      return err(base.error);
    }

    // Collect failures for subcollections (optional - may not exist)
    const results = [profile, preferences, customizations, subscription, setup, projects];
    const operationNames = [
      'profile',
      'preferences',
      'customizations',
      'subscription',
      'setup',
      'projects',
    ];

    const failures = results
      .map((result, index) => {
        if (!result.success) {
          // Check if it's a "not found" error - this is acceptable for optional subcollections
          // But log other errors
          if (result.error.code !== ErrorCode.DB_NOT_FOUND) {
            return {
              operation: operationNames[index],
              error: result.error,
            };
          }
        }
        return null;
      })
      .filter((f): f is { operation: string; error: AppError } => f !== null);

    // If critical errors occurred (not just missing subcollections), return aggregated error
    if (failures.length > 0) {
      const successCount = results.filter(r => r.success).length;

      return err(
        ErrorMapper.createAggregatedError(
          ErrorCode.DB_READ_ERROR,
          `Failed to fetch ${failures.length} subcollection(s)`,
          'Some user data could not be retrieved.',
          contextString,
          failures,
          successCount,
        ),
      );
    }

    // Combine all data into complete user object
    // Subcollections that don't exist will be undefined (which is fine)
    const completeUser: UserWithSubcollections = {
      ...base.value,
      profile: profile.success ? profile.value : undefined,
      preferences: preferences.success ? preferences.value : undefined,
      customizations: customizations.success ? customizations.value : undefined,
      subscription: subscription.success ? subscription.value : undefined,
      setup: setup.success ? setup.value : undefined,
      projects: projects.success ? projects.value : undefined,
    };

    return ok(completeUser);
  }
}
