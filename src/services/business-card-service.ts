/*---------------------------------------
File: src/services/business-card-service.ts
Description: Business card service - business logic layer for business card operations
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import {
  BusinessCard,
  BusinessCardInput,
  BusinessCardUpdate,
  BusinessCardSocialMediaUpdate,
  BusinessCardContactUpdate,
  BusinessCardQRCode,
  BusinessCardVCard,
  BusinessCardShare,
  businessCardInputSchema,
  businessCardUpdateSchema,
  businessCardContactUpdateSchema,
  businessCardSocialMediaUpdateSchema,
} from '@/domain/user/business-card.schema';
import { IBusinessCardRepository } from '@/repositories/i-business-card-repository';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';

/**
 * @class BusinessCardService
 * @description Business logic layer for business card operations.
 * This is the "Service" in the Ports & Adapters architecture.
 */
export class BusinessCardService {
  private readonly context = 'BusinessCardService';

  constructor(private repository: IBusinessCardRepository) {}

  /**
   * Checks if a user has a business card.
   */
  async hasBusinessCard(userId: string): Promise<Result<boolean, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'hasBusinessCard', userId);
    // const contextString = ErrorContextBuilder.toString(context);

    return await this.repository.hasCard(userId);
  }

  /**
   * Retrieves a user's business card.
   */
  async getBusinessCard(userId: string): Promise<Result<BusinessCard | null, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'getBusinessCard', userId);
    // const contextString = ErrorContextBuilder.toString(context);

    return await this.repository.getCard(userId);
  }

  /**
   * Creates a new business card for a user.
   */
  async createBusinessCard(
    userId: string,
    cardData: BusinessCardInput,
  ): Promise<Result<BusinessCard, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'createBusinessCard', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate input at service layer
    const validation = validateWithSchema(businessCardInputSchema, cardData, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // Delegate to repository (which handles sanitization)
    return await this.repository.create(userId, validation.value as BusinessCardInput);
  }

  /**
   * Updates an existing business card.
   */
  async updateBusinessCard(
    userId: string,
    updates: BusinessCardUpdate,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'updateBusinessCard', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate input at service layer
    const validation = validateWithSchema(businessCardUpdateSchema, updates, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // Delegate to repository (which handles sanitization)
    return await this.repository.update(userId, validation.value);
  }

  /**
   * Deletes a user's business card.
   */
  async deleteBusinessCard(userId: string): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'deleteBusinessCard', userId);
    // const contextString = ErrorContextBuilder.toString(context);

    return await this.repository.delete(userId);
  }

  /**
   * Updates business card contact information.
   */
  async updateContact(
    userId: string,
    contact: BusinessCardContactUpdate,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'updateContact', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate input at service layer
    const validation = validateWithSchema(businessCardContactUpdateSchema, contact, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // Delegate to repository (which handles sanitization)
    return await this.repository.updateContact(userId, validation.value);
  }

  /**
   * Updates business card social media information.
   */
  async updateSocialMedia(
    userId: string,
    socialMedia: BusinessCardSocialMediaUpdate,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'updateSocialMedia', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate input at service layer
    const validation = validateWithSchema(
      businessCardSocialMediaUpdateSchema,
      socialMedia,
      contextString,
    );
    if (!validation.success) {
      return err(validation.error);
    }

    // Delegate to repository (which handles sanitization)
    return await this.repository.updateSocialMedia(userId, validation.value);
  }

  /**
   * Creates a business card and uploads QR code image.
   */
  async saveBusinessCardWithQR(
    userId: string,
    cardData: BusinessCardInput,
    qrImageData: string, // This is base64 data URL
  ): Promise<Result<{ qrImageUrl: string }, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'saveBusinessCardWithQR', userId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate card data
    const cardValidation = validateWithSchema(businessCardInputSchema, cardData, contextString);
    if (!cardValidation.success) {
      return err(cardValidation.error);
    }

    // Convert base64 to Blob
    let qrImageBlob: Blob;
    try {
      // Handle both data URLs (data:image/png;base64,...) and raw base64 strings
      const base64Data = qrImageData.includes(',') ? qrImageData.split(',')[1] : qrImageData;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      qrImageBlob = new Blob([byteArray], { type: 'image/png' });
    } catch (error) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Invalid QR image data',
          'Failed to process QR image. Please try again.',
          contextString,
          error,
          false,
        ),
      );
    }

    // Create the card
    const cardResult = await this.repository.create(
      userId,
      cardValidation.value as BusinessCardInput,
    );
    if (!cardResult.success) {
      return cardResult;
    }

    // Upload QR image (requires cast since uploadQRImage is in implementation)
    if ('uploadQRImage' in this.repository) {
      const uploadResult = await (
        this.repository as unknown as IBusinessCardRepository
      ).uploadQRImage(userId, qrImageBlob);
      if (!uploadResult.success) {
        return uploadResult;
      }
      return ok({ qrImageUrl: uploadResult.value });
    }

    return err(
      ErrorMapper.createGenericError(
        ErrorCode.QR_CODE_EMPTY,
        'QR image upload not supported',
        'QR image upload is not available.',
        contextString,
        undefined,
        false,
      ),
    );
  }

  /**
   * Generates a QR code for a business card.
   */
  async generateQRCode(
    userId: string,
    config?: Partial<BusinessCardQRCode>,
  ): Promise<Result<string, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'generateQRCode', userId);
    // const contextString = ErrorContextBuilder.toString(context);

    return await this.repository.generateQRCode(userId, config);
  }

  /**
   * Generates a vCard for a business card.
   */
  async generateVCard(
    userId: string,
    config?: Partial<BusinessCardVCard>,
  ): Promise<Result<string, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'generateVCard', userId);
    // const contextString = ErrorContextBuilder.toString(context);

    return await this.repository.generateVCard(userId, config);
  }

  /**
   * Shares a business card via various methods.
   */
  async shareCard(userId: string, shareConfig: BusinessCardShare): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'shareCard', userId);
    // const contextString = ErrorContextBuilder.toString(context);

    return await this.repository.shareCard(userId, shareConfig);
  }

  /**
   * Gets the QR code image URL for a business card.
   */
  async getQRImageUrl(userId: string): Promise<Result<string | null, AppError>> {
    // const context = ErrorContextBuilder.fromService(this.context, 'getQRImageUrl', userId);
    // const contextString = ErrorContextBuilder.toString(context);

    return await this.repository.generateQRCode(userId);
  }
}
