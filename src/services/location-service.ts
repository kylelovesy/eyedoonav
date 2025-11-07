/*---------------------------------------
File: src/services/location-service.ts
Description: Location service for the Eye-Doo application.

Author: Kyle Lovesy
Date: 04/11-2025 - 11.00
Version: 2.0.0
---------------------------------------*/

import { ILocationRepository } from '@/repositories/i-location-repository';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  LocationList,
  LocationItem,
  LocationItemInput,
  LocationConfig,
  locationItemInputSchema,
  locationItemSchema,
  locationConfigSchema,
  defaultLocationItem,
} from '@/domain/project/location.schema';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { sanitizeString } from '@/utils/sanitization-helpers';
import { CreatedBy } from '@/constants/enums';
import { ErrorCode } from '@/constants/error-code-registry';
import { generateId } from '@/utils/id-generator';
import { z } from 'zod';
import * as Linking from 'expo-linking';
import { withRetry } from '@/utils/error-recovery';

const CoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const ResultSchema = z.object({
  geometry: CoordinatesSchema,
});

const OpenCageResponseSchema = z.object({
  results: z.array(ResultSchema),
});

export interface GeocodeCoordinates {
  lat: number;
  lng: number;
}

/**
 * @class LocationService
 * @description Handles business logic for managing location data.
 * It validates inputs, handles geocoding, and delegates data access to the repository.
 */
export class LocationService {
  private readonly context = 'LocationService';

  constructor(private locationRepo: ILocationRepository) {}

  /**
   * Geocodes an address using OpenCage API.
   *
   * @param address - The address to geocode
   * @returns Result containing geocoded coordinates or an error
   *
   * @example
   * ```typescript
   * const result = await locationService.geocodeAddress('123 Main St, London, SW1A 1AA');
   * if (result.success) {
   *   console.log('Coordinates:', result.value.lat, result.value.lng);
   * }
   * ```
   */
  async geocodeAddress(address: string): Promise<Result<GeocodeCoordinates, AppError>> {
    const sanitizedForLogging = sanitizeString(address);
    const context = ErrorContextBuilder.fromService(
      this.context,
      'geocodeAddress',
      undefined,
      undefined,
      { address: sanitizedForLogging?.substring(0, 50) || 'unknown' },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Sanitize address input (validation - don't retry on validation errors)
    const sanitizedAddress = sanitizeString(address);
    if (!sanitizedAddress) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Address is required',
          'Please provide a valid address',
          contextString,
        ),
      );
    }

    const apiKey = process.env.EXPO_PUBLIC_OPENCAGE_API_KEY as string;

