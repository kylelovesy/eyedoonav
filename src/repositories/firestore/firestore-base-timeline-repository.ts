/*---------------------------------------
File: src/repositories/firestore/firestore-base-timeline-repository.ts
Description: Firestore timeline repository implementation for the Eye-Doo application.

Author: Kyle Lovesy
Date: 29/10-2025 - 11.00
Version: 2.0.0
---------------------------------------*/

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { generateId } from '@/utils/id-generator';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  TimelineList as Timeline,
  TimelineEvent,
  timelineEventSchema,
  timelineListSchema,
} from '@/domain/project/timeline.schema';
import { IBaseTimelineRepository } from '@/repositories/i-base-timeline-repository';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import { ListSource, ListType, TimelineMode, SectionStatus, ActionOn } from '@/constants/enums';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import { PROJECT_PATHS } from '@/repositories/firestore/paths/firestore-project-paths';
import { ErrorCode } from '@/constants/error-code-registry';
/**
 * @class FirestoreBaseTimelineRepository
 * @description Implements the IBaseTimelineRepository interface for Cloud Firestore.
 * This is the "Adapter" that connects our application to the Firestore database.
 * @summary - Pre migrate operations:
 * get timeline doc ref,
 * validate list,
 * validate event,
 * ensure not finalized,
 * ensure time ordering,
 * is event complete,
 * calculate event status,
 * update event status,
 * calculate event progress,
 * get current event,
 * get next event,
 * validate event timing,
 * is event active,
 * get time until event,
 * is event upcoming.
 *
 * create initial,
 * get timeline,
 * listen to timeline,
 * update config,
 * add event,
 * update event,
 * delete event,
 * set events.
 */

// export interface IBaseTimelineRepository {
//   createInitial(projectId: string): Promise<Result<void, AppError>>;
//   get(projectId: string): Promise<Result<Timeline, AppError>>;
//   updateConfig(
//     projectId: string,
//     updates: Partial<Timeline['config']>,
//   ): Promise<Result<void, AppError>>;
//   addEvent(projectId: string, event: Omit<TimelineEvent, 'id'>): Promise<Result<string, AppError>>;
//   updateEvent(projectId: string, event: TimelineEvent): Promise<Result<void, AppError>>;
//   deleteEvent(projectId: string, eventId: string): Promise<Result<void, AppError>>;
//   setEvents(projectId: string, events: TimelineEvent[]): Promise<Result<void, AppError>>;
//   subscribe(
//     projectId: string,
//     onUpdate: (result: Result<Timeline | null, AppError>) => void,
//   ): Unsubscribe;
// }

export class FirestoreBaseTimelineRepository implements IBaseTimelineRepository {
  private readonly context = 'FirestoreBaseTimelineRepository';

  /**
   * Gets the timeline document reference
   */
  private getTimelineDocRef(projectId: string) {
    return doc(firestore, PROJECT_PATHS.TIMELINE(projectId), 'data');
  }

  /**
   * Parses Firestore snapshot to Timeline with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<Timeline, AppError> {
    if (!snapshot.exists()) {
      return err(ErrorMapper.listNotFound(contextString));
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const data = convertAllTimestamps(snapshot.data());

    // Defensive parsing: validate data FROM Firestore
    const validation = validateWithSchema(timelineListSchema, data, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    return ok(validation.value as Timeline);
  }

  /**
   * Validates a timeline event
   */
  private validateEvent(data: unknown, contextString: string): Result<TimelineEvent, AppError> {
    const result = validateWithSchema(timelineEventSchema, data, contextString);
    if (!result.success) {
      return err(result.error);
    }
    return ok(result.value as TimelineEvent);
  }

