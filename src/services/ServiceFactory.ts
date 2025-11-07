/*---------------------------------------
File: src/services/ServiceFactory.ts
Description: Centralized dependency injection for all services (updated for generic list pattern)
Author: Kyle Lovesy
Date: 06/11-2025
Version: 2.1.0
---------------------------------------*/

// Services
import { AuthService } from './auth-service';

import { BaseUserService } from './base-user-service';
import { UserProfileService } from './user-profile-service';
import { UserPreferencesService } from './user-preferences-service';
import { UserSubscriptionService } from './user-subscription-service';
import { UserSetupService } from './user-setup-service';
import { UserProjectsService } from './user-projects-service';
import { UserCustomizationsService } from './user-customizations-service';

import { KitListService } from './kit-list-service';
import { TaskListService } from './task-list-service';
import { CoupleShotListService } from './couple-shot-list-service';
import { GroupShotListService } from './group-shot-list-service';

import { UserManagementService } from './UserManagementService';
import { ProjectManagementService } from './ProjectManagementService';
import { BaseTimelineService } from './base-timeline-service';
import { BusinessCardService } from './business-card-service';
import { PhotoRequestListService } from './photo-request-service';
import { KeyPeopleListService } from './key-people-service';
import { VendorListService } from './vendor-service';
import { NoteListService } from './notes-service';
import { TagListService } from './tag-service';
import { PhotoTagLinkService } from './photo-tag-link-service';
import { LocationService } from './location-service';
import { BaseProjectService } from './base-project-service';
import { PortalService } from './portal-service';

// Repositories
import { FirestoreAuthRepository } from '@/repositories/firestore/firestore-auth-repository';
import { FirestoreBaseUserRepository } from '@/repositories/firestore/firestore-base-user-repository';
import { FirestoreUserProfileRepository } from '@/repositories/firestore/firestore-user-profile-repository';
import { FirestoreUserPreferencesRepository } from '@/repositories/firestore/firestore-user-preferences-repository';
import { FirestoreUserSubscriptionRepository } from '@/repositories/firestore/firestore-user-subscription-repository';
import { FirestoreUserSetupRepository } from '@/repositories/firestore/firestore-user-setup-repository';
import { FirestoreUserProjectsRepository } from '@/repositories/firestore/firestore-user-projects-repository';
import { FirestoreUserCustomizationsRepository } from '@/repositories/firestore/firestore-user-customizations-repository';

import { FirestoreBaseProjectRepository } from '@/repositories/firestore/firestore-base-project-repository';
import { FirestoreBaseTimelineRepository } from '@/repositories/firestore/firestore-base-timeline-repository';
import { FirestoreBusinessCardRepository } from '@/repositories/firestore/firestore-business-card-repository';
import { FirestoreStorageRepository } from '@/repositories/firestore/firestore-storage-repository';
import { LocalPhotoTagLinkRepository } from '@/repositories/local/local-photo-tag-link-repository';
import { locationRepository } from '@/repositories/firestore/firestore-location-repository';
import { FirestorePortalRepository } from '@/repositories/firestore/firestore-portal-repository';

// Import all list repositories from centralized file
import {
  kitRepository,
  taskRepository,
  coupleShotRepository,
  groupShotRepository,
  notesRepository,
  vendorRepository,
  tagRepository,
  photoRequestRepository,
  keyPeopleRepository,
} from '@/repositories/firestore/list.repository';

// ============================================================================
// REPOSITORY INSTANCES
// ============================================================================

const baseUserRepository = new FirestoreBaseUserRepository();
const userProfileRepository = new FirestoreUserProfileRepository();
const userPreferencesRepository = new FirestoreUserPreferencesRepository();
const userSubscriptionRepository = new FirestoreUserSubscriptionRepository();
const userSetupRepository = new FirestoreUserSetupRepository();
const userProjectsRepository = new FirestoreUserProjectsRepository();
const userCustomizationsRepository = new FirestoreUserCustomizationsRepository();

const authRepository = new FirestoreAuthRepository(baseUserRepository);
const baseProjectRepository = new FirestoreBaseProjectRepository();
const baseTimelineRepository = new FirestoreBaseTimelineRepository();
const businessCardRepository = new FirestoreBusinessCardRepository();
const storageRepository = new FirestoreStorageRepository();
const photoTagLinkRepository = new LocalPhotoTagLinkRepository();
const portalRepository = new FirestorePortalRepository();

// Note: All list repositories are imported from list.repository.ts

// ============================================================================
// SERVICE FACTORY
// ============================================================================

/**
 * Service Factory
 * Centralized dependency injection for all services
 */
class ServiceFactoryClass {
  // Services (public, singleton)
  public readonly auth: AuthService;

  public readonly userManagement: UserManagementService;
  public readonly projectManagement: ProjectManagementService;
  public readonly baseTimeline: BaseTimelineService;
  public readonly baseProject: BaseProjectService;
  public readonly businessCard: BusinessCardService;
  public readonly baseUser: BaseUserService;
  public readonly userProfile: UserProfileService;
  public readonly userPreferences: UserPreferencesService;
  public readonly userSubscription: UserSubscriptionService;
  public readonly userSetup: UserSetupService;
  public readonly userProjects: UserProjectsService;
  public readonly userCustomizations: UserCustomizationsService;

