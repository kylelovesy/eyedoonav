/*---------------------------------------
File: src/components/common/screen.tsx
Description: Screen wrapper component providing consistent layout, error handling,
loading states, and scrolling capabilities across the application.
Serves as the foundation for all screen-level components with error boundaries,
loading indicators, and error displays.

Key Features:
- Error boundary wrapping
- Loading state display
- Error display with retry functionality
- Pull-to-refresh support
- Scrollable/non-scrollable content handling
- Safe area support

Author: Kyle Lovesy
Date: 29/10-2025 - 14.00
Version: 2.0.0
---------------------------------------*/

// React/React Native
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import { ErrorBoundary } from './error-boundary';
import { LoadingIndicator } from './loading-indicator';
import { ErrorDisplay } from './error-display';

// Domain/types
import { AppError } from '@/domain/common/errors';

// Hooks
import { useAppStyles } from '@/hooks/use-app-styles';

interface ScreenWrapperProps {
  /** Content to render inside the screen */
  children: React.ReactNode;
  /** Whether a loading operation is in progress */
  loading?: boolean;
  /** Error to display */
  error?: AppError | null;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for pull-to-refresh */
  onRefresh?: () => Promise<void>;
  /** Whether the content should be scrollable */
  scrollable?: boolean;
  /** Whether to apply safe area insets */
  safeArea?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * ScreenWrapper component provides consistent layout, error handling, and loading states.
 * Used as the foundation for all screen-level components with error boundaries,
 * loading indicators, and error displays with retry functionality.
 */
export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  loading = false,
  error = null,
  onRetry,
  onRefresh,
  scrollable = true,
  safeArea = true,
  testID,
}) => {
  const { theme } = useAppStyles();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const content = (
    <>
      {loading && <LoadingIndicator />}

      {error && !loading && <ErrorDisplay error={error} onRetry={onRetry} />}

      {!loading && !error && children}
    </>
  );

  const Container = safeArea ? SafeAreaView : View;

  if (scrollable) {
    return (
      <ErrorBoundary>
        <Container
          style={[styles.container, { backgroundColor: theme.colors.background }]}
          testID={testID}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              ) : undefined
            }
          >
            {content}
          </ScrollView>
        </Container>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Container
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        testID={testID}
      >
        {content}
      </Container>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
});

// Export both names for backward compatibility
export const Screen = ScreenWrapper;
