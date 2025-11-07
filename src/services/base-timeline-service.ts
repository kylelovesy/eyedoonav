/*---------------------------------------
File: src/services/timeline-service.ts
Description: Timeline service for managing project timelines
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/

import { Result, err, ok } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import {
  TimelineList,
  TimelineEvent,
  TimelineEventInput,
  timelineListSchema,
  timelineEventSchema,
  timelineEventInputSchema,
  timelineEventUpdateSchema,
} from '@/domain/project/timeline.schema';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { IBaseTimelineRepository } from '@/repositories/i-base-timeline-repository';
import { generateId } from '@/utils/id-generator';
import {
  ListType,
  ListSource,
  TimelineMode,
  SectionStatus,
  ActionOn,
  TimelineEventStatus,
  TimelineEventType,
} from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorCode } from '@/constants/error-code-registry';

/**
 * Timeline Service Interface
 * Project-only operations (no master/user lists)
 */
export interface IBaseTimelineService {
  /**
   * Get project timeline
   */
  getProjectTimeline(projectId: string): Promise<Result<TimelineList, AppError>>;

  /**
   * Save entire project timeline
   */
  saveProjectTimeline(
    projectId: string,
    timeline: TimelineList,
  ): Promise<Result<TimelineList, AppError>>;

  /**
   * Create new project timeline
   */
  createProjectTimeline(
    projectId: string,
    initialTimeline?: TimelineList,
  ): Promise<Result<TimelineList, AppError>>;

  /**
   * Delete project timeline (via repository delete or set empty)
   */
  deleteProjectTimeline(projectId: string): Promise<Result<void, AppError>>;

  /**
   * Add event to timeline
   */
  addEvent(projectId: string, event: TimelineEventInput): Promise<Result<TimelineEvent, AppError>>;

  /**
   * Update event in timeline
   */
  updateEvent(
    projectId: string,
    eventId: string,
    updates: Partial<TimelineEvent>,
  ): Promise<Result<TimelineEvent, AppError>>;

  /**
   * Delete event from timeline
   */
  deleteEvent(projectId: string, eventId: string): Promise<Result<void, AppError>>;

  /**
   * Batch update events
   */
  batchUpdateEvents(
    projectId: string,
    updates: Array<{ id: string } & Partial<TimelineEvent>>,
  ): Promise<Result<void, AppError>>;

  /**
   * Batch delete events
   */
  batchDeleteEvents(projectId: string, eventIds: string[]): Promise<Result<void, AppError>>;

  /**
   * Subscribe to project timeline changes
   */
  subscribeToProjectTimeline(
    projectId: string,
    onData: (result: Result<TimelineList, AppError>) => void,
  ): () => void;
}

/**
 * Timeline Service Implementation
 * Handles validation and delegates to repository
 */
export class BaseTimelineService implements IBaseTimelineService {
  private readonly context = 'BaseTimelineService';

  constructor(private repository: IBaseTimelineRepository) {}

  /**
   * Gets a project timeline
   */
  async getProjectTimeline(projectId: string): Promise<Result<TimelineList, AppError>> {
    return await this.repository.get(projectId);
  }

  /**
   * Saves entire project timeline
   */
  async saveProjectTimeline(
    projectId: string,
    timeline: TimelineList,
  ): Promise<Result<TimelineList, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'saveProjectTimeline',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Validate timeline structure
    const validation = validateWithSchema(timelineListSchema, timeline, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // Get current timeline to check finalization guard
    const currentResult = await this.repository.get(projectId);
    if (currentResult.success) {
      const guardResult = this.ensureNotFinalized(currentResult.value.config, contextString);
      if (!guardResult.success) {
        return err(guardResult.error);
      }
    }

    // Use setEvents to replace all events, then update config if needed
    // Note: Repository doesn't have a "save entire timeline" method, so we need to:
    // 1. Set all events
    // 2. Update config if different
    const setEventsResult = await this.repository.setEvents(
      projectId,
      validation.value.items as TimelineEvent[],
    );
    if (!setEventsResult.success) {
      return err(setEventsResult.error);
    }

    // If config changed, update it
    if (currentResult.success) {
      const configChanged =
        JSON.stringify(currentResult.value.config) !== JSON.stringify(validation.value.config);
      if (configChanged) {
        const configResult = await this.repository.updateConfig(
          projectId,
          validation.value.config as Partial<TimelineList['config']>,
        );
        if (!configResult.success) {
          return err(configResult.error);
        }
      }
    }

    // Return updated timeline
    return await this.repository.get(projectId);
  }

