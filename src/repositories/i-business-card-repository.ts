/*---------------------------------------
File: src/repositories/i-business-card-repository.ts
Description: Business card repository interface for the Eye-Doo application.

Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
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
} from '@/domain/user/business-card.schema';

/**
 * @interface IBusinessCardRepository
 * @description Defines the contract for data access operations related to Business Cards.
 * This is the "Port" in the Ports & Adapters architecture.
 */
export interface IBusinessCardRepository {
  /**
   * Checks if a user has a business card.
   * @param userId The ID of the user.
   * @returns True if the user has a business card, false otherwise.
   */
  hasCard(userId: string): Promise<Result<boolean, AppError>>;

  /**
   * Retrieves a user's business card.
   * @param userId The ID of the user.
   * @returns The BusinessCard or null if not found.
   */
  getCard(userId: string): Promise<Result<BusinessCard | null, AppError>>;

  /**
   * Creates a new business card for a user.
   * @param userId The ID of the user creating the business card.
   * @param payload The business card data.
   * @returns The newly created BusinessCard.
   */
  create(userId: string, payload: BusinessCardInput): Promise<Result<BusinessCard, AppError>>;

  /**
   * Updates an existing business card.
   * @param userId The ID of the user who owns the business card.
   * @param payload The business card data to update.
   * @returns A void result indicating success or failure.
   */
  update(userId: string, payload: BusinessCardUpdate): Promise<Result<void, AppError>>;

  /**
   * Deletes a user's business card.
   * @param userId The ID of the user whose business card to delete.
   * @returns A void result indicating success or failure.
   */
  delete(userId: string): Promise<Result<void, AppError>>;

  /**
   * Updates business card social media information.
   * @param userId The ID of the user.
   * @param payload The social media data to update.
   * @returns A void result indicating success or failure.
   */
  updateSocialMedia(
    userId: string,
    payload: BusinessCardSocialMediaUpdate,
  ): Promise<Result<void, AppError>>;

  /**
   * Updates business card contact information.
   * @param userId The ID of the user.
   * @param payload The contact data to update.
   * @returns A void result indicating success or failure.
   */
  updateContact(
    userId: string,
    payload: BusinessCardContactUpdate,
  ): Promise<Result<void, AppError>>;

  /**
   * Generates a QR code for a business card.
   * @param userId The ID of the user.
   * @param config The QR code configuration.
   * @returns A base64 encoded QR code image or URL.
   */
  generateQRCode(
    userId: string,
    config?: Partial<BusinessCardQRCode>,
  ): Promise<Result<string, AppError>>;

  /**
   * Generates a vCard for a business card.
   * @param userId The ID of the user.
   * @param config The vCard configuration.
   * @returns The vCard content as a string.
   */
  generateVCard(
    userId: string,
    config?: Partial<BusinessCardVCard>,
  ): Promise<Result<string, AppError>>;

  /**
   * Shares a business card via various methods.
   * @param userId The ID of the user sharing the card.
   * @param payload The sharing configuration.
   * @returns A void result indicating success or failure.
   */
  shareCard(userId: string, payload: BusinessCardShare): Promise<Result<void, AppError>>;

  /**
   * Uploads a QR code image for a business card.
   * @param userId The ID of the user who owns the business card.
   * @param imageBlob The QR code image blob.
   * @returns The URL of the uploaded QR code image.
   */
  uploadQRImage(userId: string, imageBlob: Blob): Promise<Result<string, AppError>>;
}
