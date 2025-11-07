/*---------------------------------------
File: src/constants/error-code-registry.ts
Description: Error code registry for the application
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/
/**
 * Comprehensive error code registry for the application
 * Error codes follow the pattern: CATEGORY_XXX where XXX is a sequential number
 * Used for error identification, logging, and internationalization
 */
export enum ErrorCode {
  /** Test error */
  TEST_ERROR = 'TEST_001',

  // ============================================================================
  // LIST MANAGEMENT ERRORS
  // ============================================================================

  /** List entity not found in database */
  LIST_NOT_FOUND = 'LIST_001',
  /** List not found for specific user */
  LIST_NOT_FOUND_USER = 'LIST_002',
  /** List not found for specific project */
  LIST_NOT_FOUND_PROJECT = 'LIST_003',
  /** Failed to add item to list */
  LIST_ITEM_ADD_FAILED = 'LIST_004',

  // ============================================================================
  // IMAGE & MEDIA ERRORS
  // ============================================================================

  /** Image file not found */
  IMAGE_NOT_FOUND = 'IMG_001',
  /** Requested image size variant not available */
  IMAGE_SIZE_NOT_AVAILABLE = 'IMG_002',

  // ============================================================================
  // AUTHENTICATION & USER ERRORS
  // ============================================================================

  /** Invalid login credentials provided */
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  /** User account not found */
  AUTH_USER_NOT_FOUND = 'AUTH_002',
  /** Email address already registered */
  AUTH_EMAIL_IN_USE = 'AUTH_003',
  /** Password does not meet security requirements */
  AUTH_WEAK_PASSWORD = 'AUTH_004',
  /** Email address not verified */
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_005',
  /** User session has expired */
  AUTH_SESSION_EXPIRED = 'AUTH_006',
  /** Too many authentication requests */
  AUTH_TOO_MANY_REQUESTS = 'AUTH_007',

  // ============================================================================
  // SUBSCRIPTION & BILLING ERRORS
  // ============================================================================

  /** Subscription has expired */
  SUBSCRIPTION_EXPIRED = 'SUB_001',
  /** Free trial period has ended */
  SUBSCRIPTION_FREE_TRIAL_EXPIRED = 'SUB_002',
  /** Payment processing failed */
  SUBSCRIPTION_PAYMENT_FAILED = 'SUB_003',

  // ============================================================================
  // VALIDATION ERRORS
  // ============================================================================

  /** Input validation failed */
  VALIDATION_FAILED = 'VAL_001',

  // ============================================================================
  // DATABASE ERRORS
  // ============================================================================

  /** Document not found in Firestore */
  DB_NOT_FOUND = 'DB_001',
  /** Insufficient permissions for database operation */
  DB_PERMISSION_DENIED = 'DB_002',
  /** Network error during database operation */
  DB_NETWORK_ERROR = 'DB_003',
  /** Write error during database operation */
  DB_WRITE_ERROR = 'DB_004',
  /** Read error during database operation */
  DB_READ_ERROR = 'DB_005',
  /** Database schema validation failed */
  DB_VALIDATION_ERROR = 'DB_006',
  // ============================================================================
  // FILE STORAGE ERRORS
  // ============================================================================

  /** Generic Firebase Storage error */
  FIREBASE_STORAGE_ERROR = 'FIRE_001',
  /** Insufficient permissions for storage operation */
  FIREBASE_STORAGE_PERMISSION_DENIED = 'FIRE_002',
  /** File not found in storage */
  FIREBASE_STORAGE_NOT_FOUND = 'FIRE_003',
  /** Storage service temporarily unavailable */
  FIREBASE_STORAGE_UNAVAILABLE = 'FIRE_004',

  // ============================================================================
  // NETWORK & API ERRORS
  // ============================================================================