  /**
   * Creates a new project timeline
   */
  async createProjectTimeline(
    projectId: string,
    initialTimeline?: TimelineList,
  ): Promise<Result<TimelineList, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'createProjectTimeline',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Use provided timeline or create default
    const timeline = initialTimeline || this.createDefaultTimeline();

    // Validate timeline structure
    const validation = validateWithSchema(timelineListSchema, timeline, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // Create initial timeline via repository
    const createResult = await this.repository.createInitial(projectId);
    if (!createResult.success) {
      return err(createResult.error);
    }

    // If initial timeline provided, set events and update config
    if (initialTimeline) {
      const setEventsResult = await this.repository.setEvents(
        projectId,
        validation.value.items as TimelineEvent[],
      );
      if (!setEventsResult.success) {
        return err(setEventsResult.error);
      }

      const configResult = await this.repository.updateConfig(
        projectId,
        validation.value.config as Partial<TimelineList['config']>,
      );
      if (!configResult.success) {
        return err(configResult.error);
      }
    }

    // Return created timeline
    return await this.repository.get(projectId);
  }

  /**
   * Deletes project timeline by setting empty
   */
  async deleteProjectTimeline(projectId: string): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(
    //   this.context,
    //   'deleteProjectTimeline',
    //   undefined,
    //   undefined,
    //   projectId,
    // );

    // Set empty events array (repository doesn't have delete method)
    return await this.repository.setEvents(projectId, []);
  }

