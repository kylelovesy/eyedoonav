/*---------------------------------------
File: src/components/common/error-boundary.tsx
Description: Enhanced error boundary component with error categorization and reporting
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 2.0.0
---------------------------------------*/
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStyles } from '@/hooks/use-app-styles';
import { useRouter } from 'expo-router';
import { LoggingService } from '@/services/logging-service';
import { AppErrorHandler } from '@/services/error-handler-service';
import { ErrorClassifier, ErrorCategory } from '@/utils/error-classifier';
import { AppError } from '@/domain/common/errors';
import { ErrorCode } from '@/constants/error-code-registry';
import { ErrorMapper } from '@/utils/error-mapper';
import { ErrorContextCapture } from '@/utils/error-context-capture';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void, category: ErrorCategory) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /**
   * If true, will show full screen fallback regardless of error type
   * If false, will use error categorization to determine display
   */
  forceFullScreen?: boolean;
  /**
   * Component to show for non-critical errors (inline display)
   */
  inlineFallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCategory: ErrorCategory | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCategory: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const category = ErrorClassifier.classify(error);
    return {
      hasError: true,
      error,
      errorCategory: category,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Sequence 1 flow from error-flow-mermaid.md:
    // 1. Classify error (already done in getDerivedStateFromError, category is in state)
    const category = this.state.errorCategory || ErrorClassifier.classify(error);

    // 2. Map to AppError
    const appError = this.mapToAppError(error, errorInfo);

    // 3. Capture error context (according to Sequence 1)
    if (appError) {
      const errorContext = ErrorContextCapture.capture(error, errorInfo);

      // Build context for AppErrorHandler
      const context = {
        component: 'ErrorBoundary',
        method: 'componentDidCatch',
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          platform: Platform.OS,
          timestamp: errorContext.timestamp,
          appVersion: errorContext.appVersion,
          buildNumber: errorContext.buildNumber,
          userActions: errorContext.userActions,
          route: errorContext.route,
          severity: category.severity,
          canRecover: category.canRecover,
        },
      };

      // 4. Handle via AppErrorHandler (will log and show toast)
      AppErrorHandler.handle(appError, context);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  /**
   * Map JavaScript Error to AppError if possible
   */
  private mapToAppError(error: Error, errorInfo: React.ErrorInfo): AppError | null {
    try {
      // Check if it's already an AppError
      if ('code' in error && 'userMessage' in error) {
        return error as unknown as AppError;
      }

      // Try to extract error code from error message or stack
      const message = error.message.toLowerCase();
      let errorCode: ErrorCode = ErrorCode.UNKNOWN_ERROR;
      let userMessage = 'An unexpected error occurred. Please try again.';

      if (message.includes('network') || message.includes('fetch')) {
        errorCode = ErrorCode.NETWORK_CONNECTION_ERROR;
        userMessage = 'Network connection failed. Please check your internet connection.';
      } else if (message.includes('timeout')) {
        errorCode = ErrorCode.NETWORK_TIMEOUT;
        userMessage = 'The request took too long. Please try again.';
      } else if (message.includes('permission')) {
        errorCode = ErrorCode.PERMISSION_DENIED;
        userMessage = 'Permission denied. Please check your settings.';
      }

      return ErrorMapper.createGenericError(
        errorCode,
        error.message,
        userMessage,
        `ErrorBoundary: ${errorInfo.componentStack?.split('\n')[0] || 'Unknown component'}`,
        error,
        ErrorClassifier.canRecover(error),
      );
    } catch {
      return null;
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCategory: null,
    });
  };

  render() {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    const { error, errorCategory } = this.state;
    const category = errorCategory || ErrorClassifier.classify(error);
    const shouldShowFullScreen =
      this.props.forceFullScreen !== undefined
        ? this.props.forceFullScreen
        : category.shouldShowFullScreen;

    // Use custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback(error, this.reset, category);
    }

    // Show inline fallback for non-critical errors
    if (!shouldShowFullScreen && this.props.inlineFallback) {
      return this.props.inlineFallback(error, this.reset);
    }

    // Show inline fallback for non-critical errors (default)
    if (!shouldShowFullScreen && category.severity === 'non-critical') {
      return <InlineErrorFallback error={error} onReset={this.reset} />;
    }

    // Show full screen fallback for critical errors
    return (
      <FullScreenErrorFallback
        error={error}
        errorInfo={this.state.errorInfo}
        category={category}
        onReset={this.reset}
      />
    );
  }
}

interface InlineErrorFallbackProps {
  error: Error;
  onReset: () => void;
}

