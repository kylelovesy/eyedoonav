/*---------------------------------------
File: src/repositories/firestore/firestore-auth-repository.ts
Description: Firestore auth repository implementation for the Eye-Doo application.

Author: Kyle Lovesy
Date: 28/10-2025 - 11.00
Version: 1.1.0
---------------------------------------*/
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updatePassword,
  sendEmailVerification,
  applyActionCode,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/config/firebaseConfig';
import { IAuthRepository } from '@/repositories/i-auth-repository';
import { IBaseUserRepository } from '@/repositories/i-base-user-repository';
import { Result, ok, err } from '@/domain/common/result';
import { AppError, AuthError } from '@/domain/common/errors';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { sanitizeEmail } from '@/utils/sanitization-helpers';
import { ErrorCode } from '@/constants/error-code-registry';
import { BaseUser, BaseUserCreate } from '@/domain/user/user.schema';
import {
  SignUpInput,
  SignInInput,
  PasswordResetInput,
  PasswordResetConfirm,
  PasswordChangeInput,
  EmailVerification,
} from '@/domain/user/auth.schema';
import { LoggingService } from '@/services/logging-service';

/**
 * @class FirestoreAuthRepository
 * @description Implements the IAuthRepository interface using Firebase Auth.
 * This repository focuses purely on authentication operations and delegates
 * base user data management to the IBaseUserRepository.
 */
export class FirestoreAuthRepository implements IAuthRepository {
  private readonly context = 'AuthRepository';

  constructor(private readonly baseUserRepository: IBaseUserRepository) {}

