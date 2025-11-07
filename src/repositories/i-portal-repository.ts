/*---------------------------------------
File: src/ports/i-portal-repository.ts
Description: Portal repository interface for the Eye-Doo application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  ClientPortal,
  ClientPortalInput,
  ClientPortalUpdate,
} from '@/domain/project/portal.schema';
import { PortalStepID } from '@/constants/enums';

/**
 * @interface IPortalRepository
 * @description Defines the contract for data access operations related to Portals.
 * This is the "Port" in the Ports & Adapters architecture.
 */
export interface IPortalRepository {
  /**
   * Creates a new portal.
   * @param userId The ID of the user creating the portal.
   * @param projectId The ID of the project the portal belongs to.
   * @param payload The portal data.
   * @returns The newly created Portal.
   */
  create(
    userId: string,
    projectId: string,
    payload: ClientPortalInput,
  ): Promise<Result<ClientPortal, AppError>>;

  /**
   * Retrieves a single portal by its ID.
   * @param portalId The ID of the portal to retrieve.
   * @param projectId The ID of the project the portal belongs to.
   * @returns The Portal or an error if not found.
   */
  getById(portalId: string, projectId: string): Promise<Result<ClientPortal, AppError>>;

  /**
   * Retrieves all portals for a specific user.
   * @param userId The ID of the user.
   * @returns An array of Portals.
   */
  listByUserId(userId: string): Promise<Result<ClientPortal[], AppError>>;

  /**
   * Subscribes to real-time updates for a user's portals.
   * @param userId The ID of the user.
   * @param onData Callback function for when new data arrives.
   * @param onError Callback function for errors.
   * @returns An unsubscribe function.
   */
  subscribeToUserPortals(
    userId: string,
    onData: (portals: ClientPortal[]) => void,
    onError: (error: AppError) => void,
  ): () => void;

  /**
   * Updates an existing portal.
   * @param portalId The ID of the portal to update.
   * @param projectId The ID of the project the portal belongs to.
   * @param payload The partial portal data to update.
   * @returns A void result.
   */
  update(
    portalId: string,
    projectId: string,
    payload: ClientPortalUpdate,
  ): Promise<Result<void, AppError>>;

  /**
   * Deletes a portal by its ID.
   * @param portalId The ID of the portal to delete.
   * @param projectId The ID of the project the portal belongs to.
   * @returns A void result.
   */
  remove(portalId: string, projectId: string): Promise<Result<void, AppError>>;

  /**
   * Finalizes subcollection config when a portal step is finalized.
   * Updates the subcollection's data document with finalized and photographerReviewed flags.
   * @param projectId The ID of the project.
   * @param sectionId The ID of the portal step/section being finalized.
   * @returns A void result (non-critical operation - errors are logged but don't fail).
   */
  finalizeSubcollectionConfig(
    projectId: string,
    sectionId: PortalStepID,
  ): Promise<Result<void, AppError>>;
}
