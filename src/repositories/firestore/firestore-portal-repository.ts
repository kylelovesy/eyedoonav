/*---------------------------------------
File: src/repositories/firestore/firestore-portal-repository.ts
Description: Firestore portal repository implementation for the Eye-Doo application.

Author: Kyle Lovesy
Date: 04/11/2025 - 11.00
Version: 2.0.0 (FINAL)
---------------------------------------*/
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { IPortalRepository } from '@/repositories/i-portal-repository';
import { Result, ok, err } from '@/domain/common/result';
import { AppError, FirestoreError } from '@/domain/common/errors';
import {
  ClientPortal,
  ClientPortalInput,
  ClientPortalUpdate,
  PortalStep,
  clientPortalSchema,
  clientPortalInputSchema,
  clientPortalUpdateSchema,
} from '@/domain/project/portal.schema';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { sanitizeString } from '@/utils/sanitization-helpers';
import { generateId } from '@/utils/id-generator';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import { ErrorCode } from '@/constants/error-code-registry';
import { PortalStepID } from '@/constants/enums';

/**
 * @class FirestorePortalRepository
 * @description Implements the IPortalRepository interface for Cloud Firestore.
 * This is the "Adapter" that connects our application to the Firestore database.
 */
export class FirestorePortalRepository implements IPortalRepository {
  private readonly context = 'FirestorePortalRepository';

  private getPortalDocRef(projectId: string, portalId: string) {
    return doc(firestore, 'projects', projectId, 'clientPortal', portalId);
  }

  private getProjectDocRef(projectId: string) {
    return doc(firestore, 'projects', projectId);
  }

  /**
   * Parses a Firestore snapshot into a validated ClientPortal
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    portalId: string,
    projectId: string,
    contextString: string,
  ): Result<ClientPortal, AppError> {
    if (!snapshot.exists()) {
      return err(
        new FirestoreError(
          ErrorCode.DB_NOT_FOUND,
          'Portal not found',
          'Portal not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps({
      id: portalId,
      projectId,
      ...rawData,
    });

    // Validate with schema
    const validationResult = validateWithSchema(clientPortalSchema, data, contextString);

    if (!validationResult.success) {
      return err(validationResult.error);
    }

    return ok(validationResult.value as ClientPortal);
  }

  /**
   * Sanitizes portal input
   */
  private sanitizePortalInput(payload: ClientPortalInput): ClientPortalInput {
    return {
      ...payload,
      portalMessage: payload.portalMessage
        ? sanitizeString(payload.portalMessage)
        : payload.portalMessage,
      steps: payload.steps.map(step => ({
        ...step,
        stepTitle: sanitizeString(step.stepTitle) || step.stepTitle,
      })),
    };
  }

  /**
   * Sanitizes portal update
   */
  private sanitizePortalUpdate(payload: ClientPortalUpdate): ClientPortalUpdate {
    const sanitized: ClientPortalUpdate = { ...payload };

    if (sanitized.portalMessage !== undefined) {
      sanitized.portalMessage = sanitizeString(sanitized.portalMessage);
    }

    if (sanitized.steps !== undefined) {
      sanitized.steps = sanitized.steps.map(step => ({
        ...step,
        stepTitle: sanitizeString(step.stepTitle) || step.stepTitle,
      }));
    }

    return sanitized;
  }