  /** Network request timed out */
  NETWORK_TIMEOUT = 'NET_001',
  /** Network connection failed */
  NETWORK_CONNECTION_ERROR = 'NET_002',
  /** Server returned error response */
  NETWORK_SERVER_ERROR = 'NET_003',
  /** Circuit breaker is open */
  CIRCUIT_BREAKER_OPEN = 'NET_004',

  // ============================================================================
  // LOCATION & GEOCODING ERRORS
  // ============================================================================

  /** Location API request failed */
  LOCATION_API_ERROR = 'LOC_001',
  /** Location API key not configured */
  LOCATION_API_KEY_MISSING = 'LOC_002',
  /** No location results found */
  LOCATION_NO_RESULTS = 'LOC_003',
  /** Invalid location geometry data */
  LOCATION_INVALID_GEOMETRY = 'LOC_004',
  /** Location data validation failed */
  LOCATION_VALIDATION_FAILED = 'LOC_005',
  /** Maps service not supported on this platform */
  LOCATION_MAPS_NOT_SUPPORTED = 'LOC_006',

  // ============================================================================
  // PAYMENT PROCESSING ERRORS
  // ============================================================================

  /** Generic payment processing failure */
  PAYMENT_FAILED = 'PAY001',
  /** Payment card was declined */
  CARD_DECLINED = 'PAY002',
  /** Insufficient funds for payment */
  INSUFFICIENT_FUNDS = 'PAY003',
  /** Invalid payment card details */
  INVALID_CARD = 'PAY004',
  /** Payment card has expired */
  EXPIRED_CARD = 'PAY005',
  /** Subscription not found */
  SUBSCRIPTION_NOT_FOUND = 'PAY006',
  /** User already has active subscription */
  ALREADY_SUBSCRIBED = 'PAY007',

  // ============================================================================
  // QR CODE & SCANNING ERRORS
  // ============================================================================

  /** QR code is empty or contains no data */
  QR_CODE_EMPTY = 'QR_001',
  /** QR code format is invalid */
  QR_CODE_INVALID_FORMAT = 'QR_002',
  /** QR code data exceeds maximum length */
  QR_CODE_TOO_LONG = 'QR_003',
  /** QR code does not contain contact information */
  QR_CODE_NO_CONTACT_INFO = 'QR_004',
  /** Failed to parse QR code data */
  QR_CODE_PARSE_ERROR = 'QR_005',
  /** Camera permission denied for QR scanning */
  QR_CODE_CAMERA_PERMISSION_DENIED = 'QR_006',
  /** Camera permission request is pending */
  QR_CODE_CAMERA_PERMISSION_PENDING = 'QR_007',

  // ============================================================================
  // CAMERA ERRORS
  // ============================================================================

  /** Camera is not available on this device */
  CAMERA_NOT_AVAILABLE = 'CAM_001',
  /** Photo/video capture failed */
  CAMERA_CAPTURE_FAILED = 'CAM_002',

  // ============================================================================
  // FILE SYSTEM ERRORS
  // ============================================================================

  /** File not found in file system */
  FILE_NOT_FOUND = 'FILE_001',
  /** File system permission denied */
  FILE_PERMISSION_DENIED = 'FILE_002',
  /** File write operation failed */
  FILE_WRITE_ERROR = 'FILE_003',

  // ============================================================================
  // PERMISSION ERRORS
  // ============================================================================

  /** General permission denied error */
  PERMISSION_DENIED = 'PERM_001',
  /** Permission request is pending user approval */
  PERMISSION_PENDING = 'PERM_002',

  // ============================================================================
  // WEATHER API ERRORS
  // ============================================================================

  /** Weather API request failed */
  WEATHER_API_ERROR = 'WEATHER_001',
  /** Weather location not found */
  WEATHER_LOCATION_NOT_FOUND = 'WEATHER_002',
  /** Weather API key not configured */
  WEATHER_API_KEY_MISSING = 'WEATHER_003',

  // ============================================================================
  // GENERIC ERRORS
  // ============================================================================

  /** Unknown or unhandled error */
  UNKNOWN_ERROR = 'UNK_001',
}
