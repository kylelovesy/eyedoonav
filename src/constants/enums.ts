/*---------------------------------------
File: src/constants/enums.ts
Description: Enums for the Eye-Doo application, providing type-safe constants for business logic, UI states, and domain models across authentication, subscription, notifications, and photography workflows.
Author: Kyle Lovesy
Date: 27/10-2025 - 09.45
Version: 1.1.0
---------------------------------------*/

// FORM & SUBSCRIPTION ENUMS

/**
 * Billing intervals for subscription payments.
 * Used in subscription forms and billing integration.
 */
export enum PaymentInterval {
  MONTHLY = 'month',
  YEARLY = 'year',
}

/**
 * Subscription plan tiers with different feature sets.
 * Used in billing, feature gating, and upgrade flows.
 */
export enum SubscriptionPlan {
  FREE = 'free',
  PRO = 'pro',
  STUDIO = 'studio',
}

/**
 * Subscription lifecycle states.
 * Used in subscription management and feature access.
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
}

/**
 * Setup wizard sections for initial configuration.
 * Used in onboarding and setup flows.
 */
export enum SetupSection {
  KIT = 'kit',
  TASKS = 'tasks',
  GROUP_SHOTS = 'groupShots',
  COUPLE_SHOTS = 'coupleShots',
  BUSINESS_CARD = 'businessCard',
}

// USER & LOCALIZATION ENUMS

/**
 * User roles determining access levels and permissions.
 * Used in authentication and feature gating.
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * Supported languages for internationalization.
 * Used in user preferences and UI localization.
 */
export enum LanguageOption {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  KOREAN = 'ko',
}

// NOTIFICATION ENUMS

/**
 * Notification delivery channels.
 * Used in notification preferences and delivery routing.
 */
export enum NotificationType {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in-app',
}

/**
 * Notification priority levels for delivery and UI.
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification lifecycle states.
 * Used in tracking, analytics, and retry mechanisms.
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
  CANCELLED = 'cancelled',
}

// SYSTEM ENUMS

/**
 * Temperature units for weather data display.
 * Used in user preferences and weather integration.
 */
export enum WeatherUnit {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
}

/**
 * File upload operation states.
 * Used in file management and progress tracking.
 */
export enum FileUploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// DOMAIN ENUMS

/**
 * List types used across the application.
 * Used in list management and UI rendering.
 */
export enum ListType {
  TASKS = 'tasks',
  KIT = 'kit',
  GROUP_SHOTS = 'groupShots',
  COUPLE_SHOTS = 'coupleShots',
  KEY_PEOPLE = 'keyPeople',
  LOCATION = 'location',
  PHOTO_REQUEST = 'photoRequest',
  TIMELINE = 'timeline',
  VENDORS = 'vendors',
  NOTES = 'notes',
  TAGS = 'tags',
}

/**
 * Data source hierarchy for lists.
 * Used in list ownership and permissions.
 */
export enum ListSource {
  MASTER_LIST = 'masterList',
  PROJECT_LIST = 'projectList',
  USER_LIST = 'userList',
  CUSTOM = 'custom',
}

/**
 * Workflow action permissions for portal sections.
 * Used in permission management.
 */
export enum ActionOn {
  CLIENT = 'client',
  PHOTOGRAPHER = 'photographer',
  NONE = 'none',
}

