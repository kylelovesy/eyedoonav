/*---------------------------------------
File: src/repositories/firestore/firestore-project-repository.ts
Description: Firestore implementation for project repository
Author: Kyle Lovesy
Date: 03/11-2025
Version: 2.0.0
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
  QuerySnapshot,
  serverTimestamp,
  DocumentSnapshot,
  Transaction,
  runTransaction,
} from 'firebase/firestore';
import { db as firestore } from '@/config/firebaseConfig';
import { Result, ok, err } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema } from '@/utils/validation-helpers';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizePersonInfo,
  removeUndefinedValues,
} from '@/utils/sanitization-helpers';
import {
  baseProjectSchema,
  BaseProject,
  BaseProjectInput,
  BaseProjectUpdate,
  defaultBaseProject,
} from '@/domain/project/project.schema';
import { ProjectStatus } from '@/constants/enums';
import { ClientPortalStatus } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';
import { ErrorCode } from '@/constants/error-code-registry';
import { PROJECT_PATHS } from '@/repositories/firestore/paths/firestore-project-paths';
import { IBaseProjectRepository } from '@/repositories/i-base-project-repository';
import { convertAllTimestamps } from '@/utils/date-time-utils';
import { z } from 'zod';
import { LoggingService } from '@/services/logging-service';
import { IListRepository } from '@/repositories/i-list-repository';
import { KitList, KitItem } from '@/domain/user/kit.schema';
import { TaskList, TaskItem } from '@/domain/user/task.schema';
import { GroupShotList, GroupShotItem } from '@/domain/user/shots.schema';
import { CoupleShotList, CoupleShotItem } from '@/domain/user/shots.schema';

export class FirestoreBaseProjectRepository implements IBaseProjectRepository {
  private readonly context = 'FirestoreBaseProjectRepository';

  /**
   * Sanitizes project creation input
   */
  private sanitizeProjectCreate(payload: BaseProjectInput): BaseProjectInput {
    return {
      ...payload,
      projectName: sanitizeString(payload.projectName) || '',
      email: sanitizeEmail(payload.email) || '',
      phone: payload.phone ? sanitizePhone(payload.phone) || '' : '',
      personAName: sanitizePersonInfo(payload.personAName),
      personBName: sanitizePersonInfo(payload.personBName),
      coverImage: payload.coverImage ? sanitizeString(payload.coverImage) : undefined,
    };
  }

  /**
   * Sanitizes project update input
   */
  private sanitizeProjectUpdate(payload: BaseProjectUpdate): BaseProjectUpdate {
    const sanitized: BaseProjectUpdate = { ...payload };

    if (sanitized.projectName !== undefined) {
      sanitized.projectName = sanitizeString(sanitized.projectName) || undefined;
    }

    if (sanitized.email !== undefined) {
      sanitized.email = sanitizeEmail(sanitized.email) || undefined;
    }

    if (sanitized.phone !== undefined && sanitized.phone !== null) {
      sanitized.phone = sanitizePhone(sanitized.phone) || undefined;
    }

    if (sanitized.personAName !== undefined) {
      sanitized.personAName = sanitizePersonInfo(sanitized.personAName);
    }

    if (sanitized.personBName !== undefined) {
      sanitized.personBName = sanitizePersonInfo(sanitized.personBName);
    }

    if (sanitized.coverImage !== undefined) {
      sanitized.coverImage = sanitized.coverImage
        ? sanitizeString(sanitized.coverImage)
        : undefined;
    }

    return sanitized;
  }

  /**
   * Parses Firestore snapshot to BaseProject with Zod validation
   * This is DEFENSIVE parsing of data FROM Firestore (not input validation)
   */
  private parseSnapshot(
    snapshot: DocumentSnapshot,
    contextString: string,
  ): Result<BaseProject, AppError> {
    if (!snapshot.exists()) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_NOT_FOUND,
          'Project not found',
          'Project not found',
          contextString,
        ),
      );
    }

    // Convert Firestore data (with Timestamps) to data with Date objects
    const data = convertAllTimestamps({
      id: snapshot.id,
      ...snapshot.data(),
    });

    // Defensive parsing: validate data FROM Firestore
    try {
      const validation = validateWithSchema(baseProjectSchema, data, contextString);
      if (!validation.success) {
        return err(validation.error);
      }

      return ok(validation.value as BaseProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        LoggingService.error('Failed to parse project data from database', {
          component: this.context,
          method: 'parseSnapshot',
          // issues: error.issues,
        });
        return err(
          ErrorMapper.createGenericError(
            ErrorCode.DB_VALIDATION_ERROR,
            'Failed to parse project data from database',
            'Data integrity issue detected. Please contact support.',
            contextString,
            error.issues,
          ),
        );
      }
      // Re-throw other errors to be caught by outer catch
      throw error;
    }
  }

  /**
   * Parses Firestore query snapshot to array of BaseProject
   */
  private parseQuerySnapshot(
    snapshot: QuerySnapshot,
    contextString: string,
  ): Result<BaseProject[], AppError> {
    const projects: BaseProject[] = [];
    const errors: AppError[] = [];

    snapshot.forEach(docSnapshot => {
      const result = this.parseSnapshot(docSnapshot, contextString);
      if (result.success) {
        projects.push(result.value);
      } else {
        errors.push(result.error);
      }
    });

    // If all documents failed to parse, return error
    if (projects.length === 0 && errors.length > 0) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.DB_READ_ERROR,
          `Failed to parse ${errors.length} project document(s)`,
          'Unable to load projects. Please try again.',
          contextString,
          errors[0],
        ),
      );
    }

    // Return projects even if some failed to parse (log errors but continue)
    return ok(projects);
  }

  /**
   * Creates a new project
   */
  async create(
    userId: string,
    payload: BaseProjectInput,
    tx?: Transaction,
  ): Promise<Result<BaseProject, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'create', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input
      const sanitized = this.sanitizeProjectCreate(payload);

      // 2. Create document reference with Firestore-generated ID
      const collectionRef = collection(firestore, 'projects');
      const docRef = doc(collectionRef);

      // 3. Prepare data with server timestamps
      const projectData = {
        ...sanitized,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 4. Save to Firestore using transaction if provided, otherwise use normal 'setDoc'
      if (tx) {
        tx.set(docRef, projectData); // Use transaction 'set'
        // In transaction mode, we can't fetch the document until commit
        // Construct BaseProject from input data + docRef.id and defaults
        const projectId = docRef.id;
        const constructedProject: BaseProject = {
          ...defaultBaseProject(projectId, userId, sanitized.projectName || ''),
          ...sanitized,
          id: projectId,
          userId,
          projectStatus: ProjectStatus.SETUP,
          cachedProjectDashboard: DEFAULTS.DISABLED,
          clientPortalStatus: ClientPortalStatus.NONE,
          createdAt: new Date(), // Placeholder - will be set by serverTimestamp on commit
          updatedAt: null, // Will be set by serverTimestamp on commit
        };
        return ok(constructedProject);
      } else {
        await setDoc(docRef, projectData); // Use normal 'setDoc'
        // Fetch and parse the created document
        const createdSnapshot = await getDoc(docRef);
        return this.parseSnapshot(createdSnapshot, contextString);
      }
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Retrieves a single project by its ID
   */
  async getById(projectId: string): Promise<Result<BaseProject, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'getById',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = doc(firestore, PROJECT_PATHS.BASE(projectId));
      const snapshot = await getDoc(docRef);
      return this.parseSnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Retrieves all projects for a specific user
   */
  async listByUserId(userId: string): Promise<Result<BaseProject[], AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'listByUserId', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const collectionRef = collection(firestore, 'projects');
      const q = query(collectionRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return this.parseQuerySnapshot(snapshot, contextString);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * ✅ RECOMMENDED: Subscribes to real-time updates for a user's projects
   */
  subscribeToUserProjects(
    userId: string,
    onData: (result: Result<BaseProject[], AppError>) => void,
  ): () => void {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'subscribeToUserProjects',
      userId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    const collectionRef = collection(firestore, 'projects');
    const q = query(collectionRef, where('userId', '==', userId));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const result = this.parseQuerySnapshot(snapshot, contextString);
        onData(result);
      },
      error => {
        onData(err(ErrorMapper.fromFirestore(error, contextString)));
      },
    );

    return unsubscribe;
  }

  /**
   * Updates an existing project
   */
  async update(projectId: string, payload: BaseProjectUpdate): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'update',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Sanitize input
      const sanitized = this.sanitizeProjectUpdate(payload);

      // 2. Remove undefined values before updateDoc (Firestore doesn't accept undefined)
      const sanitizedData = removeUndefinedValues(sanitized);

      // 3. Update document with server timestamp
      const docRef = doc(firestore, PROJECT_PATHS.BASE(projectId));
      await updateDoc(docRef, {
        ...sanitizedData,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Deletes a project by its ID
   */
  async delete(projectId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromRepository(
      this.context,
      'delete',
      undefined,
      projectId,
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const docRef = doc(firestore, PROJECT_PATHS.BASE(projectId));
      await deleteDoc(docRef);
      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }

  /**
   * Creates a project with all required list subcollections atomically using a transaction
   */
  async createProjectWithLists(
    userId: string,
    projectInput: BaseProjectInput,
    sourceLists: {
      kit: KitList;
      task: TaskList;
      groupShot: GroupShotList;
      coupleShot: CoupleShotList;
    },
    listRepositories: {
      kit: IListRepository<KitList, KitItem>;
      task: IListRepository<TaskList, TaskItem>;
      groupShot: IListRepository<GroupShotList, GroupShotItem>;
      coupleShot: IListRepository<CoupleShotList, CoupleShotItem>;
    },
  ): Promise<Result<BaseProject, AppError>> {
    const context = ErrorContextBuilder.fromRepository(this.context, 'createProjectWithLists', userId);
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // Use transaction to atomically create project + all 4 lists
      // All writes happen together - either all succeed or all fail
      const newProject = await runTransaction(firestore, async tx => {
        // Create project document (inside transaction)
        const projectResult = await this.create(userId, projectInput, tx);
        if (!projectResult.success) {
          // Throw error to trigger transaction rollback
          // Firestore transactions need regular Error or string
          const error = new Error(projectResult.error.message);
          (error as { appError?: AppError }).appError = projectResult.error;
          throw error;
        }
        const project = projectResult.value as BaseProject;

        // Create all 4 list subcollections (inside transaction)
        const listResults = await Promise.all([
          listRepositories.kit.createOrResetProjectList(userId, project.id, sourceLists.kit, tx),
          listRepositories.task.createOrResetProjectList(userId, project.id, sourceLists.task, tx),
          listRepositories.groupShot.createOrResetProjectList(
            userId,
            project.id,
            sourceLists.groupShot,
            tx,
          ),
          listRepositories.coupleShot.createOrResetProjectList(
            userId,
            project.id,
            sourceLists.coupleShot,
            tx,
          ),
        ]);

        // Check for any failures - if any fail, transaction will rollback
        const failures = listResults.filter(r => !r.success);
        if (failures.length > 0) {
          const firstFailure = failures[0];
          // Throw error to trigger transaction rollback
          const error = new Error(firstFailure.error.message);
          (error as { appError?: AppError }).appError = firstFailure.error;
          throw error;
        }

        return project;
      });

      return ok(newProject);
    } catch (error) {
      // Transaction errors are caught here
      // Check if it's an AppError wrapped in Error
      if (error && typeof error === 'object' && 'appError' in error) {
        const wrappedError = error as { appError?: AppError };
        if (wrappedError.appError) {
          return err(wrappedError.appError);
        }
      }
      // Map Firestore transaction errors
      return err(ErrorMapper.fromFirestore(error, contextString));
    }
  }
}
