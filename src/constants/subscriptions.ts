/*---------------------------------------
File: src/constants/subscriptions.ts
Description: Subscription constants and limits for the Eye-Doo application.

Author: Kyle Lovesy
Date: 04/11-2025 - 16.00
Version: 2.0.0
---------------------------------------*/
import { SubscriptionPlan } from './enums';

/**
 * Photo request feature limits by subscription tier
 */
export interface PhotoRequestLimits {
  maxImagesPerRequest: number;
  maxTotalImages: number;
  storageDurationDays: number;
  enabled: boolean;
}

/**
 * Photo request limits for each subscription tier
 */
export const PHOTO_REQUEST_LIMITS: Record<SubscriptionPlan, PhotoRequestLimits> = {
  [SubscriptionPlan.FREE]: {
    maxImagesPerRequest: 0,
    maxTotalImages: 0,
    storageDurationDays: 0,
    enabled: false,
  },
  [SubscriptionPlan.PRO]: {
    maxImagesPerRequest: 3,
    maxTotalImages: 15,
    storageDurationDays: 90,
    enabled: true,
  },
  [SubscriptionPlan.STUDIO]: {
    maxImagesPerRequest: 10,
    maxTotalImages: 100,
    storageDurationDays: 365,
    enabled: true,
  },
};

/**
 * Gets photo request limits for a subscription plan
 * @param plan The subscription plan
 * @returns Photo request limits for the plan
 */
export function getPhotoRequestLimits(plan: SubscriptionPlan): PhotoRequestLimits {
  return PHOTO_REQUEST_LIMITS[plan];
}

/**
 * Checks if an image can be uploaded based on subscription plan and current counts
 * @param plan The subscription plan
 * @param currentRequestImageCount Current number of images for the request
 * @param currentTotalImageCount Current total number of images across all requests
 * @returns True if image can be uploaded, false otherwise
 */
export function canUploadImage(
  plan: SubscriptionPlan,
  currentRequestImageCount: number,
  currentTotalImageCount: number,
): boolean {
  const limits = getPhotoRequestLimits(plan);

  if (!limits.enabled) {
    return false;
  }

  if (currentRequestImageCount >= limits.maxImagesPerRequest) {
    return false;
  }

  if (currentTotalImageCount >= limits.maxTotalImages) {
    return false;
  }

  return true;
}

/**
 * Key people feature limits by subscription tier
 */
export interface KeyPeopleLimits {
  maxAvatars: number;
  enabled: boolean;
}

/**
 * Key people limits for each subscription tier
 */
export const KEY_PEOPLE_LIMITS: Record<SubscriptionPlan, KeyPeopleLimits> = {
  [SubscriptionPlan.FREE]: {
    maxAvatars: 0,
    enabled: false,
  },
  [SubscriptionPlan.PRO]: {
    maxAvatars: 5,
    enabled: true,
  },
  [SubscriptionPlan.STUDIO]: {
    maxAvatars: 50,
    enabled: true,
  },
};

/**
 * Gets key people limits for a subscription plan
 * @param plan The subscription plan
 * @returns Key people limits for the plan
 */
export function getKeyPeopleLimits(plan: SubscriptionPlan): KeyPeopleLimits {
  return KEY_PEOPLE_LIMITS[plan];
}

/**
 * Checks if an avatar can be added based on subscription plan and current count
 * @param plan The subscription plan
 * @param currentAvatarCount Current number of avatars
 * @returns True if avatar can be added, false otherwise
 */
export function canAddAvatar(plan: SubscriptionPlan, currentAvatarCount: number): boolean {
  const limits = getKeyPeopleLimits(plan);

  if (!limits.enabled) {
    return false;
  }

  return currentAvatarCount < limits.maxAvatars;
}

/**
 * Vendor feature limits by subscription tier
 */
export interface VendorLimits {
  enabled: boolean;
  maxVendors: number;
  qrCodeScanningEnabled: boolean; // Future feature
  globalVendorsEnabled: boolean; // Global scope feature
}

/**
 * Vendor limits for each subscription tier
 */
export const VENDOR_LIMITS: Record<SubscriptionPlan, VendorLimits> = {
  [SubscriptionPlan.FREE]: {
    enabled: false,
    maxVendors: 0,
    qrCodeScanningEnabled: false,
    globalVendorsEnabled: false,
  },
  [SubscriptionPlan.PRO]: {
    enabled: true,
    maxVendors: 20,
    qrCodeScanningEnabled: false,
    globalVendorsEnabled: true,
  },
  [SubscriptionPlan.STUDIO]: {
    enabled: true,
    maxVendors: 100,
    qrCodeScanningEnabled: true,
    globalVendorsEnabled: true,
  },
};

/**
 * Gets vendor limits for a subscription plan
 * @param plan The subscription plan
 * @returns Vendor limits for the plan
 */
export function getVendorLimits(plan: SubscriptionPlan): VendorLimits {
  return VENDOR_LIMITS[plan];
}

