/*---------------------------------------
File: src/repositories/firestore/firestore-user-projects-repository.ts
Description: Firestore implementation for user projects repository (with real-time listener for active project)
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
---------------------------------------*/
import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  limit,
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import { sanitizeString } from '@/utils/sanitization-helpers';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import {
  userProjectsSchema,
  UserProjects,
  UserProjectsCreate,
  UserProjectsUpdate,
} from '@/domain/user/user.schema';
import { ProjectTracking, projectTrackingSchema } from '@/domain/common/shared-schemas';
import { ErrorCode } from '@/constants/error-code-registry';
import { USER_PATHS } from '@/repositories/firestore/paths/firestore-user-paths';
import { IUserProjectsRepository } from '@/repositories/i-user-projects-repository';

export class FirestoreUserProjectsRepository implements IUserProjectsRepository {
  private readonly context = 'FirestoreUserProjectsRepository';

  /**
   * Sanitizes project tracking item (array element)
   */
  private sanitizeProjectTracking(project: ProjectTracking): ProjectTracking {
    return {
      ...project,
      projectName: sanitizeString(project.projectName) || '',
      coverImage: project.coverImage ? sanitizeString(project.coverImage) : undefined,
      // Note: personInfo and contactInfo sanitization handled by their respective schemas
      // but we sanitize strings here as defensive programming
    };
  }

  /**
   * Sanitizes projects creation input
   */
  private sanitizeProjectsCreate(payload: UserProjectsCreate): UserProjectsCreate {
    return {
      ...payload,
      // Sanitize array of project tracking items
      projects: payload.projects
        ? payload.projects.map(project => this.sanitizeProjectTracking(project))
        : [],
      // Numbers don't need sanitization
    };
  }

  /**
   * Sanitizes projects update input
   */
  private sanitizeProjectsUpdate(payload: UserProjectsUpdate): UserProjectsUpdate {
    const sanitized: UserProjectsUpdate = { ...payload };

    if (sanitized.projects !== undefined) {
      sanitized.projects = sanitized.projects.map(project => this.sanitizeProjectTracking(project));
    }

    // Numbers don't need sanitization

    return sanitized;
  }

  /**
   * Parses Firestore snapshot to UserProjects with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<UserProjects, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'Projects not found',
          'Projects not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const rawData = snapshot.data();
    const data = convertAllTimestamps({ id: snapshot.id, ...rawData });

    // Validate with schema
    const validationResult = validateWithSchema(userProjectsSchema, data, contextString);

    if (!validationResult.success) {
      return err(validationResult.error);
    }

    return ok(validationResult.value as UserProjects);
  }

  async get(userId: string, projectsId: string): Promise<Result<UserProjects, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'get', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.PROJECTS_DOC(userId, projectsId));
      const snapshot = await getDoc(ref);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async getByUserId(userId: string): Promise<Result<UserProjects, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'getByUserId', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const colRef = collection(firestore, USER_PATHS.PROJECTS(userId));
      const q = query(colRef, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_NOT_FOUND,
            'Projects not found',
            'Projects not found',
            contextString,
          ),
        );
      }

      const docSnapshot = snapshot.docs[0];
      return this.parseSnapshot(docSnapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async create(
    userId: string,
    payload: UserProjectsCreate,
  ): Promise<Result<UserProjects, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeProjectsCreate(payload);

      const colRef = collection(firestore, USER_PATHS.PROJECTS(userId));
      const docRef = await addDoc(colRef, {
        ...sanitized,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return await this.get(userId, docRef.id);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async update(
    userId: string,
    projectsId: string,
    updates: UserProjectsUpdate,
  ): Promise<Result<UserProjects, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'update', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input (validation happens in service layer)
      const sanitized = this.sanitizeProjectsUpdate(updates);
      const ref = doc(firestore, USER_PATHS.PROJECTS_DOC(userId, projectsId));

      await updateDoc(ref, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });

      return await this.get(userId, projectsId);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  async delete(userId: string, projectsId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'delete', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const ref = doc(firestore, USER_PATHS.PROJECTS_DOC(userId, projectsId));
      await deleteDoc(ref);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * ✅ RECOMMENDED: Listener for projects changes (active project tracking)
   * Dashboard and progress stats depend on live project data
   * Detach when user switches project or leaves workspace
   */
  subscribeToProjects(
    userId: string,
    projectsId: string,
    onData: (result: Result<UserProjects, AppError>) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(this.context, 'subscribeToProjects', userId);
    const contextString = ErrorContextBuilder.toString(context);
    const ref = doc(firestore, USER_PATHS.PROJECTS_DOC(userId, projectsId));

    const unsubscribe = onSnapshot(
      ref,
      snapshot => {
        const result = this.parseSnapshot(snapshot, contextString);
        onData(result);
      },
      error => {
        onData(err(ErrorMapper.fromFirestore(error, contextString)));
      },
    );

    return unsubscribe;
  }
}