  /**
   * Ensures timeline is not finalized before allowing edits
   */
  private ensureNotFinalized(
    config?: Timeline['config'],
    contextString?: string,
  ): Result<void, AppError> {
    if (config?.finalized) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Timeline is finalized and cannot be edited',
          'Timeline is finalized and cannot be edited.',
          contextString,
          undefined,
          false,
        ),
      );
    }
    return ok(undefined);
  }

  /**
   * Creates an initial timeline for a project
   */
  async createInitial(projectId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'createInitial',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = this.getTimelineDocRef(projectId);

      const initial: Timeline = {
        config: {
          id: generateId(),
          type: ListType.TIMELINE,
          source: ListSource.PROJECT_LIST,
          status: SectionStatus.UNLOCKED,
          actionOn: ActionOn.PHOTOGRAPHER,
          defaultValues: false,
          version: '',
          mode: TimelineMode.SETUP,
          finalized: false,
          totalCategories: 0,
          totalItems: 0,
          totalEvents: 0,
          clientLastViewed: new Date(),
          createdAt: new Date(),
        },
        items: [],
        pendingUpdates: [],
      };

      const validation = validateWithSchema(timelineListSchema, initial, contextString);
      if (!validation.success) {
        return err(validation.error);
      }

      await setDoc(ref, validation.value);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Retrieves a timeline for a project
   */
  async get(projectId: string): Promise<Result<Timeline, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'get', undefined, projectId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = this.getTimelineDocRef(projectId);
      const snapshot = await getDoc(ref);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Updates the config of a timeline
   */
  async updateConfig(
    projectId: string,
    updates: Partial<Timeline['config']>,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'updateConfig',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = this.getTimelineDocRef(projectId);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      const current = convertAllTimestamps(snapshot.data()) as Timeline;
      const guard = this.ensureNotFinalized(current.config, contextString);
      if (!guard.success) {
        return guard;
      }

      const next: Timeline = {
        ...current,
        config: {
          ...(current.config || {}),
          ...updates,
          updatedAt: new Date(), // Use Date for validation, will be converted to serverTimestamp in Firestore
        } as Timeline['config'],
      };

      const validation = validateWithSchema(timelineListSchema, next, contextString);
      if (!validation.success) {
        return err(validation.error);
      }

      await updateDoc(ref, {
        config: validation.value.config,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Adds an event to a timeline
   */
  async addEvent(
    projectId: string,
    input: Omit<TimelineEvent, 'id'>,
  ): Promise<Result<string, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'addEvent',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = this.getTimelineDocRef(projectId);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      const current = convertAllTimestamps(snapshot.data()) as Timeline;
      const guard = this.ensureNotFinalized(current.config, contextString);
      if (!guard.success) {
        return err(guard.error);
      }

      // Generate unique UUID for the event (not document ID)
      const id = generateId();
      const candidate: TimelineEvent = { ...input, id };

      const eventValid = this.validateEvent(candidate, contextString);
      if (!eventValid.success) {
        return err(eventValid.error);
      }

      const next = {
        ...current,
        items: [...(current.items || []), eventValid.value],
      };

      const listValid = validateWithSchema(timelineListSchema, next, contextString);
      if (!listValid.success) {
        return err(listValid.error);
      }

      await updateDoc(ref, {
        items: next.items,
        updatedAt: serverTimestamp(),
      });

      return ok(id);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Updates an event in a timeline
   */
  async updateEvent(projectId: string, event: TimelineEvent): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'updateEvent',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = this.getTimelineDocRef(projectId);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      const current = convertAllTimestamps(snapshot.data()) as Timeline;
      const guard = this.ensureNotFinalized(current.config, contextString);
      if (!guard.success) {
        return guard;
      }

      const eventValid = this.validateEvent(event, contextString);
      if (!eventValid.success) {
        return err(eventValid.error);
      }

      const nextItems = (current.items || []).map(e =>
        e.id === eventValid.value.id ? eventValid.value : e,
      );

      const next = { ...current, items: nextItems };
      const listValid = validateWithSchema(timelineListSchema, next, contextString);
      if (!listValid.success) {
        return err(listValid.error);
      }

      await updateDoc(ref, {
        items: next.items,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Deletes an event from a timeline
   */
  async deleteEvent(projectId: string, eventId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'deleteEvent',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = this.getTimelineDocRef(projectId);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      const current = convertAllTimestamps(snapshot.data()) as Timeline;
      const guard = this.ensureNotFinalized(current.config, contextString);
      if (!guard.success) {
        return guard;
      }

      const nextItems = (current.items || []).filter(e => e.id !== eventId);
      const next = { ...current, items: nextItems };

      const listValid = validateWithSchema(timelineListSchema, next, contextString);
      if (!listValid.success) {
        return err(listValid.error);
      }

      await updateDoc(ref, {
        items: next.items,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Sets the events of a timeline
   */
  async setEvents(projectId: string, events: TimelineEvent[]): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'setEvents',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = this.getTimelineDocRef(projectId);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return err(ErrorMapper.listNotFound(contextString));
      }

      const current = convertAllTimestamps(snapshot.data()) as Timeline;
      const guard = this.ensureNotFinalized(current.config, contextString);
      if (!guard.success) {
        return guard;
      }

      // Validate each event
      for (const e of events) {
        const v = this.validateEvent(e, contextString);
        if (!v.success) {
          return err(v.error);
        }
      }

      const next = { ...current, items: events };
      const listValid = validateWithSchema(timelineListSchema, next, contextString);
      if (!listValid.success) {
        return err(listValid.error);
      }

      await updateDoc(ref, {
        items: next.items,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Subscribes to real-time updates for a timeline
   */
  subscribe(
    projectId: string,
    onUpdate: (result: Result<Timeline | null, AppError>) => void,
  ): Unsubscribe {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'subscribe',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);
    const ref = this.getTimelineDocRef(projectId);

    return onSnapshot(
      ref,
      snapshot => {
        if (!snapshot.exists()) {
          onUpdate(ok(null));
          return;
        }

        const result = this.parseSnapshot(snapshot, contextString);
        onUpdate(result);
      },
      error => {
        onUpdate(err(ErrorMapper.fromFirestore(error, contextString)));
      },
    );
  }
}
