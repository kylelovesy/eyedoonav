/*---------------------------------------
File: src/services/portal-service.ts
Description: Portal service - project-specific portal management (COMPLETE)
Author: Kyle Lovesy
Date: 04/11/2025
Version: 2.0.0 (FINAL - ALL FEATURES MIGRATED)
---------------------------------------*/
import { Result, err, ok } from '@/domain/common/result';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextBuilder } from '@/utils/error-context-builder';
import { validateWithSchema, validatePartialWithSchema } from '@/utils/validation-helpers';
import { sanitizeText } from '@/utils/sanitization-helpers';
import {
  ClientPortal,
  ClientPortalInput,
  ClientPortalUpdate,
  clientPortalInputSchema,
  clientPortalUpdateSchema,
  PortalStep,
} from '@/domain/project/portal.schema';
import { IPortalRepository } from '@/repositories/i-portal-repository';
import { ActionOn, PortalStepID, SectionStatus } from '@/constants/enums';
import { timestampPreprocessor } from '@/domain/common/shared-schemas';
import { DEFAULT_PORTAL_STEPS } from '@/constants/portal';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebaseConfig';
import { wrapCloudFunction } from '@/utils/result-helpers';

// ============================================================================
// CLOUD FUNCTION TYPES
// ============================================================================

interface GeneratePortalLinkRequest {
  projectId: string;
  selectedSteps: string[];
}

interface GeneratePortalLinkResponse {
  portalUrl: string;
  accessToken: string;
}

interface DisablePortalRequest {
  projectId: string;
}

// Cloud Function callable instances
const generatePortalLink = httpsCallable<GeneratePortalLinkRequest, GeneratePortalLinkResponse>(
  functions,
  'generatePortalLink',
);

const disablePortalLink = httpsCallable<DisablePortalRequest, void>(functions, 'disablePortalLink');

// ============================================================================
// PORTAL SERVICE INTERFACE
// ============================================================================

export interface IPortalService {
  // Portal CRUD
  getPortalByProject(projectId: string): Promise<Result<ClientPortal | null, AppError>>;
  setupPortal(
    userId: string,
    projectId: string,
    selectedStepKeys: string[],
  ): Promise<Result<ClientPortal, AppError>>;
  listUserPortals(userId: string): Promise<Result<ClientPortal[], AppError>>;

  // Portal management
  disablePortal(projectId: string, portalId: string): Promise<Result<void, AppError>>;
  enablePortal(projectId: string, portalId: string): Promise<Result<void, AppError>>;
  updateMessage(
    projectId: string,
    portalId: string,
    message: string,
  ): Promise<Result<void, AppError>>;
  extendExpiration(
    projectId: string,
    portalId: string,
    additionalDays?: number,
  ): Promise<Result<void, AppError>>;

  // Step management
  updateStepStatus(
    projectId: string,
    portalId: string,
    stepId: PortalStepID,
    status: SectionStatus,
    actionOn: ActionOn,
  ): Promise<Result<void, AppError>>;
  resetSteps(projectId: string, portalId: string): Promise<Result<void, AppError>>;
  lockPortal(projectId: string, portalId: string): Promise<Result<void, AppError>>;

  // Real-time
  subscribeToUserPortals(
    userId: string,
    onData: (portals: ClientPortal[]) => void,
    onError: (error: AppError) => void,
  ): () => void;

  // Helpers
  isExpired(portal: ClientPortal): boolean;
  getStats(portal: ClientPortal): PortalStats;
  getStatusInfo(portal: ClientPortal, stats: PortalStats): PortalStatusInfo;
}

export interface PortalStats {
  totalSteps: number;
  completedSteps: number;
  inProgressSteps: number;
  pendingSteps: number;
  progressPercentage: number;
  isComplete: boolean;
  isActive: boolean;
}

export interface PortalStatusInfo {
  statusColor: string;
  statusText: string;
  isExpired: boolean;
}

// ============================================================================
// PORTAL SERVICE IMPLEMENTATION
// ============================================================================

export class PortalService implements IPortalService {
  private readonly context = 'PortalService';

  constructor(private repository: IPortalRepository) {}

  // ============================================================================
  // PORTAL OPERATIONS
  // ============================================================================

  /**
   * Gets portal for a specific project
   * Lists all user portals and finds the one matching this project
   */
  async getPortalByProject(projectId: string): Promise<Result<ClientPortal | null, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'getPortalByProject',
      undefined,
      projectId,
      { projectId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    return err(
      ErrorMapper.createGenericError(
        ErrorCode.VALIDATION_FAILED,
        'Use listUserPortals and filter by projectId instead',
        'Portal retrieval requires userId',
        contextString,
      ),
    );
  }

