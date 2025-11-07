/*---------------------------------------
File: src/repositories/i-base-user-repository.ts
Description: Base user repository interface - handles /users/{userId} document
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  BaseUser,
  BaseUserCreate,
  BaseUserUpdate,
  UserBanInput,
  UserRoleUpdate,
} from '@/domain/user/user.schema';

/**
 * Repository interface for base user document operations
 * Handles /users/{userId} - core identity, authentication, and account status
 */
export interface IBaseUserRepository {
  /**
   * Gets a user by ID (one-time fetch)
   * @param userId - The user ID
   * @returns BaseUser or error
   */
  getById(userId: string): Promise<Result<BaseUser, AppError>>;

  /**
   * Creates a base user document
   * @param userId - The user ID (from Auth)
   * @param payload - Base user creation data
   * @returns Created BaseUser or error
   */
  create(userId: string, payload: BaseUserCreate): Promise<Result<BaseUser, AppError>>;

  /**
   * Updates base user document
   * @param userId - The user ID
   * @param updates - Partial update data
   * @returns Updated BaseUser or error
   */
  update(userId: string, updates: BaseUserUpdate): Promise<Result<BaseUser, AppError>>;

  /**
   * Subscribes to real-time updates for base user (✅ RECOMMENDED - always active after login)
   * @param userId - The user ID
   * @param onData - Callback when data changes (Result type)
   * @returns Unsubscribe function for cleanup
   */
  subscribeToUser(userId: string, onData: (result: Result<BaseUser, AppError>) => void): () => void;

  /**
   * Updates last login timestamp
   * @param userId - The user ID
   * @returns Success or error
   */
  updateLastLogin(userId: string): Promise<Result<void, AppError>>;

  /**
   * Updates email verification status
   * @param userId - The user ID
   * @param isVerified - Verification status
   * @returns Success or error
   */
  updateEmailVerification(userId: string, isVerified: boolean): Promise<Result<void, AppError>>;

  // --- Admin Operations ---

  /**
   * Bans a user
   * @param userId - The user ID
   * @param payload - Ban details with reason
   * @returns Success or error
   */
  banUser(userId: string, payload: UserBanInput): Promise<Result<void, AppError>>;

  /**
   * Unbans a user
   * @param userId - The user ID
   * @returns Success or error
   */
  unbanUser(userId: string): Promise<Result<void, AppError>>;

  /**
   * Updates user role (admin only)
   * @param userId - The user ID
   * @param payload - Role update
   * @returns Success or error
   */
  updateRole(userId: string, payload: UserRoleUpdate): Promise<Result<void, AppError>>;

  /**
   * Soft deletes a user
   * @param userId - The user ID
   * @returns Success or error
   */
  delete(userId: string): Promise<Result<void, AppError>>;

  /**
   * Permanently deletes a user
   * @param userId - The user ID
   * @returns Success or error
   */
  permanentlyDelete(userId: string): Promise<Result<void, AppError>>;
}
