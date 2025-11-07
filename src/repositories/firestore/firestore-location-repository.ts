/*---------------------------------------
File: src/repositories/firestore/firestore-location-repository.ts
Description: Firestore location repository implementation for the Eye-Doo application.

Author: Kyle Lovesy
Date: 04/11-2025 - 11.00
Version: 2.0.0
---------------------------------------*/

import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  arrayUnion,
  writeBatch,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { Result, ok, err } from '@/domain/common/result';
import { AppError, FirestoreError } from '@/domain/common/errors';
import {
  LocationList,
  LocationItem,
  LocationConfig,
  locationItemSchema,
  locationListSchema,
  locationConfigSchema,
} from '@/domain/project/location.schema';
import { ILocationRepository } from '@/repositories/i-location-repository';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import {
  sanitizeString,
  sanitizeStringOrUndefined,
  sanitizePersonInfo,
  sanitizeContactInfo,
} from '@/utils/sanitization-helpers';
import { ErrorCode } from '@/constants/error-code-registry';
import { ListType, ListSource, SectionStatus, ActionOn, LocationType } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import { generateId } from '@/utils/id-generator';
import { ListBasePendingUpdate } from '@/domain/common/list-base.schema';

/**
 * @class FirestoreLocationRepository
 * @description Implements the ILocationRepository interface for Cloud Firestore.
 * This is the "Adapter" that connects our application to the Firestore database.
 *
 * Note: Location data is stored in a single document:
 * - projects/{projectId}/locations/data - Complete location list with config and items
 */
export class FirestoreLocationRepository implements ILocationRepository {
  private readonly context = 'FirestoreLocationRepository';

  private getLocationDocRef(projectId: string) {
    return doc(firestore, 'projects', projectId, 'locations', 'data');
  }

  /**
   * Parses a Firestore snapshot into a validated LocationList
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    context: string,
  ): Result<LocationList, AppError> {
    if (!snapshot.exists()) {
      return err(
        new FirestoreError(
          ErrorCode.DB_NOT_FOUND,
          'Location list not found',
          'Location list not found',
          context,
        ),
      );
    }

    const data = convertAllTimestamps(snapshot.data());

    // Extract config fields and separate items/categories
    const { items, pendingUpdates, ...configFields } = data as LocationList & {
      config: LocationConfig;
      items?: LocationItem[];
      pendingUpdates?: ListBasePendingUpdate[];
    };

    // 1. Validate config
    const configValidation = validateWithSchema(locationConfigSchema, configFields, context);
    if (!configValidation.success) {
      return configValidation as Result<LocationList, AppError>;
    }

    // 2. Validate and sanitize items
    const validatedItems = (items || [])
      .map(item => {
        const validation = validateWithSchema(locationItemSchema, item, context);
        if (!validation.success) {
          return null;
        }
        return this.sanitizeLocationItem(validation.value as LocationItem);
      })
      .filter((item): item is LocationItem => item !== null);

    // 3. Build location list
    const locationList: LocationList = {
      config: configValidation.value as LocationConfig,
      items: validatedItems,
      pendingUpdates: pendingUpdates || ([] as ListBasePendingUpdate[]),
    };

    // 4. Validate complete list
    const listValidation = validateWithSchema(locationListSchema, locationList, context);
    if (listValidation.success) {
      return ok(listValidation.value as LocationList);
    }
    return listValidation as Result<LocationList, AppError>;
  }

  /**
   * Sanitizes a location item by cleaning all string fields
   */
  private sanitizeLocationItem(item: LocationItem): LocationItem {
    return {
      ...item,
      itemName: sanitizeString(item.itemName) || '',
      itemDescription: sanitizeString(item.itemDescription) || '',
      locationName: sanitizeString(item.locationName) || '',
      locationAddress1: sanitizeString(item.locationAddress1) || '',
      locationPostcode: sanitizeString(item.locationPostcode) || '',
      locationNotes: sanitizeStringOrUndefined(item.locationNotes ?? null),
      nextLocationTravelArrangements: sanitizeStringOrUndefined(
        item.nextLocationTravelArrangements ?? null,
      ),
      locationContactPerson: item.locationContactPerson
        ? sanitizePersonInfo(item.locationContactPerson)
        : null,
      locationContactInfo: item.locationContactInfo
        ? sanitizeContactInfo(item.locationContactInfo)
        : null,
      notes:
        item.notes !== null && item.notes !== undefined ? sanitizeString(item.notes) : item.notes,
    };
  }

