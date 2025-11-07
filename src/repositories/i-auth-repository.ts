/*---------------------------------------
File: src/ports/i-auth-repository.ts
Description: Authentication repository interface for the Eye-Doo application.

Author: Kyle Lovesy
Date: 28/10-2025 - 11.00
Version: 1.1.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { BaseUser } from '@/domain/user/user.schema';
import {
  SignUpInput,
  SignInInput,
  PasswordResetInput,
  PasswordChangeInput,
  PasswordResetConfirm,
  EmailVerification,
} from '@/domain/user/auth.schema';

/**
 * @interface IAuthRepository
 * @description Defines the contract for data access operations related to Authentication.
 * This is the "Port" in the Ports & Adapters architecture.
 */
export interface IAuthRepository {
  /**
   * Registers a new user account.
   * @param payload The sign up data including email, password, display name, and preferences.
   * @returns The newly created BaseUser or an error if registration fails.
   */
  signUp(payload: SignUpInput): Promise<Result<BaseUser, AppError>>;

  /**
   * Authenticates an existing user.
   * @param payload The sign in credentials (email and password).
   * @returns The authenticated BaseUser or an error if authentication fails.
   */
  signIn(payload: SignInInput): Promise<Result<BaseUser, AppError>>;

  /**
   * Signs out the current user.
   * @returns A void result indicating success or failure of the sign out operation.
   */
  signOut(): Promise<Result<void, AppError>>;

  /**
   * Initiates a password reset process by sending a reset email.
   * @param payload The email address for password reset.
   * @returns A void result indicating if the reset email was sent successfully.
   */
  passwordReset(payload: PasswordResetInput): Promise<Result<void, AppError>>;

  /**
   * Confirms and completes a password reset using a token.
   * @param payload The new password and reset token.
   * @returns A void result indicating success or failure of the password reset.
   */
  passwordResetConfirm(payload: PasswordResetConfirm): Promise<Result<void, AppError>>;

  /**
   * Changes the current user's password.
   * @param payload The current password and new password.
   * @returns A void result indicating success or failure of the password change.
   */
  passwordChange(payload: PasswordChangeInput): Promise<Result<void, AppError>>;

  /**
   * Retrieves the current authenticated user's profile.
   * @returns The current BaseUser profile or an error if not authenticated.
   */
  getProfile(): Promise<Result<BaseUser, AppError>>;

  /**
   * Verifies a user's email address using a verification token.
   * @param payload The email and verification token.
   * @returns A void result indicating success or failure of email verification.
   */
  verifyEmail(payload: EmailVerification): Promise<Result<void, AppError>>;

  /**
   * Sends a new email verification link to the current user.
   * @returns A void result indicating if the verification email was sent successfully.
   */
  resendEmailVerification(): Promise<Result<void, AppError>>;
}