export enum ClientPortalStatus {
  NONE = 'none',
  INITIALIZED = 'initialized',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Workflow states for portal sections and projects.
 * Used in progress tracking and automation.
 */
export enum SectionStatus {
  NONE = 'none',
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
  REVIEW = 'review',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  FINALIZED = 'finalized',
  CANCELLED = 'cancelled',
}

/**
 * Navigation identifiers for portal workflow steps.
 * Used in routing and progress indicators.
 */
export enum PortalStepID {
  KEY_PEOPLE = 'keyPeople',
  LOCATIONS = 'locations',
  GROUP_SHOTS = 'groupShots',
  PHOTO_REQUESTS = 'photoRequests',
  TIMELINE = 'timeline',
  WELCOME = 'welcome',
}

/**
 * Attribution for data creation and modifications.
 * Used in audit trails and permissions.
 */
export enum CreatedBy {
  CLIENT = 'client',
  PHOTOGRAPHER = 'photographer',
  SYSTEM = 'system',
}

/**
 * Roles for key people in photography projects.
 * Used in key people management and shot planning.
 */
export enum KeyPeopleRole {
  BRIDE = 'bride',
  GROOM = 'groom',
  MAID_OF_HONOR = 'maidOfHonor',
  MATRON_OF_HONOR = 'matronOfHonor',
  BEST_MAN = 'bestMan',
  BRIDESMAID = 'bridesmaid',
  GROOMSMAN = 'groomsman',
  FLOWER_GIRL = 'flowerGirl',
  RING_BEARER = 'ringBearer',
  USHER = 'usher',
  MOTHER_OF_BRIDE = 'motherOfBride',
  FATHER_OF_BRIDE = 'fatherOfBride',
  MOTHER_OF_GROOM = 'motherOfGroom',
  FATHER_OF_GROOM = 'fatherOfGroom',
  STEPMOTHER = 'stepmother',
  STEPFATHER = 'stepfather',
  GRANDMOTHER = 'grandmother',
  GRANDFATHER = 'grandfather',
  SISTER = 'sister',
  BROTHER = 'brother',
  PARENT = 'parent',
  GRANDPARENT = 'grandparent',
  OFFICIANT = 'officiant',
  VENDOR = 'vendor',
  OTHER = 'other',
}

/**
 * Involvement types for key people in events.
 * Used in event planning and coordination.
 */
export enum KeyPeopleInvolvement {
  SPEECH = 'speech',
  READING = 'reading',
  TOAST = 'toast',
  WALK_DOWN_AISLE = 'walkDownAisle',
  SPECIAL_DANCE = 'specialDance',
  OTHER = 'other',
  NONE = 'none',
}

/**
 * Location categories for photography planning.
 * Used in location management and timeline coordination.
 */
export enum LocationType {
  SINGLE_LOCATION = 'singleLocation',
  MAIN_VENUE = 'mainVenue',
  CEREMONY = 'ceremony',
  GETTING_READY_1 = 'gettingReady1',
  GETTING_READY_2 = 'gettingReady2',
  RECEPTION = 'reception',
  PHOTO_LOCATION = 'photoLocation',
  ACCOMMODATION = 'accommodation',
  GETTING_READY = 'gettingReady',
  ENGAGEMENT = 'engagement',
  PORTRAIT = 'portrait',
  REHEARSAL = 'rehearsal',
  OTHER = 'other',
}

/**
 * Photo request priority and composition types.
 * Used in photo request management and planning.
 */
export enum PhotoRequestPriority {
  MUST_HAVE = 'mustHave',
  NICE_TO_HAVE = 'niceToHave',
  IF_THERE_IS_TIME = 'ifThereIsTime',
}

export enum PhotoRequestStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  NOT_FEASIBLE = 'notFeasible',
}
/**
 * Timeline event categories for schedule planning.
 * Used in timeline management and photography planning.
 */
export enum TimelineEventType {
  BRIDAL_PREP = 'bridalPrep',
  GROOM_PREP = 'groomPrep',
  GUESTS_ARRIVE = 'guenziale',
  CEREMONY_BEGINS = 'ceremonyBegins',
  CONFETTI_AND_MINGLING = 'confettiAndMingling',
  RECEPTION_DRINKS = 'receptionDrinks',
  GROUP_PHOTOS = 'groupPhotos',
  COUPLE_PORTRAITS = 'couplePortraits',
  WEDDING_BREAKFAST = 'weddingBreakfast',
  SPEECHES = 'speeches',
  EVENING_GUESTS_ARRIVE = 'eveningGuestsArrive',
  CAKE_CUTTING = 'cakeCutting',
  FIRST_DANCE = 'firstDance',
  EVENING_ENTERTAINMENT = 'eveningEntertainment',
  EVENING_BUFFET = 'eveningBuffet',
  CARRIAGES = 'carriages',
  COCKTAIL_HOUR = 'cocktailHour',
  DINNER = 'dinner',
  BOUQUET_TOSS = 'bouquetToss',
  GARTER_TOSS = 'garterToss',
  SEND_OFF = 'sendOff',
  OTHER = 'other',
}

/**
 * Group shot categories for photography planning.
 * Used in group shot organization and coordination.
 */
