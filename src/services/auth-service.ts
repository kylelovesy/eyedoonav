/*---------------------------------------
File: src/services/auth-service.ts
Description: Auth service for the Eye-Doo application.

Author: Kyle Lovesy
Date: 28/10-2025 - 11.00
Version: 2.0.0
---------------------------------------*/

// Domain/types
import { Result, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { BaseUser } from '@/domain/user/user.schema';
import {
  SignUpInput,
  SignInInput,
  PasswordResetInput,
  PasswordResetConfirm,
  PasswordChangeInput,
  EmailVerification,
  signUpInputSchema,
  signInInputSchema,
  passwordResetInputSchema,
  passwordResetConfirmSchema,
  passwordChangeInputSchema,
  emailVerificationSchema,
} from '@/domain/user/auth.schema';

// Repositories
import { IAuthRepository } from '@/repositories/i-auth-repository';

// Utils
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import {
  signInRateLimiter,
  signUpRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
} from '@/utils/rate-limiter';

// Constants
import { ErrorCode } from '@/constants/error-code-registry';

/**
 * @class AuthService
 * @description Handles all authentication-related business logic and orchestration.
 * It validates inputs, applies rate limiting, and delegates data access to the auth repository.
 * @summary Premigration Auth Services - getUserProfile, signIn, signUp, signOut, resetPassword
 */
export class AuthService {
  constructor(private authRepository: IAuthRepository) {}

  /**
   * Orchestrates the sign-up process.
   * 1. Rate limiting check.
   * 2. Validates input.
   * 3. Calls AuthRepository to create the Firebase Auth user and base user document.
   */
  async signUp(payload: SignUpInput): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromService('AuthService', 'signUp');
    const contextString = ErrorContextBuilder.toString(context);

    // Rate limiting
    const rateLimitKey = `signup-${payload.email.toLowerCase()}`;
    if (!signUpRateLimiter.canAttempt(rateLimitKey)) {
      const timeUntilUnblocked = signUpRateLimiter.getTimeUntilUnblocked(rateLimitKey);
      const minutesRemaining = Math.ceil(timeUntilUnblocked / 60000);

      return err(
        ErrorMapper.createGenericError(
          ErrorCode.AUTH_TOO_MANY_REQUESTS,
          'Too many sign-up attempts',
          `Too many sign-up attempts. Please try again in ${minutesRemaining} minutes.`,
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Validate input
    const validationResult = validateWithSchema(signUpInputSchema, payload, contextString);
    if (!validationResult.success) {
      return err(validationResult.error);
    }

    // Sign up
    const result = await this.authRepository.signUp(validationResult.value);

    // Reset rate limit on success
    if (result.success) {
      signUpRateLimiter.reset(rateLimitKey);
    }

    return result;
  }

  /**
   * Orchestrates the sign-in process.
   * 1. Rate limiting check.
   * 2. Validates input.
   * 3. Calls AuthRepository to sign in and get base user.
   */
  async signIn(payload: SignInInput): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromService('AuthService', 'signIn');
    const contextString = ErrorContextBuilder.toString(context);

    // Rate limiting
    const rateLimitKey = `signin-${payload.email.toLowerCase()}`;
    if (!signInRateLimiter.canAttempt(rateLimitKey)) {
      const timeUntilUnblocked = signInRateLimiter.getTimeUntilUnblocked(rateLimitKey);
      const minutesRemaining = Math.ceil(timeUntilUnblocked / 60000);

      return err(
        ErrorMapper.createGenericError(
          ErrorCode.AUTH_TOO_MANY_REQUESTS,
          'Too many sign-in attempts',
          `Too many failed sign-in attempts. Please try again in ${minutesRemaining} minutes.`,
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Validate input
    const validationResult = validateWithSchema(signInInputSchema, payload, contextString);
    if (!validationResult.success) {
      return err(validationResult.error);
    }

    // Sign in - ensure rememberMe is always boolean (Zod default may not be inferred correctly)
    const validatedPayload: SignInInput = {
      ...validationResult.value,
      rememberMe: validationResult.value.rememberMe ?? false,
    };

    // Sign in (auth repository already returns BaseUser)
    const result = await this.authRepository.signIn(validatedPayload);

    // Reset rate limit on success
    if (result.success) {
      signInRateLimiter.reset(rateLimitKey);
    }

    return result;
  }

  /**
   * Signs the current user out.
   */
  async signOut(): Promise<Result<void, AppError>> {
    return this.authRepository.signOut();
  }

  /**
   * Sends a password reset email.
   * 1. Rate limiting check.
   * 2. Validates input.
   * 3. Delegates to AuthRepository.
   */
  async passwordReset(payload: PasswordResetInput): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService('AuthService', 'passwordReset');
    const contextString = ErrorContextBuilder.toString(context);

    // Rate limiting
    const rateLimitKey = `password-reset-${payload.email.toLowerCase()}`;
    if (!passwordResetRateLimiter.canAttempt(rateLimitKey)) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.AUTH_TOO_MANY_REQUESTS,
          'Too many password reset attempts',
          'Too many password reset requests. Please try again later.',
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Validate input
    const validationResult = validateWithSchema(passwordResetInputSchema, payload, contextString);
    if (!validationResult.success) {
      return err(validationResult.error);
    }

    // Send reset email
    return await this.authRepository.passwordReset(validationResult.value);
  }

  /**
   * Confirms a password reset.
   */
  async passwordResetConfirm(payload: PasswordResetConfirm): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService('AuthService', 'passwordResetConfirm');
    const contextString = ErrorContextBuilder.toString(context);

    // Validate input
    const validationResult = validateWithSchema(passwordResetConfirmSchema, payload, contextString);
    if (!validationResult.success) {
      return err(validationResult.error);
    }

    // Delegate to Auth Repo
    return this.authRepository.passwordResetConfirm(validationResult.value);
  }

  /**
   * Changes the current user's password.
   */
  async passwordChange(payload: PasswordChangeInput): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService('AuthService', 'passwordChange');
    const contextString = ErrorContextBuilder.toString(context);

    // Validate input
    const validationResult = validateWithSchema(passwordChangeInputSchema, payload, contextString);
    if (!validationResult.success) {
      return err(validationResult.error);
    }

    // Delegate to Auth Repo
    return this.authRepository.passwordChange(validationResult.value);
  }

  /**
   * Gets the current user's base profile.
   * Auth repository already returns BaseUser, so we just delegate to it.
   */
  async getProfile(): Promise<Result<BaseUser, AppError>> {
    return this.authRepository.getProfile();
  }

  /**
   * Verifies a user's email.
   */
  async verifyEmail(payload: EmailVerification): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService('AuthService', 'verifyEmail');
    const contextString = ErrorContextBuilder.toString(context);

    // Validate input
    const validationResult = validateWithSchema(emailVerificationSchema, payload, contextString);
    if (!validationResult.success) {
      return err(validationResult.error);
    }

    // Delegate to Auth Repo (which will also call baseUserRepo to update status)
    return this.authRepository.verifyEmail(validationResult.value);
  }

  /**
   * Resends the email verification link.
   * 1. Rate limiting check.
   * 2. Delegates to AuthRepository.
   */
  async resendEmailVerification(): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService('AuthService', 'resendEmailVerification');
    const contextString = ErrorContextBuilder.toString(context);

    // Get current user for rate limiting
    const profileResult = await this.authRepository.getProfile();
    if (!profileResult.success) {
      return err(profileResult.error);
    }

    // Rate limiting
    const rateLimitKey = `email-verification-${profileResult.value.email.toLowerCase()}`;
    if (!emailVerificationRateLimiter.canAttempt(rateLimitKey)) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.AUTH_TOO_MANY_REQUESTS,
          'Too many email verification requests',
          'Too many email verification requests. Please try again later.',
          contextString,
          undefined,
          false,
        ),
      );
    }

    // Resend verification email
    return this.authRepository.resendEmailVerification();
  }
}
