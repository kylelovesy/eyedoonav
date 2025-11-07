/*---------------------------------------
File: src/repositories/i-user-customizations-repository.ts
Description: User customizations repository interface - handles /users/{userId}/customizations/{customizationsId}
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  UserCustomizations,
  UserCustomizationsCreate,
  UserCustomizationsUpdate,
} from '@/domain/user/user.schema';

/**
 * Repository interface for user customizations subcollection
 * Handles /users/{userId}/customizations/{customizationsId} - user branding/theme settings
 * ❌ NO real-time listener - fetch once and cache (AsyncStorage or Zustand persist)
 */
export interface IUserCustomizationsRepository {
  /**
   * Gets user customizations by ID (fetch-only, no listener)
   * @param userId - The user ID
   * @param customizationsId - The customizations document ID
   * @returns UserCustomizations or error
   */
  get(userId: string, customizationsId: string): Promise<Result<UserCustomizations, AppError>>;

  /**
   * Gets the user's customizations (assumes single customizations document)
   * Fetches first document in customizations subcollection
   * @param userId - The user ID
   * @returns UserCustomizations or error
   */
  getByUserId(userId: string): Promise<Result<UserCustomizations, AppError>>;

  /**
   * Creates a new customizations document
   * @param userId - The user ID
   * @param payload - Customizations creation data
   * @returns Created UserCustomizations or error
   */
  create(
    userId: string,
    payload: UserCustomizationsCreate,
  ): Promise<Result<UserCustomizations, AppError>>;

  /**
   * Updates customizations document
   * @param userId - The user ID
   * @param customizationsId - The customizations document ID
   * @param updates - Partial update data
   * @returns Updated UserCustomizations or error
   */
  update(
    userId: string,
    customizationsId: string,
    updates: UserCustomizationsUpdate,
  ): Promise<Result<UserCustomizations, AppError>>;

  /**
   * Deletes customizations document
   * @param userId - The user ID
   * @param customizationsId - The customizations document ID
   * @returns Success or error
   */
  delete(userId: string, customizationsId: string): Promise<Result<void, AppError>>;
}