export enum GroupShotCategory {
  COUPLE_WITH_EACH_PARENT = 'coupleWithEachParent',
  COUPLE_WITH_BOTH_PARENTS = 'coupleWithBothParents',
  COUPLE_WITH_SIBLINGS = 'coupleWithSiblings',
  COUPLE_WITH_IMMEDIATE_FAMILY = 'coupleWithImmediateFamily',
  COUPLE_WITH_GRANDPARENTS = 'coupleWithGrandparents',
  COUPLE_WITH_EXTENDED_FAMILY = 'coupleWithExtendedFamily',
  COUPLE_WITH_WEDDING_PARTY = 'coupleWithWeddingParty',
  BRIDE_GROOM_WITH_BRIDESMAIDS_GROOMSMEN = 'brideGroomWithBridesmaidsGroomsmen',
  BRIDE_WITH_MOH_GROOM_WITH_BESTMAN = 'brideWithMOHGroomWithBestman',
  BRIDE_GROOM_WITH_FLOWER_GIRLS_PAGE_BOYS = 'brideGroomWithFlowerGirlsPageBoys',
  COUPLE_WITH_CLOSE_FRIENDS = 'coupleWithCloseFriends',
  COUPLE_WITH_SCHOOL_FRIENDS = 'coupleWithSchoolFriends',
  COUPLE_WITH_WORK_FRIENDS = 'coupleWithWorkFriends',
  OTHER = 'other',
}

/**
 * Operational status of timeline events.
 * Used in timeline progress tracking and coordination.
 */
export enum TimelineEventStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
  UPCOMING = 'upcoming',
}

/**
 * Display and interaction modes for timeline UI.
 * Used in timeline rendering and user experience.
 */
export enum TimelineMode {
  SETUP = 'setup',
  ACTIVE = 'active',
  REVIEW = 'review',
}

export enum Scope {
  PROJECT = 'project',
  GLOBAL = 'global',
  NONE = 'none',
}
/**
 * Service provider categories for vendor management.
 * Used in vendor directory and coordination.
 */
export enum VendorType {
  PHOTOGRAPHER = 'photographer',
  VIDEOGRAPHER = 'videographer',
  VENUE = 'venue',
  CATERER = 'caterer',
  FLORIST = 'florist',
  MUSIC = 'music',
  TRANSPORTATION = 'transportation',
  HAIR_MAKEUP = 'hairMakeup',
  DRESS = 'dress',
  SUIT = 'suit',
  CAKE = 'cake',
  DECORATION = 'decoration',
  OTHER = 'other',
}

/**
 * Project lifecycle states.
 * Used in project tracking and workflow management.
 */
export enum ProjectStatus {
  SETUP = 'setup',
  PLANNING = 'planning',
  FINALIZED = 'finalized',
  PENDING = 'pending',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
  CANCELLED = 'cancelled',
}

/**
 * Content categories for photo and project tags.
 * Used in tag organization and search filtering.
 */
export enum TagCategory {
  PEOPLE = 'people',
  LOCATION = 'location',
  EVENT = 'event',
  OBJECT = 'object',
  MOOD = 'mood',
  OTHER = 'other',
}

/**
 * Visual color coding for tags in UI.
 * Used in tag display and organization.
 */
export enum TagColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  PURPLE = 'purple',
  ORANGE = 'orange',
  PINK = 'pink',
  GRAY = 'gray',
}

/**
 * Relationship types for tag associations.
 * Used in tag management and content linking.
 */
export enum TagLinkType {
  PHOTO = 'photo',
  PROJECT = 'project',
  PERSON = 'person',
  LOCATION = 'location',
  EVENT = 'event',
}

/**
 * Who or what created the note.
 */
export enum NoteSource {
  CLIENT = 'client',
  PHOTOGRAPHER = 'photographer',
  SYSTEM = 'system', // includes admin or automated system
}

/**
 * Where the note is stored.
 * - LOCAL: tied to a specific project
 * - GLOBAL: tied to the user (not to a project)
 */
export enum NoteScope {
  LOCAL = 'local',
  GLOBAL = 'global',
}

/**
 * Who should see the note.
 * - PHOTOGRAPHER: visible only to the photographer
 * - CLIENT: visible only to the client
 * - BOTH: visible to both (for shared project contexts)
 */
export enum NoteAudience {
  PHOTOGRAPHER = 'photographer',
  CLIENT = 'client',
  BOTH = 'both',
}

/**
 * Content classification (for filtering, sorting, etc.)
 */
export enum NoteType {
  GENERAL = 'general',
  INSTRUCTION = 'instruction',
  REMINDER = 'reminder',
  FEEDBACK = 'feedback',
  IDEA = 'idea',
}

export enum OptimisticUpdateOperation {
  ADD = 'ADD',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
export enum OptimisticUpdateStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
