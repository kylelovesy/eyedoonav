/*---------------------------------------
File: src/repositories/i-location-repository.ts
Description: Location repository interface for the Eye-Doo application.

Author: Kyle Lovesy
Date: 28/10-2025 - 10.00
Version: 1.1.0
---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { LocationList, LocationItem, LocationConfig } from '@/domain/project/location.schema';
import { Unsubscribe } from 'firebase/firestore';

/**
 * @interface ILocationRepository
 * @description Defines the contract for data access operations related to Locations.
 * This is the "Port" in the Ports & Adapters architecture.
 */
export interface ILocationRepository {
  /**
   * Creates an initial location list for a project.
   * @param projectId The ID of the project the location belongs to.
   * @returns A void result.
   */
  createInitial(projectId: string): Promise<Result<void, AppError>>;

  /**
   * Retrieves a location list for a project.
   * @param projectId The ID of the project the location belongs to.
   * @returns The LocationList or an error if not found.
   */
  get(projectId: string): Promise<Result<LocationList, AppError>>;

  /**
   * Updates the config of a location list.
   * @param projectId The ID of the project the location belongs to.
   * @param updates The partial location config to update.
   * @returns A void result.
   */
  updateConfig(
    projectId: string,
    updates: Partial<LocationConfig>,
  ): Promise<Result<void, AppError>>;

  /**
   * Adds a location item to the list.
   * @param projectId The ID of the project the location belongs to.
   * @param item The location item to add (with id already assigned).
   * @returns A void result.
   */
  addLocation(projectId: string, item: LocationItem): Promise<Result<void, AppError>>;

  /**
   * Updates a location item in the list.
   * @param projectId The ID of the project the location belongs to.
   * @param item The location item to update.
   * @returns A void result.
   */
  updateLocation(projectId: string, item: LocationItem): Promise<Result<void, AppError>>;

  /**
   * Deletes a location item from the list.
   * @param projectId The ID of the project the location belongs to.
   * @param itemId The ID of the location item to delete.
   * @returns A void result.
   */
  deleteLocation(projectId: string, itemId: string): Promise<Result<void, AppError>>;

  /**
   * Finalizes locations by geocoding all items and updating finalized status.
   * @param projectId The ID of the project the location belongs to.
   * @param items The updated location items with geocoding results.
   * @param finalized Whether all items have valid geopoints.
   * @returns A result with finalized status and updated count.
   */
  finalizeLocations(
    projectId: string,
    items: LocationItem[],
    finalized: boolean,
  ): Promise<Result<{ finalized: boolean; updated: number }, AppError>>;

  /**
   * Subscribes to real-time updates for a location list.
   * @param projectId The ID of the project the location belongs to.
   * @param onUpdate Callback function for when new data arrives.
   * @returns An unsubscribe function.
   */
  subscribe(
    projectId: string,
    onUpdate: (result: Result<LocationList | null, AppError>) => void,
  ): Unsubscribe;
}
