/*---------------------------------------
File: src/repositories/firestore/firestore-business-card-repository.ts
Description: Firestore business card repository implementation for the Eye-Doo application.

Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { doc, getDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/config/firebaseConfig';
import { IBusinessCardRepository } from '@/repositories/i-business-card-repository';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  BusinessCard,
  BusinessCardInput,
  BusinessCardUpdate,
  BusinessCardSocialMediaUpdate,
  BusinessCardContactUpdate,
  BusinessCardQRCode,
  BusinessCardVCard,
  BusinessCardShare,
  businessCardSchema,
  businessCardInputSchema,
  businessCardUpdateSchema,
  businessCardContactUpdateSchema,
  businessCardSocialMediaUpdateSchema,
  defaultBusinessCard,
} from '@/domain/user/business-card.schema';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { ErrorCode } from '@/constants/error-code-registry';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  removeUndefinedValues,
} from '@/utils/sanitization-helpers';
import { validateWithSchema } from '@/utils/validation-helpers';
import { DEFAULTS } from '@/constants/defaults';
import { z } from 'zod';
import { LoggingService } from '@/services/logging-service';

/**
 * @class FirestoreBusinessCardRepository
 * @description Implements the IBusinessCardRepository interface for Cloud Firestore.
 * This is the "Adapter" that connects our application to the Firestore database.
 */
export class FirestoreBusinessCardRepository implements IBusinessCardRepository {
  private readonly context = 'FirestoreBusinessCardRepository';

  private getUserDocRef(userId: string) {
    return doc(db, 'users', userId);
  }

  private getStorageRef(userId: string) {
    return ref(storage, `business-cards/${userId}/user-business-card-qr.png`);
  }

  /**
   * Sanitizes business card input
   */
  private sanitizeBusinessCardInput(payload: BusinessCardInput): BusinessCardInput {
    return {
      firstName: sanitizeString(payload.firstName) || '',
      lastName: sanitizeString(payload.lastName) || '',
      displayName: sanitizeString(payload.displayName) || '',
      companyName: sanitizeString(payload.companyName) ?? null,
      jobTitle: sanitizeString(payload.jobTitle) ?? null,
      street: sanitizeString(payload.street) ?? null,
      city: sanitizeString(payload.city) ?? null,
      postalCode: sanitizeString(payload.postalCode) ?? null,
      contactEmail: sanitizeEmail(payload.contactEmail) ?? null,
      contactPhone: sanitizePhone(payload.contactPhone) ?? null,
      website: sanitizeUrl(payload.website) ?? null,
      instagram: sanitizeUrl(payload.instagram) ?? null,
      facebook: sanitizeUrl(payload.facebook) ?? null,
      twitter: sanitizeUrl(payload.twitter) ?? null,
      linkedin: sanitizeUrl(payload.linkedin) ?? null,
      youtube: sanitizeUrl(payload.youtube) ?? null,
      tiktok: sanitizeUrl(payload.tiktok) ?? null,
      pinterest: sanitizeUrl(payload.pinterest) ?? null,
      socialMediaOther: sanitizeUrl(payload.socialMediaOther) ?? null,
      notes: sanitizeString(payload.notes) ?? null,
    };
  }