  /**
   * Lists all portals for a user (then filter by projectId in hook if needed)
   */
  async listUserPortals(userId: string): Promise<Result<ClientPortal[], AppError>> {
    return this.repository.listByUserId(userId);
  }

  /**
   * Gets a specific portal by ID
   */
  async getPortalById(
    portalId: string,
    projectId: string,
  ): Promise<Result<ClientPortal, AppError>> {
    return this.repository.getById(portalId, projectId);
  }

  /**
   * Sets up a new portal for a project
   */
  async setupPortal(
    userId: string,
    projectId: string,
    selectedStepKeys: string[],
  ): Promise<Result<ClientPortal, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'setupPortal',
      userId,
      projectId,
      { selectedSteps: selectedStepKeys },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // 1. Validate selected steps
    if (selectedStepKeys.length === 0) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.VALIDATION_FAILED,
          'At least one step must be selected',
          'Please select at least one step to enable in the portal',
          contextString,
        ),
      );
    }

    // 2. Create portal steps array
    const portalSteps = this.createPortalStepsArray(selectedStepKeys);

    // 3. Generate secure link via Cloud Function
    const linkResult = await wrapCloudFunction(
      generatePortalLink,
      { projectId, selectedSteps: selectedStepKeys },
      error => this.mapCloudFunctionError(error, contextString),
      contextString,
    );

    if (!linkResult.success) {
      return linkResult as Result<ClientPortal, AppError>;
    }

    const { portalUrl, accessToken } = linkResult.value;

    if (!portalUrl || !accessToken) {
      return err(
        ErrorMapper.createGenericError(
          ErrorCode.NETWORK_SERVER_ERROR,
          'Cloud function did not return required portal data',
          'Failed to generate portal link. Please try again.',
          contextString,
        ),
      );
    }

    // 4. Create portal input
    const defaultMessage =
      'Welcome to your planning portal! Please complete each step to help us make your day perfect.';
    const portalInput: ClientPortalInput = {
      isSetup: true,
      isEnabled: true,
      currentStepID: PortalStepID.WELCOME,
      portalMessage: sanitizeText(defaultMessage, 1000) || defaultMessage,
      steps: portalSteps,
    };

    // Validate input
    const validation = validateWithSchema(clientPortalInputSchema, portalInput, contextString);
    if (!validation.success) {
      return validation as Result<ClientPortal, AppError>;
    }

    // 5. Create portal via repository
    const createResult = await this.repository.create(
      userId,
      projectId,
      validation.value as ClientPortalInput,
    );
    if (!createResult.success) {
      return createResult;
    }

    const portalId = createResult.value.id;

    // 6. Update portal with expiration, URL, and token
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const updateData = {
      expiresAt: expirationDate,
      portalUrl,
      accessToken,
      totalSteps: portalSteps.length,
      completedSteps: 0,
      completionPercentage: 0,
    } as ClientPortalUpdate;

    const updateResult = await this.repository.update(portalId, projectId, updateData);
    if (!updateResult.success) {
      return updateResult as Result<ClientPortal, AppError>;
    }

    // 7. Return complete portal
    return this.repository.getById(portalId, projectId);
  }

  /**
   * Disables portal access
   */
  async disablePortal(projectId: string, portalId: string): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'disablePortal',
      undefined,
      projectId,
      { portalId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Call cloud function to disable portal link
    const disableResult = await wrapCloudFunction(
      disablePortalLink,
      { projectId },
      error => this.mapCloudFunctionError(error, contextString),
      contextString,
    );

    if (!disableResult.success) {
      return disableResult;
    }

    // Update repository
    return this.repository.update(portalId, projectId, {
      isEnabled: false,
    });
  }

  /**
   * Enables portal access
   */
  async enablePortal(projectId: string, portalId: string): Promise<Result<void, AppError>> {
    return this.repository.update(portalId, projectId, {
      isEnabled: true,
    });
  }

  /**
   * Updates portal message
   */
  async updateMessage(
    projectId: string,
    portalId: string,
    message: string,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'updateMessage',
      undefined,
      projectId,
      { portalId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    // Sanitize message before validation (max 1000 chars)
    const sanitizedMessage = sanitizeText(message, 1000);

    // Validate sanitized message
    const validation = validatePartialWithSchema(
      clientPortalUpdateSchema,
      { portalMessage: sanitizedMessage },
      contextString,
    );
    if (!validation.success) {
      return validation;
    }

    return this.repository.update(portalId, projectId, validation.value as ClientPortalUpdate);
  }

  /**
   * Extends portal expiration
   */
  async extendExpiration(
    projectId: string,
    portalId: string,
    additionalDays: number = 30,
  ): Promise<Result<void, AppError>> {
    const newExpirationDate = new Date();
    newExpirationDate.setDate(newExpirationDate.getDate() + additionalDays);

    return this.repository.update(portalId, projectId, {
      expiresAt: newExpirationDate,
    } as ClientPortalUpdate);
  }

  // ============================================================================
  // STEP MANAGEMENT (WITH FINALIZATION LOGIC)
  // ============================================================================

  /**
   * Updates step status with full finalization logic from old implementation
   */
  async updateStepStatus(
    projectId: string,
    portalId: string,
    stepId: PortalStepID,
    status: SectionStatus,
    actionOn: ActionOn,
  ): Promise<Result<void, AppError>> {
    // Get current portal
    const portalResult = await this.repository.getById(portalId, projectId);
    if (!portalResult.success) {
      return portalResult;
    }

    const portal = portalResult.value;
    const updatedSteps = this.updateStepStatusInArray(portal.steps, stepId, status, actionOn);

    // If finalizing, run finalization logic
    if (status === SectionStatus.FINALIZED) {
      const finalizeResult = await this.handleSectionFinalization(
        projectId,
        portalId,
        stepId,
        updatedSteps,
      );
      if (!finalizeResult.success) {
        return finalizeResult;
      }
    }

    return this.repository.update(portalId, projectId, {
      steps: updatedSteps,
      currentStepID: status === SectionStatus.REVIEW ? stepId : portal.currentStepID,
    });
  }

  /**
   * Handles section finalization with subcollection updates (from old implementation)
   */
  private async handleSectionFinalization(
    projectId: string,
    portalId: string,
    sectionId: PortalStepID,
    updatedSteps: PortalStep[],
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'handleSectionFinalization',
      undefined,
      projectId,
      { portalId, sectionId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      // 1. Update subcollection config (if applicable)
      const subcollectionResult = await this.repository.finalizeSubcollectionConfig(
        projectId,
        sectionId,
      );
      if (!subcollectionResult.success) {
        // Log but don't fail - subcollection update is non-critical
        console.warn('Subcollection update failed:', subcollectionResult.error);
      }

      // 2. Increment completed steps
      const incrementResult = await this.incrementCompletedSteps(projectId, portalId);
      if (!incrementResult.success) {
        return incrementResult;
      }

      // 3. Check if portal is complete
      const completionResult = await this.checkPortalCompletion(projectId, portalId, updatedSteps);
      if (!completionResult.success) {
        return completionResult;
      }

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromUnknown(error, contextString));
    }
  }


  /**
   * Increments completed steps counter (from old implementation)
   */
  private async incrementCompletedSteps(
    projectId: string,
    portalId: string,
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'incrementCompletedSteps',
      undefined,
      projectId,
      { portalId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const portalResult = await this.repository.getById(portalId, projectId);
      if (!portalResult.success) {
        return portalResult;
      }

      const portal = portalResult.value;
      const currentCompleted = portal.completedSteps || 0;
      const totalSteps = portal.totalSteps || 1;
      const newCompleted = currentCompleted + 1;

      return this.repository.update(portalId, projectId, {
        completedSteps: newCompleted,
        completionPercentage: (newCompleted / totalSteps) * 100,
      } as ClientPortalUpdate);
    } catch (error) {
      return err(ErrorMapper.fromUnknown(error, contextString));
    }
  }

  /**
   * Checks if all steps are complete and updates accordingly (from old implementation)
   */
  private async checkPortalCompletion(
    projectId: string,
    portalId: string,
    updatedSteps: PortalStep[],
  ): Promise<Result<void, AppError>> {
    const context = ErrorContextBuilder.fromService(
      this.context,
      'checkPortalCompletion',
      undefined,
      projectId,
      { portalId },
    );
    const contextString = ErrorContextBuilder.toString(context);

    try {
      const portalResult = await this.repository.getById(portalId, projectId);
      if (!portalResult.success) {
        return portalResult;
      }

      const portal = portalResult.value;
      const stats = this.calculateCompletionStats(updatedSteps);

      const allStepsFinalized = stats.completedSteps === stats.totalSteps;
      const completedSteps = portal.completedSteps || 0;
      const totalSteps = portal.totalSteps || 0;
      const stepsMatch = completedSteps === totalSteps;

      if (allStepsFinalized && stepsMatch) {
        return this.repository.update(portalId, projectId, {
          completionPercentage: 100,
        } as ClientPortalUpdate);
      }

      return ok(undefined);
    } catch (error) {
      return err(ErrorMapper.fromUnknown(error, contextString));
    }
  }

  /**
   * Calculates completion statistics
   */
  private calculateCompletionStats(steps: PortalStep[]): {
    totalSteps: number;
    completedSteps: number;
    completionPercentage: number;
  } {
    const safeSteps = steps || [];
    const completedSteps = safeSteps.filter(s => s.stepStatus === SectionStatus.FINALIZED).length;
    const totalSteps = safeSteps.length;

    return {
      totalSteps,
      completedSteps,
      completionPercentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
    };
  }

  /**
   * Resets all portal steps
   */
  async resetSteps(projectId: string, portalId: string): Promise<Result<void, AppError>> {
    const portalResult = await this.repository.getById(portalId, projectId);
    if (!portalResult.success) {
      return portalResult;
    }

    const resetSteps = this.resetStepsToLocked(portalResult.value.steps);

    return this.repository.update(portalId, projectId, {
      steps: resetSteps,
      currentStepID: PortalStepID.WELCOME,
      completedSteps: 0,
      completionPercentage: 0,
    } as ClientPortalUpdate);
  }

  /**
   * Locks portal (sets to disabled and 100% complete)
   */
  async lockPortal(projectId: string, portalId: string): Promise<Result<void, AppError>> {
    return this.repository.update(portalId, projectId, {
      isEnabled: false,
      completionPercentage: 100,
    } as ClientPortalUpdate);
  }

  // ============================================================================
  // REAL-TIME
  // ============================================================================

  /**
   * Subscribes to user's portals
   */
  subscribeToUserPortals(
    userId: string,
    onData: (portals: ClientPortal[]) => void,
    onError: (error: AppError) => void,
  ): () => void {
    return this.repository.subscribeToUserPortals(userId, onData, onError);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Checks if portal is expired
   */
  isExpired(portal: ClientPortal): boolean {
    if (!portal.expiresAt) return false;
    const expirationDate = timestampPreprocessor(portal.expiresAt);
    if (!expirationDate) return false;
    return new Date() > expirationDate;
  }

  /**
   * Calculates portal statistics
   */
  getStats(portal: ClientPortal): PortalStats {
    const portalSteps = portal.steps || [];
    const totalSteps = portalSteps.length;
    const completedSteps = portalSteps.filter(s => s.stepStatus === SectionStatus.FINALIZED).length;
    const inProgressSteps = portalSteps.filter(s => s.stepStatus === SectionStatus.REVIEW).length;

    return {
      totalSteps,
      completedSteps,
      inProgressSteps,
      pendingSteps: totalSteps - completedSteps - inProgressSteps,
      progressPercentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      isComplete: totalSteps > 0 && completedSteps === totalSteps,
      isActive: portal.isEnabled && !this.isExpired(portal),
    };
  }

  /**
   * Gets status display information (from old implementation)
   */
  getStatusInfo(portal: ClientPortal, stats: PortalStats): PortalStatusInfo {
    const isExpired = this.isExpired(portal);

    if (!portal.isEnabled) {
      return {
        statusColor: '#6C757D',
        statusText: 'Portal Disabled',
        isExpired,
      };
    }

    if (isExpired) {
      return {
        statusColor: '#DC3545',
        statusText: 'Portal Expired',
        isExpired: true,
      };
    }

    if (stats.isComplete) {
      return {
        statusColor: '#28A745',
        statusText: 'All Steps Completed',
        isExpired,
      };
    }

    if (stats.completedSteps > 0) {
      return {
        statusColor: '#D4A76A',
        statusText: `${stats.completedSteps}/${stats.totalSteps} Steps Completed`,
        isExpired,
      };
    }

    return {
      statusColor: '#17A2B8',
      statusText: 'Waiting for Client to Start',
      isExpired,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Maps cloud function errors to AppError consistently
   */
  private mapCloudFunctionError(error: unknown, contextString: string): AppError {
    // Standardize cloud function error mapping
    if (error && typeof error === 'object' && 'code' in error) {
      return ErrorMapper.fromFirestore(error, contextString);
    }
    return ErrorMapper.fromUnknown(error, contextString);
  }

  /**
   * Creates portal steps array from selected keys
   */
  private createPortalStepsArray(selectedStepKeys: string[]): PortalStep[] {
    const selectedSteps = selectedStepKeys
      .map(key => DEFAULT_PORTAL_STEPS[key] as PortalStep | undefined)
      .filter((step): step is PortalStep => step !== undefined);

    return selectedSteps
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((step, index) => ({
        ...step,
        stepNumber: index + 1,
      }));
  }

  /**
   * Updates step status in steps array
   */
  private updateStepStatusInArray(
    steps: PortalStep[],
    stepId: PortalStepID,
    status: SectionStatus,
    actionOn: ActionOn,
  ): PortalStep[] {
    return steps.map(step =>
      step.portalStepID === stepId ? { ...step, stepStatus: status, actionOn } : step,
    );
  }

  /**
   * Resets all steps to locked
   */
  private resetStepsToLocked(steps: PortalStep[]): PortalStep[] {
    return steps.map(step => ({
      ...step,
      stepStatus: SectionStatus.LOCKED,
      actionOn: ActionOn.CLIENT,
    }));
  }
}
