/*--------------------------------------------------------------------------------
  @file      use-app-styles.ts
  @author    Kyle Lovesy
  @date      2025-10-25
  @version   1.0.0
  @description Hooks for the app using React Native Paper
--------------------------------------------------------------------------------*/

import { useTheme } from 'react-native-paper';
import { borderRadius, createAppStyles, createCommonStyles, spacing } from '@/constants/styles';
import { AppTheme } from '@/constants/theme';
import { typography } from '@/constants/typography';

/**
 * Enhanced hook that provides everything you need for styling
 * Works seamlessly with your existing PaperProvider setup
 */
export const useAppStyles = () => {
  const theme = useTheme<AppTheme>();

  return {
    theme,
    styles: createAppStyles(theme),
    commonStyles: createCommonStyles(theme),
    typography,
    spacing,
    borderRadius,
  };
};

/**
 * Lightweight hook for just theme colors
 * Use when you only need colors and not full styles
 */
export const useAppTheme = () => {
  return useTheme<AppTheme>();
};

/**
 * Hook for responsive typography
 * Automatically applies theme colors to typography styles
 */
export const useTypography = () => {
  const theme = useAppTheme();

  return {
    // Pre-styled typography with theme colors
    displayLarge: { ...typography.displayLarge, color: theme.colors.onBackground },
    displayMedium: { ...typography.displayMedium, color: theme.colors.onBackground },
    displaySmall: { ...typography.displaySmall, color: theme.colors.onBackground },

    headlineLarge: { ...typography.headlineLarge, color: theme.colors.onBackground },
    headlineMedium: { ...typography.headlineMedium, color: theme.colors.onBackground },
    headlineSmall: { ...typography.headlineSmall, color: theme.colors.onBackground },

    titleLarge: { ...typography.titleLarge, color: theme.colors.onSurface },
    titleMedium: { ...typography.titleMedium, color: theme.colors.onSurface },
    titleSmall: { ...typography.titleSmall, color: theme.colors.onSurface },

    bodyLarge: { ...typography.bodyLarge, color: theme.colors.onSurface },
    bodyMedium: { ...typography.bodyMedium, color: theme.colors.onSurface },
    bodySmall: { ...typography.bodySmall, color: theme.colors.onSurface },

    labelLarge: { ...typography.labelLarge, color: theme.colors.onSurface },
    labelMedium: { ...typography.labelMedium, color: theme.colors.onSurface },
    labelSmall: { ...typography.labelSmall, color: theme.colors.onSurface },

    // Variant colors
    onSurfaceVariant: {
      bodyLarge: { ...typography.bodyLarge, color: theme.colors.onSurfaceVariant },
      bodyMedium: { ...typography.bodyMedium, color: theme.colors.onSurfaceVariant },
      bodySmall: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
    },

    // Primary colored text
    primary: {
      titleLarge: { ...typography.titleLarge, color: theme.colors.primary },
      titleMedium: { ...typography.titleMedium, color: theme.colors.primary },
      bodyLarge: { ...typography.bodyLarge, color: theme.colors.primary },
    },

    // Error colored text
    error: {
      titleMedium: { ...typography.titleMedium, color: theme.colors.error },
      bodyMedium: { ...typography.bodyMedium, color: theme.colors.error },
    },
  };
};
