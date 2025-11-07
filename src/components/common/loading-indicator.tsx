/*---------------------------------------
File: src/components/common/loading-indicator.tsx
Description: Loading indicator component for displaying loading states.
Author: Kyle Lovesy
Date: 29/10-2025 - 14.00
Version: 1.0.0
---------------------------------------*/

// React/React Native
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// Hooks
import { useAppStyles } from '@/hooks/use-app-styles';

interface LoadingIndicatorProps {
  /** Size of the loading indicator */
  size?: 'small' | 'large';
  /** Optional message to display below the indicator */
  message?: string;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * LoadingIndicator component for displaying loading states.
 * Shows a centered activity indicator with optional message.
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'large',
  message,
  testID,
}) => {
  const { theme, typography, spacing } = useAppStyles();

  return (
    <View style={styles.container} testID={testID}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && (
        <View style={styles.messageContainer}>
          <Text
            style={[
              typography.bodyMedium,
              { color: theme.colors.onSurface, marginTop: spacing.md },
            ]}
          >
            {message}
          </Text>
        </View>
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
  messageContainer: {
    marginTop: 16,
  },
});