function InlineErrorFallback({ error, onReset }: InlineErrorFallbackProps) {
  const { theme, typography, spacing, borderRadius } = useAppStyles();

  return (
    <View
      style={{
        padding: spacing.md,
        margin: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: theme.colors.errorContainer,
        borderWidth: 1,
        borderColor: theme.colors.error,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={20}
          color={theme.colors.error}
          style={{ marginRight: spacing.sm }}
        />
        <Text style={[typography.titleSmall, { color: theme.colors.onErrorContainer, flex: 1 }]}>
          An error occurred
        </Text>
        <TouchableOpacity onPress={onReset}>
          <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
      <Text style={[typography.bodySmall, { color: theme.colors.onErrorContainer }]}>
        {error instanceof Error && 'userMessage' in error
          ? (error as unknown as AppError).userMessage
          : error.message}
      </Text>
      {ErrorClassifier.canRecover(error) && (
        <TouchableOpacity
          onPress={onReset}
          style={{
            marginTop: spacing.sm,
            padding: spacing.xs,
            alignItems: 'center',
          }}
        >
          <Text style={[typography.labelMedium, { color: theme.colors.error }]}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface FullScreenErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  category: ErrorCategory;
  onReset: () => void;
}

function FullScreenErrorFallback({
  error,
  errorInfo,
  category,
  onReset,
}: FullScreenErrorFallbackProps) {
  const { theme, typography, spacing, borderRadius } = useAppStyles();
  const router = useRouter();
  const [showDetails, setShowDetails] = React.useState(false);

  const handleGoBack = () => {
    router.back();
  };

  const handleRestart = () => {
    onReset();
  };

  const handleReportError = () => {
    // In production, this would send error report to backend/Sentry
    LoggingService.log('Error report requested by user', {
      component: 'ErrorBoundary',
      method: 'handleReportError',
      metadata: {
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo?.componentStack,
      },
    });

    // Show toast confirmation
    AppErrorHandler.handle(
      ErrorMapper.createGenericError(
        ErrorCode.UNKNOWN_ERROR,
        'Error report submitted',
        'Thank you for reporting this error. We will look into it.',
        'ErrorBoundary.handleReportError',
        undefined,
        false,
      ),
    );
  };

  const isAppError = 'code' in error && 'userMessage' in error;
  const displayMessage = isAppError ? error.userMessage : error.message;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxl,
        backgroundColor: theme.colors.background,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100%',
        }}
      >
        <View
          style={{
            borderRadius: borderRadius.lg,
            padding: spacing.xxl,
            alignItems: 'center',
            maxWidth: 400,
            width: '100%',
            backgroundColor: theme.colors.surface,
          }}
        >
          <MaterialCommunityIcons
            name={category.severity === 'critical' ? 'alert-octagon' : 'alert-circle'}
            size={64}
            color={theme.colors.error}
            style={{
              marginBottom: spacing.lg,
            }}
          />

          <Text
            style={{
              ...typography.titleLarge,
              textAlign: 'center',
              marginBottom: spacing.md,
            }}
          >
            {category.severity === 'critical' ? 'Critical Error' : 'Something went wrong'}
          </Text>

          <Text
            style={{
              ...typography.bodyLarge,
              textAlign: 'center',
              marginBottom: spacing.xxl,
            }}
          >
            {displayMessage as string}
          </Text>

          {__DEV__ && (
            <>
              <TouchableOpacity
                onPress={() => setShowDetails(!showDetails)}
                style={{
                  marginBottom: spacing.md,
                  padding: spacing.sm,
                }}
              >
                <Text style={[typography.labelMedium, { color: theme.colors.primary }]}>
                  {showDetails ? 'Hide' : 'Show'} Details
                </Text>
              </TouchableOpacity>

              {showDetails && (
                <View
                  style={{
                    padding: spacing.md,
                    borderRadius: borderRadius.sm,
                    marginBottom: spacing.xxl,
                    width: '100%',
                    backgroundColor: theme.colors.errorContainer,
                  }}
                >
                  <ScrollView style={{ maxHeight: 200 }}>
                    <Text
                      style={{
                        ...typography.bodySmall,
                        fontFamily: 'monospace',
                        marginBottom: spacing.xs,
                      }}
                    >
                      Error: {error.message}
                    </Text>
                    {error.stack && (
                      <Text
                        style={{
                          ...typography.bodySmall,
                          fontFamily: 'monospace',
                          fontSize: 10,
                        }}
                      >
                        {error.stack}
                      </Text>
                    )}
                    {errorInfo?.componentStack && (
                      <Text
                        style={{
                          ...typography.bodySmall,
                          fontFamily: 'monospace',
                          fontSize: 10,
                          marginTop: spacing.xs,
                        }}
                      >
                        Component Stack:{'\n'}
                        {errorInfo.componentStack}
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {/* Error reporting button (shown in production for critical errors) */}
          {category.severity === 'critical' && !__DEV__ && (
            <TouchableOpacity
              onPress={handleReportError}
              style={{
                marginBottom: spacing.md,
                padding: spacing.md,
                borderRadius: borderRadius.sm,
                backgroundColor: theme.colors.secondaryContainer,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="bug"
                size={20}
                color={theme.colors.onSecondaryContainer}
                style={{ marginRight: spacing.xs }}
              />
              <Text style={[typography.labelMedium, { color: theme.colors.onSecondaryContainer }]}>
                Report Error
              </Text>
            </TouchableOpacity>
          )}

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              width: '100%',
            }}
          >
            {category.canRecover && (
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderRadius: borderRadius.sm,
                  alignItems: 'center',
                  backgroundColor: theme.colors.primary,
                }}
                onPress={handleRestart}
              >
                <Text
                  style={{
                    ...typography.bodyMedium,
                    color: theme.colors.onPrimary,
                  }}
                >
                  Try Again
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: borderRadius.sm,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.outline,
              }}
              onPress={handleGoBack}
            >
              <Text
                style={{
                  ...typography.bodyMedium,
                }}
              >
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Convenience wrapper for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, reset: () => void, category: ErrorCategory) => ReactNode,
  options?: {
    forceFullScreen?: boolean;
    inlineFallback?: (error: Error, reset: () => void) => ReactNode;
  },
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary
        fallback={fallback}
        forceFullScreen={options?.forceFullScreen}
        inlineFallback={options?.inlineFallback}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