  /**
   * Sanitizes business card update input
   */
  private sanitizeBusinessCardUpdate(payload: BusinessCardUpdate): BusinessCardUpdate {
    const sanitized: BusinessCardUpdate = {};
    if (payload.firstName !== undefined)
      sanitized.firstName = sanitizeString(payload.firstName) || '';
    if (payload.lastName !== undefined) sanitized.lastName = sanitizeString(payload.lastName) || '';
    if (payload.displayName !== undefined)
      sanitized.displayName = sanitizeString(payload.displayName) || '';
    if (payload.companyName !== undefined)
      sanitized.companyName = sanitizeString(payload.companyName);
    if (payload.jobTitle !== undefined) sanitized.jobTitle = sanitizeString(payload.jobTitle);
    if (payload.street !== undefined) sanitized.street = sanitizeString(payload.street);
    if (payload.city !== undefined) sanitized.city = sanitizeString(payload.city);
    if (payload.postalCode !== undefined) sanitized.postalCode = sanitizeString(payload.postalCode);
    if (payload.contactEmail !== undefined)
      sanitized.contactEmail = sanitizeEmail(payload.contactEmail) || undefined;
    if (payload.contactPhone !== undefined)
      sanitized.contactPhone = sanitizePhone(payload.contactPhone) || undefined;
    if (payload.website !== undefined)
      sanitized.website = sanitizeUrl(payload.website) ?? undefined;
    if (payload.instagram !== undefined)
      sanitized.instagram = sanitizeUrl(payload.instagram) ?? undefined;
    if (payload.facebook !== undefined)
      sanitized.facebook = sanitizeUrl(payload.facebook) ?? undefined;
    if (payload.twitter !== undefined)
      sanitized.twitter = sanitizeUrl(payload.twitter) ?? undefined;
    if (payload.linkedin !== undefined)
      sanitized.linkedin = sanitizeUrl(payload.linkedin) ?? undefined;
    if (payload.youtube !== undefined)
      sanitized.youtube = sanitizeUrl(payload.youtube) ?? undefined;
    if (payload.tiktok !== undefined) sanitized.tiktok = sanitizeUrl(payload.tiktok) ?? undefined;
    if (payload.pinterest !== undefined)
      sanitized.pinterest = sanitizeUrl(payload.pinterest) ?? undefined;
    if (payload.socialMediaOther !== undefined)
      sanitized.socialMediaOther = sanitizeUrl(payload.socialMediaOther) ?? undefined;
    if (payload.notes !== undefined) sanitized.notes = sanitizeString(payload.notes);
    return sanitized;
  }

  /**
   * Checks if a user has a business card.
   */
  async hasCard(userId: string): Promise<Result<boolean, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'hasCard', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getUserDocRef(userId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(ErrorMapper.userNotFound(contextString));
      }

