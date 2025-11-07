/*---------------------------------------
File: src/utils/error-context-capture.ts
Description: Utility for capturing error context including user actions and state
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface ErrorContext {
  timestamp: string;
  platform: string;
  appVersion: string;
  buildNumber: string;
  userAgent?: string;
  componentStack?: string;
  userActions?: string[];
  route?: string;
  userId?: string;
}

/**
 * Captures contextual information about the error environment
 */
export class ErrorContextCapture {
  private static userActionHistory: string[] = [];
  private static readonly MAX_HISTORY = 10;
  private static currentRoute: string | null = null;

  /**
   * Capture full error context
   */
  static capture(error: Error, errorInfo?: React.ErrorInfo): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || 'unknown',
      buildNumber: String(
        Constants.expoConfig?.ios?.buildNumber ||
          Constants.expoConfig?.android?.versionCode ||
          'unknown',
      ),
      componentStack: errorInfo?.componentStack || undefined,
      userActions: [...this.userActionHistory],
      route: this.currentRoute || undefined,
    };
  }

  /**
   * Record a user action for error context
   */
  static recordUserAction(action: string): void {
    this.userActionHistory.push(`${new Date().toISOString()}: ${action}`);
    if (this.userActionHistory.length > this.MAX_HISTORY) {
      this.userActionHistory.shift();
    }
  }

  /**
   * Set current route for error context
   */
  static setCurrentRoute(route: string): void {
    this.currentRoute = route;
  }

  /**
   * Clear user action history
   */
  static clearHistory(): void {
    this.userActionHistory = [];
  }

  /**
   * Get recent user actions
   */
  static getRecentActions(): string[] {
    return [...this.userActionHistory];
  }
}