  private ensureAuthenticated(context: string): Result<void, AuthError> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return err(ErrorMapper.userNotFound(context));
    }
    return ok(undefined);
  }

  /**
   * Cleans up Firebase Auth user if user document creation fails
   * Returns error result for consistent error handling
   *
   * NOTE: Cloud Functions will also attempt cleanup, so this is a backup.
   * Cloud Functions provide more reliable cleanup since they run server-side.
   */
  private async cleanupAuthUser(
    userCredential: UserCredential | null,
    context: string,
  ): Promise<Result<void, AuthError>> {
    if (!userCredential) {
      return ok(undefined);
    }

    try {
      await userCredential.user.delete();
      return ok(undefined);
    } catch (cleanupError) {
      // Log cleanup error but don't fail the operation
      // Cloud Functions will handle cleanup if this fails
      console.error(`Failed to cleanup auth user after error in ${context}:`, cleanupError);
      return ok(undefined); // Return success even if cleanup fails
    }
  }

  async signUp(payload: SignUpInput): Promise<Result<BaseUser, AppError>> {
    const context = ErrorContextBuilder.fromRepository('AuthRepository', 'signUp');
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // Sanitize email
      const sanitizedEmail = sanitizeEmail(payload.email);
      if (!sanitizedEmail) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.AUTH_INVALID_CREDENTIALS,
            'Invalid email format',
            'Please provide a valid email address.',
            contextString,
          ),
        );
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        sanitizedEmail,
        payload.password,
      );

      // Send email verification (non-blocking)
      sendEmailVerification(userCredential.user).catch(error => {
        LoggingService.warn('Failed to send verification email', {
          component: 'AuthRepository',
          method: 'signUp',
          metadata: {
            error: error.message,
            userId: userCredential.user.uid,
          },
        });
      });

      // Create base user document (subcollections will be created separately)
      const baseUserData: BaseUserCreate = {
        id: userCredential.user.uid,
        email: sanitizedEmail,
        displayName: payload.displayName,
        phone: null,
      };

      const userResult = await this.baseUserRepository.create(
        userCredential.user.uid,
        baseUserData,
      );

      if (!userResult.success) {
        // User document creation failed
        // Cloud Function will automatically cleanup auth account after 30 seconds
        // Log warning but return error immediately
        LoggingService.warn(
          'Base user document creation failed. Auth account will be cleaned up by Cloud Function.',
          {
            component: 'AuthRepository',
            method: 'signUp',
            userId: userCredential.user.uid,
            metadata: {
              error: userResult.error,
            },
          },
        );

        return err(userResult.error);
      }

      return ok(userResult.value);
    } catch (error) {
      return err(ErrorMapper.fromFirebaseAuth(error as AuthError, contextString));
    }
  }

  async signIn(payload: SignInInput): Promise<Result<BaseUser, AuthError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'signIn');
    const contextString = ErrorContextBuilder.toString(context);
    try {
      // 1. Sanitize email
      const sanitizedEmail = sanitizeEmail(payload.email);
      if (!sanitizedEmail) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.AUTH_INVALID_CREDENTIALS,
            'Invalid email address',
            'Please enter a valid email address',
            contextString,
          ) as AuthError,
        );
      }

      // 2. Authenticate with Firebase Auth
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        sanitizedEmail,
        payload.password,
      );

      // 3. Get base user data through base user repository
      const userResult = await this.baseUserRepository.getById(userCredential.user.uid);

      if (userResult.success) {
        // 4. Update last login timestamp (don't fail if this fails)
        await this.baseUserRepository.updateLastLogin(userCredential.user.uid);
        return ok(userResult.value);
      } else {
        return err(ErrorMapper.fromFirebaseAuth(userResult.error as AuthError, contextString));
      }
    } catch (error) {
      return err(ErrorMapper.fromFirebaseAuth(error as AuthError, contextString));
    }
  }

  async signOut(): Promise<Result<void, AuthError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'signOut');
    const contextString = ErrorContextBuilder.toString(context);
    try {
      await firebaseSignOut(auth);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirebaseAuth(error as AuthError, contextString));
    }
  }

  async passwordReset(payload: PasswordResetInput): Promise<Result<void, AuthError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'passwordReset');
    const contextString = ErrorContextBuilder.toString(context);
    try {
      // Sanitize email
      const sanitizedEmail = sanitizeEmail(payload.email);
      if (!sanitizedEmail) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.AUTH_INVALID_CREDENTIALS,
            'Invalid email address',
            'Please enter a valid email address',
            contextString,
          ) as AuthError,
        );
      }

      await sendPasswordResetEmail(auth, sanitizedEmail);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirebaseAuth(error as AuthError, contextString));
    }
  }

  async passwordResetConfirm(payload: PasswordResetConfirm): Promise<Result<void, AuthError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'passwordResetConfirm');
    const contextString = ErrorContextBuilder.toString(context);
    try {
      await confirmPasswordReset(auth, payload.token, payload.password);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirebaseAuth(error as AuthError, contextString));
    }
  }

  async passwordChange(payload: PasswordChangeInput): Promise<Result<void, AuthError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'passwordChange');
    const contextString = ErrorContextBuilder.toString(context);
    const authCheck = this.ensureAuthenticated(contextString);
    if (!authCheck.success) {
      return authCheck;
    }

    try {
      await updatePassword(auth.currentUser!, payload.newPassword);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirebaseAuth(error as AuthError, contextString));
    }
  }

  async getProfile(): Promise<Result<BaseUser, AuthError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getProfile');
    const contextString = ErrorContextBuilder.toString(context);
    const authCheck = this.ensureAuthenticated(contextString);

    if (!authCheck.success) {
      return authCheck;
    }

    try {
      // Get base user data through base user repository
      const userResult = await this.baseUserRepository.getById(auth.currentUser!.uid);
      if (userResult.success) {
        return ok(userResult.value);
      } else {
        return err(ErrorMapper.userNotFound(contextString));
      }
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async verifyEmail(payload: EmailVerification): Promise<Result<void, AuthError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'verifyEmail');
    const contextString = ErrorContextBuilder.toString(context);
    try {
      await applyActionCode(auth, payload.token);

      // Update user's email verification status through base user repository
      // Note: We need to find user by email, but repository expects userId
      // This is a limitation - we might need to add a method to find user by email
      // For now, if email matches current user, update it
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email === sanitizeEmail(payload.email)) {
        const updateResult = await this.baseUserRepository.updateEmailVerification(
          currentUser.uid,
          true,
        );
        if (!updateResult.success) {
          // Log but don't fail verification if update fails
          console.error('Failed to update email verification status:', updateResult.error);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirebaseAuth(error as AuthError, contextString));
    }
  }

  async resendEmailVerification(): Promise<Result<void, AuthError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'resendEmailVerification');
    const contextString = ErrorContextBuilder.toString(context);
    try {
      const authCheck = this.ensureAuthenticated(contextString);
      if (!authCheck.success) {
        return authCheck;
      }

      await sendEmailVerification(auth.currentUser!);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirebaseAuth(error as AuthError, contextString));
    }
  }
}