  async createInitial(projectId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'createInitial',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getLocationDocRef(projectId);

      const initialConfig: LocationConfig = {
        id: generateId(),
        type: ListType.LOCATION,
        source: ListSource.PROJECT_LIST,
        multipleLocations: false,
        status: SectionStatus.UNLOCKED,
        actionOn: ActionOn.PHOTOGRAPHER,
        finalized: false,
        defaultValues: false,
        version: DEFAULTS.VERSION,
        clientLastViewed: undefined,
        totalCategories: 0,
        totalItems: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const configValidation = validateWithSchema(
        locationConfigSchema,
        initialConfig,
        contextString,
      );
      if (!configValidation.success) {
        return configValidation;
      }

      const locationList: LocationList = {
        config: configValidation.value as LocationConfig,
        items: [],
        pendingUpdates: [],
      };

      const listValidation = validateWithSchema(locationListSchema, locationList, contextString);
      if (!listValidation.success) {
        return listValidation;
      }

      const batch = writeBatch(firestore);
      batch.set(docRef, {
        ...configValidation.value,
        categories: [],
        items: [],
        pendingUpdates: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async get(projectId: string): Promise<Result<LocationList, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'get', undefined, projectId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getLocationDocRef(projectId);
      const snapshot = await getDoc(docRef);

      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async updateConfig(
    projectId: string,
    updates: Partial<LocationConfig>,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'updateConfig',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getLocationDocRef(projectId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      // 1. Validate partial updates
      const updatesValidation = validatePartialWithSchema(
        locationConfigSchema,
        updates,
        contextString,
      );
      if (!updatesValidation.success) {
        return updatesValidation;
      }

      // 2. Update in Firestore
      await updateDoc(docRef, {
        ...updatesValidation.value,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async addLocation(projectId: string, item: LocationItem): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'addLocation',
      undefined,
      projectId,
      { itemId: item.id },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize item
      const sanitized = this.sanitizeLocationItem(item);

      // 2. Validate item
      const validation = validateWithSchema(locationItemSchema, sanitized, contextString);
      if (!validation.success) {
        return validation;
      }

      // 3. Get current list to check for duplicates
      const docRef = this.getLocationDocRef(projectId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      const data = convertAllTimestamps(snapshot.data()) as { items?: LocationItem[] };
      const existingItems = data.items || [];

      // 4. Check for duplicate item ID
      if (existingItems.some(existing => existing.id === validation.value.id)) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            `Location with id ${validation.value.id} already exists`,
            'This location already exists',
            contextString,
          ),
        );
      }

      // 5. Add item
      await updateDoc(docRef, {
        items: arrayUnion(validation.value),
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async updateLocation(projectId: string, item: LocationItem): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'updateLocation',
      undefined,
      projectId,
      { itemId: item.id },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize item
      const sanitized = this.sanitizeLocationItem(item);

      // 2. Validate item
      const validation = validateWithSchema(locationItemSchema, sanitized, contextString);
      if (!validation.success) {
        return validation;
      }

      // 3. Get current list
      const docRef = this.getLocationDocRef(projectId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      const data = convertAllTimestamps(snapshot.data()) as { items?: LocationItem[] };
      const items = data.items || [];

      // 4. Check if item exists
      if (!items.some(x => x.id === validation.value.id)) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.VALIDATION_FAILED,
            `Location with id ${validation.value.id} not found`,
            'Location not found',
            contextString,
          ),
        );
      }

      // 5. Update item
      const updatedItems = items.map(x => (x.id === validation.value.id ? validation.value : x));

      await updateDoc(docRef, {
        items: updatedItems,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async deleteLocation(projectId: string, itemId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'deleteLocation',
      undefined,
      projectId,
      { itemId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Get current list
      const docRef = this.getLocationDocRef(projectId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      const data = convertAllTimestamps(snapshot.data()) as { items?: LocationItem[] };
      const items = data.items || [];

      // 2. Filter out item
      const updatedItems = items.filter(x => x.id !== itemId);

      // 3. Save updated list
      await updateDoc(docRef, {
        items: updatedItems,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async finalizeLocations(
    projectId: string,
    items: LocationItem[],
    finalized: boolean,
  ): Promise<Result<{ finalized: boolean; updated: number }, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'finalizeLocations',
      undefined,
      projectId,
      { itemCount: items.length, finalized },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Validate and sanitize all items
      const validatedItems: LocationItem[] = [];
      for (const item of items) {
        const sanitized = this.sanitizeLocationItem(item);
        const validation = validateWithSchema(locationItemSchema, sanitized, contextString);
        if (!validation.success) {
          return validation as Result<{ finalized: boolean; updated: number }, AppError>;
        }
        validatedItems.push(validation.value as LocationItem);
      }

      // 2. Update items and finalized status
      const docRef = this.getLocationDocRef(projectId);
      const updates: {
        items: LocationItem[];
        finalized?: boolean;
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        items: validatedItems,
        updatedAt: serverTimestamp(),
      };

      if (finalized) {
        updates.finalized = true;
      }

      await updateDoc(docRef, updates);

      return ok({ finalized, updated: validatedItems.length });
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  subscribe(
    projectId: string,
    onUpdate: (result: Result<LocationList | null, AppError>) => void,
  ): Unsubscribe {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'subscribe',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);
    const docRef = this.getLocationDocRef(projectId);

    return onSnapshot(
      docRef,
      snapshot => {
        try {
          if (!snapshot.exists()) {
            onUpdate(ok(null));
            return;
          }

          const result = this.parseSnapshot(snapshot, contextString);
          onUpdate(result);
        } catch (error) {
          onUpdate(err(ErrorMapper.fromFirestore(error, contextString)));
        }
      },
      error => {
        onUpdate(err(ErrorMapper.fromFirestore(error, contextString)));
      },
    );
  }
}

export const locationRepository = new FirestoreLocationRepository();