      const userData = snapshot.data();
      return ok(!!userData?.businessCard);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Retrieves a user's business card.
   */
  async getCard(userId: string): Promise<Result<BusinessCard | null, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getCard', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getUserDocRef(userId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(ErrorMapper.userNotFound(contextString));
      }

      const userData = snapshot.data();
      if (!userData?.businessCard) {
        return ok(null);
      }

      try {
        const validation = validateWithSchema(
          businessCardSchema,
          userData.businessCard,
          contextString,
        );

        if (!validation.success) {
          return err(validation.error);
        }

        return ok(validation.value as BusinessCard);
      } catch (error) {
        if (error instanceof z.ZodError) {
          LoggingService.error('Failed to parse business card data from database', {
            component: this.context,
            method: 'getCard',
            // issues: error.issues,
          });
          return err(
            ErrorMapper.createGenericError(
              ErrorCode.DB_VALIDATION_ERROR,
              'Failed to parse business card data from database',
              'Data integrity issue detected. Please contact support.',
              contextString,
              error.issues,
            ),
          );
        }
        // Re-throw other errors
        throw error;
      }
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Creates a new business card for a user.
   */
  async create(
    userId: string,
    payload: BusinessCardInput,
  ): Promise<Result<BusinessCard, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input
      const sanitized = this.sanitizeBusinessCardInput(payload);

      // 2. Validate input
      const validation = validateWithSchema(businessCardInputSchema, sanitized, contextString);
      if (!validation.success) {
        return err(validation.error);
      }

      // 3. Create business card using factory
      const businessCardData = defaultBusinessCard(userId);
      const now = new Date();
      const newCard: BusinessCard = {
        ...validation.value,
        ...businessCardData,
        createdAt: now,
        updatedAt: now,
      };

      // 4. Save to Firestore
      const docRef = this.getUserDocRef(userId);
      await updateDoc(docRef, {
        businessCard: newCard,
        updatedAt: serverTimestamp(),
        'setup.customBusinessCardSetup': true,
      });

      return ok(newCard);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Updates an existing business card for a user.
   */
  async update(userId: string, payload: BusinessCardUpdate): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input
      const sanitized = this.sanitizeBusinessCardUpdate(payload);

      // 2. Validate input
      const validation = validateWithSchema(businessCardUpdateSchema, sanitized, contextString);
      if (!validation.success) {
        return err(validation.error);
      }

      // 3. Get current card
      const currentCardResult = await this.getCard(userId);
      if (!currentCardResult.success) {
        return currentCardResult;
      }

      const currentCard = currentCardResult.value;
      if (!currentCard) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Business card not found',
            'Business card not found',
            contextString,
          ),
        );
      }

      // 4. Merge updates with existing card
      const updatedCard: BusinessCard = {
        ...currentCard,
        ...validation.value,
        updatedAt: new Date(),
      };

      // 5. Remove undefined values before saving (Firestore doesn't accept undefined)
      const sanitizedCard = removeUndefinedValues(updatedCard) as BusinessCard;

      // 6. Save to Firestore
      const docRef = this.getUserDocRef(userId);
      await updateDoc(docRef, {
        businessCard: sanitizedCard,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Deletes a business card for a user.
   */
  async delete(userId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getUserDocRef(userId);

      // Delete storage image (non-critical)
      const storageRef = this.getStorageRef(userId);
      try {
        await deleteObject(storageRef);
      } catch (storageError: unknown) {
        if (storageError && typeof storageError === 'object' && 'code' in storageError) {
          if (storageError.code === 'storage/object-not-found') {
            // This is fine, the file just doesn't exist.
            // We can proceed to delete the Firestore document.
          } else {
            // It's a different, real storage error
            return err(ErrorMapper.fromFirestore(storageError, contextString));
          }
        } else {
          // It's some other unknown error
          return err(ErrorMapper.fromFirestore(storageError, contextString));
        }
      }

      // Delete the businessCard field from Firestore
      await updateDoc(docRef, {
        businessCard: deleteField(),
        'setup.customBusinessCardSetup': false,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Updates business card contact information.
   */
  async updateContact(
    userId: string,
    payload: BusinessCardContactUpdate,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'updateContact', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input
      const sanitized: BusinessCardContactUpdate = {};
      if (payload.firstName !== undefined)
        sanitized.firstName = sanitizeString(payload.firstName) || '';
      if (payload.lastName !== undefined)
        sanitized.lastName = sanitizeString(payload.lastName) || '';
      if (payload.displayName !== undefined)
        sanitized.displayName = sanitizeString(payload.displayName) || '';
      if (payload.companyName !== undefined)
        sanitized.companyName = sanitizeString(payload.companyName);
      if (payload.jobTitle !== undefined) sanitized.jobTitle = sanitizeString(payload.jobTitle);
      if (payload.street !== undefined) sanitized.street = sanitizeString(payload.street);
      if (payload.city !== undefined) sanitized.city = sanitizeString(payload.city);
      if (payload.postalCode !== undefined)
        sanitized.postalCode = sanitizeString(payload.postalCode);
      if (payload.contactEmail !== undefined)
        sanitized.contactEmail = sanitizeEmail(payload.contactEmail) || undefined;
      if (payload.contactPhone !== undefined)
        sanitized.contactPhone = sanitizePhone(payload.contactPhone) || undefined;

      // 2. Validate input
      const validation = validateWithSchema(
        businessCardContactUpdateSchema,
        sanitized,
        contextString,
      );
      if (!validation.success) {
        return err(validation.error);
      }

      // 3. Get current card
      const currentCardResult = await this.getCard(userId);
      if (!currentCardResult.success) {
        return currentCardResult;
      }

      const currentCard = currentCardResult.value;
      if (!currentCard) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Business card not found',
            'Business card not found',
            contextString,
          ),
        );
      }

      // 4. Merge contact updates
      const updatedCard: BusinessCard = {
        ...currentCard,
        ...validation.value,
        updatedAt: new Date(),
      };

      // 5. Remove undefined values before saving (Firestore doesn't accept undefined)
      const sanitizedCard = removeUndefinedValues(updatedCard) as BusinessCard;

      // 6. Save to Firestore
      const docRef = this.getUserDocRef(userId);
      await updateDoc(docRef, {
        businessCard: sanitizedCard,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Updates business card social media information.
   */
  async updateSocialMedia(
    userId: string,
    payload: BusinessCardSocialMediaUpdate,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'updateSocialMedia', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input
      const sanitized: BusinessCardSocialMediaUpdate = {};
      if (payload.instagram !== undefined)
        sanitized.instagram = sanitizeUrl(payload.instagram) ?? undefined;
      if (payload.facebook !== undefined)
        sanitized.facebook = sanitizeUrl(payload.facebook) ?? undefined;
      if (payload.twitter !== undefined)
        sanitized.twitter = sanitizeUrl(payload.twitter) ?? undefined;
      if (payload.linkedin !== undefined)
        sanitized.linkedin = sanitizeUrl(payload.linkedin) ?? undefined;
      if (payload.youtube !== undefined)
        sanitized.youtube = sanitizeUrl(payload.youtube) ?? undefined;
      if (payload.tiktok !== undefined) sanitized.tiktok = sanitizeUrl(payload.tiktok) ?? undefined;
      if (payload.pinterest !== undefined)
        sanitized.pinterest = sanitizeUrl(payload.pinterest) ?? undefined;
      if (payload.socialMediaOther !== undefined)
        sanitized.socialMediaOther = sanitizeUrl(payload.socialMediaOther) ?? undefined;

      // 2. Validate input
      const validation = validateWithSchema(
        businessCardSocialMediaUpdateSchema,
        sanitized,
        contextString,
      );
      if (!validation.success) {
        return err(validation.error);
      }

      // 3. Get current card
      const currentCardResult = await this.getCard(userId);
      if (!currentCardResult.success) {
        return currentCardResult;
      }

      const currentCard = currentCardResult.value;
      if (!currentCard) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Business card not found',
            'Business card not found',
            contextString,
          ),
        );
      }

      // 4. Merge social media updates
      const updatedCard: BusinessCard = {
        ...currentCard,
        ...validation.value,
        updatedAt: new Date(),
      };

      // 5. Remove undefined values before saving (Firestore doesn't accept undefined)
      const sanitizedCard = removeUndefinedValues(updatedCard) as BusinessCard;

      // 6. Save to Firestore
      const docRef = this.getUserDocRef(userId);
      await updateDoc(docRef, {
        businessCard: sanitizedCard,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Generates a QR code for a business card.
   */
  async generateQRCode(
    userId: string,
    _config?: Partial<BusinessCardQRCode>,
  ): Promise<Result<string, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'generateQRCode', userId);
    const contextString = ErrorContextBuilder.toString(context);
    console.log('generateQRCode', userId, _config);
    try {
      // This would typically call a QR code generation library
      // For now, return the storage URL if it exists
      const storageRef = this.getStorageRef(userId);
      const url = await getDownloadURL(storageRef);
      return ok(url);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Generates a vCard for a business card.
   */
  async generateVCard(
    userId: string,
    config?: Partial<BusinessCardVCard>,
  ): Promise<Result<string, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'generateVCard', userId);
    const contextString = ErrorContextBuilder.toString(context);
    console.log('generateVCard', userId, config);
    try {
      const cardResult = await this.getCard(userId);
      if (!cardResult.success) {
        return cardResult;
      }

      if (!cardResult.value) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Business card not found',
            'Business card not found',
            contextString,
          ),
        );
      }

      const card = cardResult.value;
      const version = config?.version || DEFAULTS.BUSINESS_CARD_VERSION;

      // Build vCard using flattened fields
      const addressParts = [card.street, card.city, card.postalCode].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(';') : '';

      const vCard = [
        'BEGIN:VCARD',
        `VERSION:${version}`,
        `FN:${card.displayName}`,
        card.firstName ? `N:${card.lastName || ''};${card.firstName};;;` : '',
        card.companyName ? `ORG:${card.companyName}` : '',
        card.jobTitle ? `TITLE:${card.jobTitle}` : '',
        card.contactEmail ? `EMAIL:${card.contactEmail}` : '',
        card.contactPhone ? `TEL:${card.contactPhone}` : '',
        address ? `ADR:;;${address};;;` : '',
        card.website ? `URL:${card.website}` : '',
        card.instagram ? `X-SOCIALPROFILE;TYPE=instagram:${card.instagram}` : '',
        card.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${card.linkedin}` : '',
        card.twitter ? `X-SOCIALPROFILE;TYPE=twitter:${card.twitter}` : '',
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\n');

      return ok(vCard);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Shares a business card via various methods.
   */
  async shareCard(userId: string, _payload: BusinessCardShare): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'shareCard', userId);
    const contextString = ErrorContextBuilder.toString(context);
    console.log('shareCard', userId, _payload);
    try {
      const cardResult = await this.getCard(userId);
      if (!cardResult.success) {
        return cardResult;
      }

      if (!cardResult.value) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Business card not found',
            'Business card not found',
            contextString,
          ),
        );
      }

      // Implementation would depend on the sharing method
      // (email service, SMS service, etc.)
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Uploads a QR code image for a business card.
   */
  async uploadQRImage(userId: string, imageBlob: Blob): Promise<Result<string, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'uploadQRImage', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const storageRef = this.getStorageRef(userId);
      await uploadBytes(storageRef, imageBlob);
      const url = await getDownloadURL(storageRef);

      // Update user document with QR image path
      const docRef = this.getUserDocRef(userId);
      await updateDoc(docRef, {
        'setup.businessCardPath': url,
        updatedAt: serverTimestamp(),
      });

      return ok(url);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }
}

export const businessCardRepository = new FirestoreBusinessCardRepository();