  // List services (all using generic ListService pattern)
  public readonly kit: KitListService;
  public readonly task: TaskListService;
  public readonly coupleShot: CoupleShotListService;
  public readonly groupShot: GroupShotListService;
  public readonly notes: NoteListService;
  public readonly vendor: VendorListService;
  public readonly tag: TagListService;
  public readonly photoRequest: PhotoRequestListService;
  public readonly keyPeople: KeyPeopleListService;

  public readonly photoTagLink: PhotoTagLinkService;
  public readonly location: LocationService;
  public readonly portal: PortalService;

  constructor() {
    // Initialize user services
    this.baseUser = new BaseUserService(baseUserRepository);
    this.userProfile = new UserProfileService(userProfileRepository);
    this.userPreferences = new UserPreferencesService(userPreferencesRepository);
    this.userSubscription = new UserSubscriptionService(userSubscriptionRepository);
    this.userSetup = new UserSetupService(userSetupRepository);
    this.userProjects = new UserProjectsService(userProjectsRepository);
    this.userCustomizations = new UserCustomizationsService(userCustomizationsRepository);

    // Initialize list services (all now use generic ListService pattern)
    // Traditional lists (with master templates)
    this.kit = new KitListService(kitRepository);
    this.task = new TaskListService(taskRepository);
    this.coupleShot = new CoupleShotListService(coupleShotRepository);
    this.groupShot = new GroupShotListService(groupShotRepository);

    // Scoped lists (user and project, no master)
    this.notes = new NoteListService(notesRepository);
    this.vendor = new VendorListService(vendorRepository);
    this.tag = new TagListService(tagRepository);

    // Project-only lists (with storage repository for image operations)
    this.photoRequest = new PhotoRequestListService(photoRequestRepository, storageRepository);
    this.keyPeople = new KeyPeopleListService(keyPeopleRepository, storageRepository);

    // Initialize user management
    this.userManagement = new UserManagementService(
      this.baseUser,
      this.userProfile,
      this.userPreferences,
      this.userCustomizations,
      this.userSubscription,
      this.userSetup,
      this.userProjects,
    );

    // Initialize project services
    this.baseProject = new BaseProjectService(baseProjectRepository);
    this.baseTimeline = new BaseTimelineService(baseTimelineRepository);

    this.projectManagement = new ProjectManagementService(
      this.baseProject,
      baseProjectRepository,
      this.baseTimeline,
      this.kit,
      this.task,
      this.groupShot,
      this.coupleShot,
    );

    // Initialize other services
    this.auth = new AuthService(authRepository);
    this.businessCard = new BusinessCardService(businessCardRepository);
    this.location = new LocationService(locationRepository);
    this.photoTagLink = new PhotoTagLinkService(photoTagLinkRepository);
    this.portal = new PortalService(portalRepository);
  }
}

// Export singleton instance
export const ServiceFactory = new ServiceFactoryClass();

// Export individual services for convenience
export const authService = ServiceFactory.auth;

export const baseUserService = ServiceFactory.baseUser;
export const userProfileService = ServiceFactory.userProfile;
export const userPreferencesService = ServiceFactory.userPreferences;
export const userSubscriptionService = ServiceFactory.userSubscription;
export const userSetupService = ServiceFactory.userSetup;
export const userProjectsService = ServiceFactory.userProjects;
export const userCustomizationsService = ServiceFactory.userCustomizations;

export const baseProjectService = ServiceFactory.baseProject;
export const baseTimelineService = ServiceFactory.baseTimeline;
export const businessCardService = ServiceFactory.businessCard;
export const projectManagementService = ServiceFactory.projectManagement;

export const kitListService = ServiceFactory.kit;
export const taskListService = ServiceFactory.task;
export const coupleShotListService = ServiceFactory.coupleShot;
export const groupShotListService = ServiceFactory.groupShot;
export const noteListService = ServiceFactory.notes;
export const vendorListService = ServiceFactory.vendor;
export const tagListService = ServiceFactory.tag;
export const photoRequestListService = ServiceFactory.photoRequest;
export const keyPeopleListService = ServiceFactory.keyPeople;

export const locationService = ServiceFactory.location;
export const photoTagLinkService = ServiceFactory.photoTagLink;
export const portalService = ServiceFactory.portal;

export const services = {
  auth: authService,
  baseUser: baseUserService,
  userProfile: userProfileService,
  userPreferences: userPreferencesService,
  userSubscription: userSubscriptionService,
  userSetup: userSetupService,
  userProjects: userProjectsService,
  userCustomizations: userCustomizationsService,
  baseProject: baseProjectService,
  baseTimeline: baseTimelineService,
  projectManagement: projectManagementService,
  kitList: kitListService,
  taskList: taskListService,
  coupleShotList: coupleShotListService,
  groupSotList: groupShotListService,
  noteList: noteListService,
  vendorList: vendorListService,
  tagList: tagListService,
  photoRequestList: photoRequestListService,
  keyPeopleList: keyPeopleListService,
  businessCard: businessCardService,
  location: locationService,
  photoTagLink: photoTagLinkService,
  portal: portalService,
};
