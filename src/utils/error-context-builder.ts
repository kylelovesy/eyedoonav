/*---------------------------------------
File: src/utils/error-context-builder.ts
Description: Utility for building consistent error context across the application.
Provides standardized methods for creating LogContext with userId and projectId support.

Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 2.0.0
---------------------------------------*/

// Domain/types
import { LogContext } from '@/domain/common/errors';

/**
 * Builder class for creating consistent error context across the application.
 * Always include userId and projectId when available for better error tracking.
 *
 * @example
 * ```typescript
 * // Service with userId
 * const context = ErrorContextBuilder.fromService(
 *   'AuthService',
 *   'signUp',
 *   userId,
 *   undefined,
 *   { operation: 'create-user' }
 * );
 *
 * // Repository with userId and projectId
 * const context = ErrorContextBuilder.fromRepository(
 *   'ProjectRepository',
 *   'updateProject',
 *   userId,
 *   projectId,
 *   { field: 'name' }
 * );
 * ```
 */
export class ErrorContextBuilder {
  /**
   * Creates context from service name and method.
   * ALWAYS include userId/projectId if available for better error tracking.
   *
   * @param serviceName - Name of the service (e.g., 'AuthService')
   * @param method - Method name within the service (e.g., 'signUp')
   * @param userId - Optional user ID for error tracking
   * @param projectId - Optional project ID for error tracking
   * @param metadata - Optional additional metadata
   * @returns LogContext with service information
   *
   * @example
   * ```typescript
   * const context = ErrorContextBuilder.fromService(
   *   'UserService',
   *   'updateProfile',
   *   userId,
   *   undefined,
   *   { field: 'displayName' }
   * );
   * ```
   */
  static fromService(
    serviceName: string,
    method: string,
    userId?: string,
    projectId?: string,
    metadata?: Record<string, unknown>,
  ): LogContext {
    return {
      component: serviceName,
      method,
      userId,
      projectId,
      metadata,
    };
  }

  /**
   * Creates context from repository name and method.
   * ALWAYS include userId/projectId if available for better error tracking.
   *
   * @param repoName - Name of the repository (e.g., 'UserRepository')
   * @param method - Method name within the repository (e.g., 'create')
   * @param userId - Optional user ID for error tracking
   * @param projectId - Optional project ID for error tracking
   * @param metadata - Optional additional metadata
   * @returns LogContext with repository information
   *
   * @example
   * ```typescript
   * const context = ErrorContextBuilder.fromRepository(
   *   'ProjectRepository',
   *   'updateProject',
   *   userId,
   *   projectId,
   *   { field: 'name' }
   * );
   * ```
   */
  static fromRepository(
    repoName: string,
    method: string,
    userId?: string,
    projectId?: string,
    metadata?: Record<string, unknown>,
  ): LogContext {
    return {
      component: repoName,
      method,
      userId,
      projectId,
      metadata,
    };
  }

  /**
   * Creates context from hook name and method.
   * ALWAYS include userId/projectId if available for better error tracking.
   *
   * @param hookName - Name of the hook (e.g., 'useAuth')
   * @param method - Method name within the hook (e.g., 'signIn')
   * @param userId - Optional user ID for error tracking
   * @param projectId - Optional project ID for error tracking
   * @param metadata - Optional additional metadata
   * @returns LogContext with hook information
   *
   * @example
   * ```typescript
   * const context = ErrorContextBuilder.fromHook(
   *   'useProject',
   *   'updateProject',
   *   userId,
   *   projectId
   * );
   * ```
   */
  static fromHook(
    hookName: string,
    method: string,
    userId?: string,
    projectId?: string,
    metadata?: Record<string, unknown>,
  ): LogContext {
    return {
      component: hookName,
      method,
      userId,
      projectId,
      metadata,
    };
  }

  /**
   * Creates context from component name and action.
   * ALWAYS include userId/projectId if available for better error tracking.
   *
   * @param componentName - Name of the component (e.g., 'SignUpForm')
   * @param action - Action name within the component (e.g., 'handleSubmit')
   * @param userId - Optional user ID for error tracking
   * @param projectId - Optional project ID for error tracking
   * @param metadata - Optional additional metadata
   * @returns LogContext with component information
   *
   * @example
   * ```typescript
   * const context = ErrorContextBuilder.fromComponent(
   *   'ProjectForm',
   *   'handleSubmit',
   *   userId,
   *   projectId
   * );
   * ```
   */
  static fromComponent(
    componentName: string,
    action: string,
    userId?: string,
    projectId?: string,
    metadata?: Record<string, unknown>,
  ): LogContext {
    return {
      component: componentName,
      method: action,
      userId,
      projectId,
      metadata,
    };
  }

  /**
   * Adds user ID to an existing context.
   * Useful when you need to enrich context created from other sources.
   *
   * @param context - Existing LogContext
   * @param userId - User ID to add
   * @returns Updated LogContext with userId
   *
   * @example
   * ```typescript
   * let context = ErrorContextBuilder.fromService('AuthService', 'signIn');
   * context = ErrorContextBuilder.withUserId(context, userId);
   * ```
   */
  static withUserId(context: LogContext, userId: string): LogContext {
    return {
      ...context,
      userId,
    };
  }

  /**
   * Adds project ID to an existing context.
   * Useful when you need to enrich context created from other sources.
   *
   * @param context - Existing LogContext
   * @param projectId - Project ID to add
   * @returns Updated LogContext with projectId in both property and metadata
   *
   * @example
   * ```typescript
   * let context = ErrorContextBuilder.fromRepository('ProjectRepository', 'get');
   * context = ErrorContextBuilder.withProjectId(context, projectId);
   * ```
   */
  static withProjectId(context: LogContext, projectId: string): LogContext {
    return {
      ...context,
      projectId,
      metadata: {
        ...context.metadata,
        projectId,
      },
    };
  }

  /**
   * Adds custom metadata to an existing context.
   * Merges with existing metadata.
   *
   * @param context - Existing LogContext
   * @param metadata - Additional metadata to merge
   * @returns Updated LogContext with merged metadata
   *
   * @example
   * ```typescript
   * let context = ErrorContextBuilder.fromService('UserService', 'update');
   * context = ErrorContextBuilder.withMetadata(context, { field: 'email' });
   * ```
   */
  static withMetadata(context: LogContext, metadata: Record<string, unknown>): LogContext {
    return {
      ...context,
      metadata: {
        ...context.metadata,
        ...metadata,
      },
    };
  }

  /**
   * Creates a string representation of context (for backward compatibility).
   * Format: "component.method"
   *
   * @param context - LogContext to convert
   * @returns String representation of context
   *
   * @example
   * ```typescript
   * const context = ErrorContextBuilder.fromService('AuthService', 'signUp');
   * ErrorContextBuilder.toString(context); // 'AuthService.signUp'
   * ```
   */
  static toString(context: LogContext): string {
    const parts: string[] = [];
    if (context.component) parts.push(context.component);
    if (context.method) parts.push(context.method);
    return parts.join('.');
  }

  /**
   * Creates context from a string (for backward compatibility).
   * Parses "component.method" format.
   *
   * @param contextString - String in format "component.method"
   * @returns LogContext parsed from string
   *
   * @example
   * ```typescript
   * const context = ErrorContextBuilder.fromString('AuthService.signUp');
   * // { component: 'AuthService', method: 'signUp', context: 'AuthService.signUp' }
   * ```
   */
  static fromString(contextString: string): LogContext {
    const parts = contextString.split('.');
    return {
      component: parts[0] || undefined,
      method: parts[1] || undefined,
      context: contextString,
    };
  }
}
