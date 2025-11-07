/*---------------------------------------
File: src/components/common/error-display.tsx
Description: Error display component for showing errors with retry functionality.
Author: Kyle Lovesy
Date: 29/10-2025 - 14.00
Version: 1.0.0
---------------------------------------*/

// React/React Native
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Third-party libraries
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Domain/types
import { AppError } from '@/domain/common/errors';

// Hooks
import { useAppStyles } from '@/hooks/use-app-styles';

interface ErrorDisplayProps {
  /** The error to display */
  error: AppError;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * ErrorDisplay component for displaying errors with retry functionality.
 * Shows a centered error message with optional retry button.
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, testID }) => {
  const { theme, typography, spacing, borderRadius } = useAppStyles();

  return (
    <View style={styles.container} testID={testID}>
      <MaterialCommunityIcons
        name="alert-circle"
        size={64}
        color={theme.colors.error}
        style={styles.icon}
      />

      <Text
        style={[
          typography.titleLarge,
          { color: theme.colors.onBackground, textAlign: 'center', marginBottom: spacing.md },
        ]}
      >
        Something went wrong
      </Text>

      <Text
        style={[
          typography.bodyLarge,
          { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.xl },
        ]}
      >
        {error.userMessage}
      </Text>

      {error.retryable && onRetry && (
        <TouchableOpacity
          style={[
            styles.retryButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: borderRadius.sm,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            },
          ]}
          onPress={onRetry}
        >
          <Text style={[typography.bodyMedium, { color: theme.colors.onPrimary }]}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
});