  /**
   * Adds an event to timeline
   */
  async addEvent(
    projectId: string,
    eventInput: TimelineEventInput,
  ): Promise<Result<TimelineEvent, AppError>> {
    const context = ErrorContextBuilder.fromService(this.context, 'addEvent', undefined, projectId);
    const contextString = ErrorContextBuilder.toString(context);

    // Validate event input
    const validation = validateWithSchema(timelineEventInputSchema, eventInput, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // Convert input to event without ID (repository will generate)
    const eventWithoutId: Omit<TimelineEvent, 'id'> = {
      ...validation.value,
      itemName: validation.value.itemName,
      itemDescription: validation.value.itemDescription || '',
      type: validation.value.type || TimelineEventType.OTHER,
      description: validation.value.description,
      notes: validation.value.notes,
      status: validation.value.status || TimelineEventStatus.UPCOMING,
      startTime: validation.value.startTime as Date | null | undefined,
      endTime: validation.value.endTime as Date | null | undefined,
      duration: validation.value.duration,
      locationId: undefined,
      createdBy: undefined,
      updatedBy: undefined,
      notification: undefined,
      weather: undefined,
      isCustom: false,
      isChecked: false,
      isDisabled: false,
    };

    // Add event via repository
    const result = await this.repository.addEvent(projectId, eventWithoutId);
    if (!result.success) {
      return err(result.error);
    }

    // Get updated timeline to return the created event
    const timelineResult = await this.repository.get(projectId);
    if (!timelineResult.success) {
      return err(timelineResult.error);
    }

    const createdEvent = timelineResult.value.items.find(e => e.id === result.value);
    // if (!createdEvent) {
    //   return err(
    //     ErrorMapper.createGenericError(
    //       ErrorCode.DB_NOT_FOUND,
    //       'Event not found after creation',
    //       'Event was created but could not be retrieved.',
    //       contextString,
    //     ),
    //   );
    // }

    return ok(createdEvent as TimelineEvent);
  }

  /**
   * Updates an event in timeline
   */
  async updateEvent(
    projectId: string,
    eventId: string,
    updates: Partial<TimelineEvent>,
  ): Promise<Result<TimelineEvent, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'updateEvent',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Get current timeline
    const timelineResult = await this.repository.get(projectId);
    if (!timelineResult.success) {
      return err(timelineResult.error);
    }

    // Find event to update
    const existingEvent = timelineResult.value.items.find(e => e.id === eventId);
    if (!existingEvent) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'Event not found',
          `Event with ID ${eventId} not found.`,
          contextString,
        ),
      );
    }

    // Merge updates with existing event
    const updatedEvent: TimelineEvent = {
      ...existingEvent,
      ...updates,
      id: eventId, // Ensure ID is preserved
    };

    // Validate updated event
    const validation = validateWithSchema(timelineEventSchema, updatedEvent, contextString);
    if (!validation.success) {
      return err(validation.error);
    }

    // Update via repository
    const result = await this.repository.updateEvent(projectId, validation.value as TimelineEvent);
    if (!result.success) {
      return err(result.error);
    }

    return ok(validation.value as TimelineEvent);
  }

  /**
   * Deletes an event from timeline
   */
  async deleteEvent(projectId: string, eventId: string): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(
    //   this.context,
    //   'deleteEvent',
    //   undefined,
    //   projectId,
    // );

    return await this.repository.deleteEvent(projectId, eventId);
  }

  /**
   * Batch updates multiple events
   */
  async batchUpdateEvents(
    projectId: string,
    updates: Array<{ id: string } & Partial<TimelineEvent>>,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'batchUpdateEvents',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Get current timeline
    const timelineResult = await this.repository.get(projectId);
    if (!timelineResult.success) {
      return err(timelineResult.error);
    }

    // Apply updates to events
    const updatedEvents = timelineResult.value.items.map(item => {
      const update = updates.find(u => u.id === item.id);
      if (!update) return item;

      const updated: TimelineEvent = {
        ...item,
        ...update,
        id: item.id, // Preserve ID
      };

      // Validate each updated event
      const validation = validateWithSchema(timelineEventSchema, updated, contextString);
      if (!validation.success) {
        throw validation.error; // Will be caught below
      }

      return validation.value;
    });

    // Update all events via repository
    return await this.repository.setEvents(projectId, updatedEvents as TimelineEvent[]);
  }

  /**
   * Batch deletes multiple events
   */
  async batchDeleteEvents(projectId: string, eventIds: string[]): Promise<Result<void, AppError>> {
    // const context = ErrorContextBuilder.fromService(
    //   this.context,
    //   'batchDeleteEvents',
    //   undefined,
    //   projectId,
    // );
    // const contextString = ErrorContextBuilder.toString(context);

    // Get current timeline
    const timelineResult = await this.repository.get(projectId);
    if (!timelineResult.success) {
      return err(timelineResult.error);
    }

    // Filter out deleted events
    const remainingEvents = timelineResult.value.items.filter(item => !eventIds.includes(item.id));

    // Update events via repository
    return await this.repository.setEvents(projectId, remainingEvents);
  }

  /**
   * Subscribes to project timeline changes
   */
  subscribeToProjectTimeline(
    projectId: string,
    onData: (result: Result<TimelineList, AppError>) => void,
  ): () => void {
    return this.repository.subscribe(
      projectId,
      onData as (result: Result<TimelineList | null, AppError>) => void,
    );
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Creates a default timeline structure
   */
  private createDefaultTimeline(): TimelineList {
    return {
      config: {
        id: generateId(),
        type: ListType.TIMELINE,
        source: ListSource.PROJECT_LIST,
        status: SectionStatus.UNLOCKED,
        actionOn: ActionOn.PHOTOGRAPHER,
        defaultValues: DEFAULTS.DISABLED,
        version: DEFAULTS.VERSION,
        mode: TimelineMode.SETUP,
        finalized: false,
        totalCategories: 0,
        totalItems: 0,
        totalEvents: 0,
        createdAt: new Date(),
      },
      items: [],
      pendingUpdates: [],
    };
  }

  /**
   * Ensures timeline is not finalized (guard for mutations)
   */
  private ensureNotFinalized(
    config: TimelineList['config'],
    contextString: string,
  ): Result<void, AppError> {
    if (config?.finalized) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'Timeline finalized',
          'Timeline is finalized and cannot be edited.',
          contextString,
          undefined,
          false,
        ),
      );
    }
    return ok(undefined);
  }
}
