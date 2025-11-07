// /*---------------------------------------
// File: src/ports/i-timeline-repository.ts
// Description: Timeline repository interface for the Eye-Doo application.

// Author: Kyle Lovesy
// Date: 28/10-2025 - 10.00
// Version: 1.1.0
// ---------------------------------------*/
import { Result } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { TimelineList, TimelineEvent } from '@/domain/project/timeline.schema';
import { Unsubscribe } from 'firebase/firestore';

/**
 * @interface IBaseTimelineRepository
 * @description Defines the contract for data access operations related to Timelines.
 * This is the "Port" in the Ports & Adapters architecture.
 */
export interface IBaseTimelineRepository {
  /**
   * Creates an initial timeline for a project.
   * @param projectId The ID of the project the timeline belongs to.
   * @returns A void result.
   */
  createInitial(projectId: string): Promise<Result<void, AppError>>;

  /**
   * Retrieves a timeline for a project.
   * @param projectId The ID of the project the timeline belongs to.
   * @returns The TimelineList or an error if not found.
   */
  get(projectId: string): Promise<Result<TimelineList, AppError>>;

  /**
   * Updates the config of a timeline.
   * @param projectId The ID of the project the timeline belongs to.
   * @param updates The partial timeline config to update.
   * @returns A void result.
   */
  updateConfig(
    projectId: string,
    updates: Partial<TimelineList['config']>,
  ): Promise<Result<void, AppError>>;

  /**
   * Adds an event to a timeline.
   * @param projectId The ID of the project the timeline belongs to.
   * @param event The event to add.
   * @returns The ID of the newly created event.
   */
  addEvent(projectId: string, event: Omit<TimelineEvent, 'id'>): Promise<Result<string, AppError>>;

  /**
   * Updates an event in a timeline.
   * @param projectId The ID of the project the timeline belongs to.
   * @param event The event to update.
   * @returns A void result.
   */
  updateEvent(projectId: string, event: TimelineEvent): Promise<Result<void, AppError>>;

  /**
   * Deletes an event from a timeline.
   * @param projectId The ID of the project the timeline belongs to.
   * @param eventId The ID of the event to delete.
   * @returns A void result.
   */
  deleteEvent(projectId: string, eventId: string): Promise<Result<void, AppError>>;

  /**
   * Sets the events of a timeline.
   * @param projectId The ID of the project the timeline belongs to.
   * @param events The events to set.
   * @returns A void result.
   */
  setEvents(projectId: string, events: TimelineEvent[]): Promise<Result<void, AppError>>;

  /**
   * Subscribes to real-time updates for a timeline.
   * @param projectId The ID of the project the timeline belongs to.
   * @param onUpdate Callback function for when new data arrives.
   * @returns An unsubscribe function.
   */
  subscribe(
    projectId: string,
    onUpdate: (result: Result<TimelineList | null, AppError>) => void,
  ): Unsubscribe;
}

//   /**
//    * Retrieves all timelines for a specific user.
//    * @param userId The ID of the user.
//    * @returns An array of TimelineLists.
//    */
//   listByUserId(userId: string): Promise<Result<TimelineList[], AppError>>;

//   /**
//    * Subscribes to real-time updates for a user's projects.
//    * @param userId The ID of the user.
//    * @param onData Callback function for when new data arrives.
//    * @param onError Callback function for errors.
//    * @returns An unsubscribe function.
//    */
//   subscribe(
//     projectId: string,
//     onUpdate: (result: Result<TimelineList | null, AppError>) => void,
//   ): Unsubscribe;

//   /**
//    * Updates the config of a timeline.
//    * @param projectId The ID of the project the timeline belongs to.
//    * @param updates The partial timeline config to update.
//    * @returns A void result.
//    */
//   updateConfig(
//     projectId: string,
//     updates: Partial<TimelineList['config']>,
//   ): Promise<Result<void, AppError>>;

//   /**
//    * Adds an event to a timeline.
//    * @param projectId The ID of the project the timeline belongs to.
//    * @param event The event to add.
//    * @returns The ID of the newly created event.
//    */
//   addEvent(projectId: string, event: Omit<TimelineEvent, 'id'>): Promise<Result<string, AppError>>;

//   /**
//    * Updates an event in a timeline.
//    * @param projectId The ID of the project the timeline belongs to.
//    * @param event The event to update.
//    * @returns A void result.
//    */
//   updateEvent(projectId: string, event: TimelineEvent): Promise<Result<void, AppError>>;

//   /**
//    * Deletes an event from a timeline.
//    * @param projectId The ID of the project the timeline belongs to.
//    * @param event The event to delete.
//    * @returns A void result.
//    */
//   deleteEvent(projectId: string, eventId: string): Promise<Result<void, AppError>>;

//   /**
//    * Sets the events of a timeline.
//    * @param projectId The ID of the project the timeline belongs to.
//    * @param events The events to set.
//    * @returns A void result.
//    */
//   setEvents(projectId: string, events: TimelineEvent[]): Promise<Result<void, AppError>>;
// }