    if (!apiKey) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.NETWORK_SERVER_ERROR,
          'OpenCage API key is required',
          'Geocoding service is not configured. Please contact support.',
          contextString,
        ),
      );
    }

    const normalizedAddress = this.normalizeUKPostcode(sanitizedAddress);
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(normalizedAddress)}&key=${apiKey}`;

    // Wrap fetch operation with retry logic (only retry on network/server errors)
    return await withRetry(
      async () => {
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) {
            return err(
              ErrorMapper.createGenericError(
                ErrorCode.NETWORK_SERVER_ERROR,
                'Geocoding API request failed',
                'Unable to geocode address. Please check the address and try again.',
                contextString,
                undefined,
                true, // Retryable
              ),
            );
          }

          const json = (await res.json()) as unknown;
          const data = OpenCageResponseSchema.safeParse(json);

          if (!data.success) {
            return err(ErrorMapper.fromZod(data.error, contextString));
          }

          if (data.data.results.length === 0) {
            return err(
              ErrorMapper.createGenericError(
                ErrorCode.NETWORK_SERVER_ERROR,
                `No geocoding results found for this address: "${normalizedAddress}"`,
                `Could not find location for "${normalizedAddress}". Please verify the address.`,
                contextString,
                undefined,
                false, // Not retryable - address issue, not network
              ),
            );
          }

          const result = data.data.results[0];
          if (
            !result.geometry ||
            typeof result.geometry.lat !== 'number' ||
            typeof result.geometry.lng !== 'number'
          ) {
            return err(
              ErrorMapper.createGenericError(
                ErrorCode.NETWORK_SERVER_ERROR,
                `Invalid geocoding response for address: "${normalizedAddress}"`,
                `Invalid response from geocoding service. Please try again.`,
                contextString,
                undefined,
                true, // Retryable - might be transient API issue
              ),
            );
          }

          const { lat, lng } = result.geometry;
          return ok({ lat, lng });
        } catch (error) {
          return err(ErrorMapper.fromUnknown(error, contextString));
        }
      },
      {
        maxAttempts: 3,
        delayMs: 1000,
        exponential: true,
      },
    );
  }

  /**
   * Normalizes UK postcode format.
   */
  private normalizeUKPostcode(address: string): string {
    return address.replace(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})\b/i, '$1 $2');
  }

  /**
   * Creates the initial location list for a project.
   *
   * @param projectId - The ID of the project
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const result = await locationService.createInitial('project-123');
   * if (result.success) {
   *   console.log('Location list created');
   * }
   * ```
   */
  async createInitial(projectId: string): Promise<Result<void, AppError>> {
    return this.locationRepo.createInitial(projectId);
  }

  /**
   * Retrieves the location list for a project.
   *
   * @param projectId - The ID of the project
   * @returns Result containing the location list or an error
   *
   * @example
   * ```typescript
   * const result = await locationService.get('project-123');
   * if (result.success) {
   *   console.log('Locations:', result.value.items);
   * }
   * ```
   */
  async get(projectId: string): Promise<Result<LocationList, AppError>> {
    return this.locationRepo.get(projectId);
  }

  /**
   * Updates the location config.
   *
   * @param projectId - The ID of the project
   * @param updates - Partial config updates to apply
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const result = await locationService.updateConfig('project-123', {
   *   finalized: true,
   *   status: SectionStatus.FINALIZED,
   * });
   * if (result.success) {
   *   console.log('Config updated');
   * }
   * ```
   */
  async updateConfig(
    projectId: string,
    updates: Partial<LocationConfig>,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'updateConfig',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Validate updates against config schema
    const validation = validatePartialWithSchema(locationConfigSchema, updates, contextString);
    if (!validation.success) {
      return validation;
    }

    return this.locationRepo.updateConfig(projectId, validation.value as Partial<LocationConfig>);
  }

  /**
   * Adds a new location item.
   * Validates input, geocodes address, and creates the complete item.
   *
   * @param projectId - The ID of the project
   * @param input - Location item input data
   * @returns Result containing the created location item or an error
   */
  async addLocation(
    projectId: string,
    input: LocationItemInput,
  ): Promise<Result<LocationItem, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'addLocation',
      undefined,
      projectId,
      { locationName: input.locationName },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Validate input
    const validation = validateWithSchema(locationItemInputSchema, input, contextString);
    if (!validation.success) {
      return validation as Result<LocationItem, AppError>;
    }

    const validatedInput = validation.value;

    // Geocode address
    const fullAddress = `${validatedInput.locationName}, ${validatedInput.locationAddress1}, ${validatedInput.locationPostcode}`;
    const geocodeResult = await this.geocodeAddress(fullAddress);

    let geopoint: LocationItem['geopoint'] = null;
    let locationNotes = validatedInput.locationNotes;

    if (geocodeResult.success) {
      geopoint = {
        latitude: geocodeResult.value.lat,
        longitude: geocodeResult.value.lng,
      };
    } else {
      locationNotes = geocodeResult.error.userMessage
        ? `Geocoding Issue: ${geocodeResult.error.userMessage}. Please verify the address. ${validatedInput.locationNotes || ''}`
        : validatedInput.locationNotes;
    }

    // Create complete location item using default factory
    const itemWithoutId = defaultLocationItem(validatedInput as LocationItemInput, {
      createdBy: CreatedBy.PHOTOGRAPHER,
      geopoint,
    });

    const newItem = {
      ...itemWithoutId,
      id: generateId(),
      locationNotes: sanitizeString(locationNotes) || undefined,
    } as LocationItem;

    // Validate complete item
    const itemValidation = validateWithSchema(locationItemSchema, newItem, contextString);
    if (!itemValidation.success) {
      return itemValidation as Result<LocationItem, AppError>;
    }

    // Add to repository
    const validatedItem = itemValidation.value as LocationItem;
    const addResult = await this.locationRepo.addLocation(projectId, validatedItem);
    if (!addResult.success) {
      return addResult as Result<LocationItem, AppError>;
    }

    return ok(validatedItem);
  }

  /**
   * Updates an existing location item.
   *
   * @param projectId - The ID of the project
   * @param item - The location item with updates
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const updatedItem = { ...existingItem, locationName: 'New Name' };
   * const result = await locationService.updateLocation('project-123', updatedItem);
   * if (result.success) {
   *   console.log('Location updated');
   * }
   * ```
   */
  async updateLocation(projectId: string, item: LocationItem): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'updateLocation',
      undefined,
      projectId,
      { itemId: item.id },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Validate item
    const validation = validateWithSchema(locationItemSchema, item, contextString);
    if (!validation.success) {
      return validation;
    }

    return this.locationRepo.updateLocation(projectId, validation.value as LocationItem);
  }

  /**
   * Deletes a location item.
   *
   * @param projectId - The ID of the project
   * @param itemId - The ID of the location item to delete
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const result = await locationService.deleteLocation('project-123', 'location-456');
   * if (result.success) {
   *   console.log('Location deleted');
   * }
   * ```
   */
  async deleteLocation(projectId: string, itemId: string): Promise<Result<void, AppError>> {
    return this.locationRepo.deleteLocation(projectId, itemId);
  }

  /**
   * Finalizes locations by geocoding all items and updating finalized status.
   * This handles geocoding for all items that don't have geopoints.
   *
   * @param projectId - The ID of the project
   * @returns Result containing finalized status and updated count
   *
   * @example
   * ```typescript
   * const result = await locationService.finalizeLocations('project-123');
   * if (result.success) {
   *   console.log(`Finalized: ${result.value.finalized}, Updated: ${result.value.updated}`);
   * }
   * ```
   */
  async finalizeLocations(
    projectId: string,
  ): Promise<Result<{ finalized: boolean; updated: number }, AppError>> {
    // Get current location list
    const listResult = await this.locationRepo.get(projectId);
    if (!listResult.success) {
      return listResult as Result<{ finalized: boolean; updated: number }, AppError>;
    }

    const currentList = listResult.value;
    const updatedItems = await Promise.all(
      currentList.items.map(async item => {
        try {
          // Skip if already has valid geopoint
          if (
            item.geopoint &&
            typeof item.geopoint.latitude === 'number' &&
            typeof item.geopoint.longitude === 'number'
          ) {
            return item;
          }

          // Validate we have required address fields
          if (!item.locationName || !item.locationAddress1 || !item.locationPostcode) {
            return {
              ...item,
              geopoint: null,
              locationNotes: `Error: Missing address information. Name: ${
                item.locationName || 'N/A'
              }, Address: ${item.locationAddress1 || 'N/A'}, Postcode: ${
                item.locationPostcode || 'N/A'
              }`,
            };
          }

          // Geocode address with retry logic (already handled in geocodeAddress method)
          const fullAddress = `${item.locationName}, ${item.locationAddress1}, ${item.locationPostcode}`;
          const geocodeResult = await this.geocodeAddress(fullAddress);

          if (geocodeResult.success) {
            return {
              ...item,
              geopoint: {
                latitude: geocodeResult.value.lat,
                longitude: geocodeResult.value.lng,
              },
              locationNotes: item.locationNotes || '',
            };
          } else {
            return {
              ...item,
              geopoint: null,
              locationNotes: `Geocoding Error: ${geocodeResult.error.userMessage}`,
            };
          }
        } catch (error) {
          const message = (error as Error)?.message || 'Unknown geocoding error';
          return {
            ...item,
            geopoint: null,
            locationNotes: `Geocoding Error: ${message}`,
          };
        }
      }),
    );

    // Check if all items have valid geopoints
    const allHaveGeopoint = updatedItems.every(
      x =>
        x.geopoint &&
        typeof x.geopoint.latitude === 'number' &&
        typeof x.geopoint.longitude === 'number',
    );

    // Update in repository
    return this.locationRepo.finalizeLocations(projectId, updatedItems, allHaveGeopoint);
  }

  /**
   * Subscribes to real-time updates for location list.
   *
   * @param projectId - The ID of the project
   * @param onUpdate - Callback function for when updates occur
   * @returns Unsubscribe function to stop listening
   *
   * @example
   * ```typescript
   * const unsubscribe = locationService.subscribe('project-123', (result) => {
   *   if (result.success) {
   *     console.log('Location list updated:', result.value);
   *   }
   * });
   * // Later: unsubscribe();
   * ```
   */
  subscribe(projectId: string, onUpdate: (result: Result<LocationList | null, AppError>) => void) {
    return this.locationRepo.subscribe(projectId, onUpdate);
  }

  /**
   * Opens directions to a location in the device's default maps app.
   * Uses Google Maps URL scheme that works across iOS, Android, and Web.
   *
   * @param location - The location item with geopoint or address information
   * @returns Result indicating success or failure
   *
   * @example
   * ```typescript
   * const result = await locationService.openDirections(locationItem);
   * if (result.success) {
   *   console.log('Directions opened');
   * }
   * ```
   */
  async openDirections(location: LocationItem): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'openDirections',
      undefined,
      undefined,
      { locationId: location.id, locationName: location.locationName },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      let url: string;

      // Prefer geopoint if available
      if (location.geopoint?.latitude && location.geopoint?.longitude) {
        const { latitude, longitude } = location.geopoint;
        // Use Google Maps URL that works on iOS, Android, and Web
        url = `https://maps.google.com/maps?daddr=${latitude},${longitude}`;
      } else if (location.locationAddress1 && location.locationPostcode) {
        // Fallback to address if no geopoint
        const address =
          `${location.locationName || ''}, ${location.locationAddress1}, ${location.locationPostcode}`.trim();
        url = `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
      } else {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            'Location missing address information',
            'Location must have either coordinates or a complete address to open directions.',
            contextString,
          ),
        );
      }

      // Check if URL can be opened
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.NETWORK_SERVER_ERROR,
            'Cannot open maps application',
            'Unable to open maps application. Please install a maps app.',
            contextString,
          ),
        );
      }

      await Linking.openURL(url);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromUnknown(error, contextString));
    }
  }
}