/**
 * Checks if a vendor can be added based on subscription plan and current count
 * @param plan The subscription plan
 * @param currentVendorCount Current number of vendors
 * @returns True if vendor can be added, false otherwise
 */
export function canAddVendor(plan: SubscriptionPlan, currentVendorCount: number): boolean {
  const limits = getVendorLimits(plan);

  if (!limits.enabled) {
    return false;
  }

  return currentVendorCount < limits.maxVendors;
}

/**
 * Checks if global vendors feature is available for a subscription plan
 * @param plan The subscription plan
 * @returns True if global vendors are enabled, false otherwise
 */
export function canUseGlobalVendors(plan: SubscriptionPlan): boolean {
  const limits = getVendorLimits(plan);
  return limits.enabled && limits.globalVendorsEnabled;
}

/**
 * Checks if QR code scanning feature is available for a subscription plan
 * @param plan The subscription plan
 * @returns True if QR code scanning is enabled, false otherwise
 */
export function canUseQRCodeScanning(plan: SubscriptionPlan): boolean {
  const limits = getVendorLimits(plan);
  return limits.enabled && limits.qrCodeScanningEnabled;
}

/**
 * Notes feature limits by subscription tier
 */
export interface NoteLimits {
  enabled: boolean;
  maxNotes: number;
  globalNotesEnabled: boolean; // Global scope feature
}

/**
 * Notes limits for each subscription tier
 */
export const NOTE_LIMITS: Record<SubscriptionPlan, NoteLimits> = {
  [SubscriptionPlan.FREE]: {
    enabled: false,
    maxNotes: 0,
    globalNotesEnabled: false,
  },
  [SubscriptionPlan.PRO]: {
    enabled: true,
    maxNotes: 50,
    globalNotesEnabled: true,
  },
  [SubscriptionPlan.STUDIO]: {
    enabled: true,
    maxNotes: 500,
    globalNotesEnabled: true,
  },
};

/**
 * Gets notes limits for a subscription plan
 * @param plan The subscription plan
 * @returns Notes limits for the plan
 */
export function getNoteLimits(plan: SubscriptionPlan): NoteLimits {
  return NOTE_LIMITS[plan];
}

/**
 * Checks if a note can be added based on subscription plan and current count
 * @param plan The subscription plan
 * @param currentNoteCount Current number of notes
 * @returns True if note can be added, false otherwise
 */
export function canAddNote(plan: SubscriptionPlan, currentNoteCount: number): boolean {
  const limits = getNoteLimits(plan);

  if (!limits.enabled) {
    return false;
  }

  return currentNoteCount < limits.maxNotes;
}

/**
 * Checks if global notes feature is available for a subscription plan
 * @param plan The subscription plan
 * @returns True if global notes are enabled, false otherwise
 */
export function canUseGlobalNotes(plan: SubscriptionPlan): boolean {
  const limits = getNoteLimits(plan);
  return limits.enabled && limits.globalNotesEnabled;
}

/**
 * Tag feature limits by subscription tier
 */
export interface TagLimits {
  enabled: boolean;
  maxTags: number;
  sharingEnabled: boolean;
  globalTagsEnabled: boolean;
}

/**
 * Tag limits for each subscription tier
 */
export const TAG_LIMITS: Record<SubscriptionPlan, TagLimits> = {
  [SubscriptionPlan.FREE]: {
    enabled: false,
    maxTags: 0,
    sharingEnabled: false,
    globalTagsEnabled: false,
  },
  [SubscriptionPlan.PRO]: {
    enabled: true,
    maxTags: 50,
    sharingEnabled: true,
    globalTagsEnabled: true,
  },
  [SubscriptionPlan.STUDIO]: {
    enabled: true,
    maxTags: 500,
    sharingEnabled: true,
    globalTagsEnabled: true,
  },
};

/**
 * Gets tag limits for a subscription plan
 * @param plan The subscription plan
 * @returns Tag limits for the plan
 */
export function getTagLimits(plan: SubscriptionPlan): TagLimits {
  return TAG_LIMITS[plan];
}

/**
 * Checks if a tag can be added based on subscription plan and current count
 * @param plan The subscription plan
 * @param currentTagCount Current number of tags
 * @returns True if tag can be added, false otherwise
 */
export function canAddTag(plan: SubscriptionPlan, currentTagCount: number): boolean {
  const limits = getTagLimits(plan);

  if (!limits.enabled) {
    return false;
  }

  return currentTagCount < limits.maxTags;
}

/**
 * Checks if global tags feature is available for a subscription plan
 * @param plan The subscription plan
 * @returns True if global tags are enabled, false otherwise
 */
export function canUseGlobalTags(plan: SubscriptionPlan): boolean {
  const limits = getTagLimits(plan);
  return limits.enabled && limits.globalTagsEnabled;
}

/**
 * Checks if photo sharing feature is available for a subscription plan
 * @param plan The subscription plan
 * @returns True if photo sharing is enabled, false otherwise
 */
export function canSharePhotos(plan: SubscriptionPlan): boolean {
  const limits = getTagLimits(plan);
  return limits.enabled && limits.sharingEnabled;
}