  /**
   * Removes undefined values from an object
   * Firestore doesn't accept undefined values in updates
   */
  private removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key as keyof T] = value as T[keyof T];
      }
    }
    return result;
  }

  /**
   * Creates a new portal
   */
  async create(
    userId: string,
    projectId: string,
    payload: ClientPortalInput,
  ): Promise<Result<ClientPortal, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId, projectId, {
      operation: 'create',
    });
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input
      const sanitized = this.sanitizePortalInput(payload);

      // 2. Validate input
      const validation = validateWithSchema(clientPortalInputSchema, sanitized, contextString);
      if (!validation.success) {
        return validation as Result<ClientPortal, AppError>;
      }

      // 3. Generate portal ID and timestamps
      const portalId = generateId();
      const currentDate = new Date();

      // Zod validation applies defaults, but TypeScript doesn't know this
      // So we explicitly provide defaults for required fields
      const newPortal: ClientPortal = {
        id: portalId,
        projectId,
        isSetup: validation.value.isSetup ?? false,
        isEnabled: validation.value.isEnabled ?? false,
        currentStepID: validation.value.currentStepID ?? PortalStepID.WELCOME,
        portalMessage: validation.value.portalMessage,
        steps: (validation.value.steps ?? []) as PortalStep[],
        totalSteps: validation.value.steps?.length || 0,
        completedSteps: 0,
        completionPercentage: 0,
        lastClientActivity: undefined,
        clientAccessCount: 0,
        createdAt: currentDate,
        updatedAt: currentDate,
      };

      // 4. Validate complete portal
      const portalValidation = validateWithSchema(clientPortalSchema, newPortal, contextString);
      if (!portalValidation.success) {
        return portalValidation as Result<ClientPortal, AppError>;
      }

      // 5. Save to Firestore
      const docRef = this.getPortalDocRef(projectId, portalId);
      await setDoc(docRef, {
        ...portalValidation.value,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 6. Update project with portal reference
      const projectRef = this.getProjectDocRef(projectId);
      await updateDoc(projectRef, {
        portalId,
        'metadata.hasLaunchedDashboard': true,
        'metadata.portalSetupDate': serverTimestamp(),
      });

      return ok(portalValidation.value as ClientPortal);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Retrieves a portal by its ID
   */
  async getById(portalId: string, projectId: string): Promise<Result<ClientPortal, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'getById',
      undefined,
      projectId,
      { portalId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getPortalDocRef(projectId, portalId);
      const snapshot = await getDoc(docRef);

      return this.parseSnapshot(snapshot, portalId, projectId, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Lists all portals for a user
   */
  async listByUserId(userId: string): Promise<Result<ClientPortal[], AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'listByUserId',
      userId,
      undefined,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // First, get all projects for the user
      const projectsQuery = query(collection(firestore, 'projects'), where('userId', '==', userId));
      const projectsSnapshot = await getDocs(projectsQuery);

      const portals: ClientPortal[] = [];

      // For each project, try to get its portal
      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        const portalId = projectDoc.data()?.portalId;

        if (!portalId) continue;

        const portalRef = this.getPortalDocRef(projectId, portalId);
        const portalSnapshot = await getDoc(portalRef);

        if (portalSnapshot.exists()) {
          const result = this.parseSnapshot(portalSnapshot, portalId, projectId, contextString);
          if (result.success) {
            portals.push(result.value);
          }
        }
      }

      return ok(portals);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Subscribes to user portals
   */
  subscribeToUserPortals(
    userId: string,
    onData: (portals: ClientPortal[]) => void,
    onError: (error: AppError) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'subscribeToUserPortals',
      userId,
      undefined,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Subscribe to user's projects
    const projectsQuery = query(collection(firestore, 'projects'), where('userId', '==', userId));

    const unsubscribe = onSnapshot(
      projectsQuery,
      async projectsSnapshot => {
        try {
          const portals: ClientPortal[] = [];
          const errors: AppError[] = [];

          for (const projectDoc of projectsSnapshot.docs) {
            const projectId = projectDoc.id;
            const portalId = projectDoc.data()?.portalId;

            if (!portalId) continue;

            const portalRef = this.getPortalDocRef(projectId, portalId);
            const portalSnapshot = await getDoc(portalRef);

            if (portalSnapshot.exists()) {
              const result = this.parseSnapshot(portalSnapshot, portalId, projectId, contextString);
              if (result.success) {
                portals.push(result.value);
              } else {
                errors.push(result.error);
              }
            }
          }

          // If we have portals, return them (even if some failed to parse)
          // Only call onError if ALL portals failed AND we had errors
          if (portals.length > 0) {
            onData(portals);
          } else if (errors.length > 0) {
            onError(errors[0]);
          } else {
            // No portals found - this is valid, return empty array
            onData([]);
          }
        } catch (error) {
          onError(ErrorMapper.fromFirestore(error, contextString));
        }
      },
      error => {
        onError(ErrorMapper.fromFirestore(error, contextString));
      },
    );

    return unsubscribe;
  }

  /**
   * Updates a portal
   */
  async update(
    portalId: string,
    projectId: string,
    payload: ClientPortalUpdate,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'update',
      undefined,
      projectId,
      { portalId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input
      const sanitized = this.sanitizePortalUpdate(payload);

      // 2. Validate input
      const validation = validatePartialWithSchema(
        clientPortalUpdateSchema,
        sanitized,
        contextString,
      );
      if (!validation.success) {
        return validation;
      }

      // 3. Remove undefined values (Firestore doesn't accept undefined)
      const cleanedData = this.removeUndefined(validation.value);

      // 4. Update in Firestore
      const docRef = this.getPortalDocRef(projectId, portalId);
      await updateDoc(docRef, {
        ...cleanedData,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Removes a portal
   */
  async remove(portalId: string, projectId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'remove',
      undefined,
      projectId,
      { portalId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = this.getPortalDocRef(projectId, portalId);
      await deleteDoc(docRef);

      // Update project to remove portal reference
      const projectRef = this.getProjectDocRef(projectId);
      await updateDoc(projectRef, {
        portalId: null,
        'metadata.hasLaunchedDashboard': false,
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Gets subcollection path for a portal step
   */
  private getSubcollectionPath(sectionId: PortalStepID): string | null {
    const pathMap: Partial<Record<PortalStepID, string>> = {
      [PortalStepID.KEY_PEOPLE]: 'keyPeople',
      [PortalStepID.LOCATIONS]: 'locations',
      [PortalStepID.GROUP_SHOTS]: 'groupShots',
      [PortalStepID.PHOTO_REQUESTS]: 'photoRequests',
      [PortalStepID.TIMELINE]: 'timeline',
    };
    return pathMap[sectionId] || null;
  }

  /**
   * Finalizes subcollection config when a portal step is finalized
   */
  async finalizeSubcollectionConfig(
    projectId: string,
    sectionId: PortalStepID,
  ): Promise<Result<void, AppError>> {
    try {
      const subcollectionPath = this.getSubcollectionPath(sectionId);
      if (!subcollectionPath) {
        return ok(undefined); // No subcollection for this step
      }

      const configDocRef = doc(firestore, 'projects', projectId, subcollectionPath, 'data');
      await updateDoc(configDocRef, {
        finalized: true,
        photographerReviewed: true,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch {
      // Non-critical error - log but don't fail
      // Return success even on error as this is a non-critical operation
      return ok(undefined);
    }
  }
}

export const portalRepository = new FirestorePortalRepository();
