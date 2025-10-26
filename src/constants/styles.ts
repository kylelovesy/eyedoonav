/*--------------------------------------------------------------------------------
  @file      styles.ts
  @author    Kyle Lovesy
  @date      2025-10-25
  @version   1.0.0
  @description Common styles for the app using React Native Paper
--------------------------------------------------------------------------------*/
import { StyleSheet } from 'react-native';
import { AppTheme } from './theme';
import { typography } from './typography';

// =================================================================================
// MARK: - Common Spacing and Sizing Constants
// =================================================================================

const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

// =================================================================================
// MARK: - Authentication Styles
// =================================================================================

const createAuthStyles = (theme: AppTheme) => ({
  authContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  authLogo: {
    width: 60,
    height: 60,
    marginBottom: spacing.md,
    resizeMode: 'contain' as const,
  },
  authIconLarge: {
    width: 120,
    height: 120,
    resizeMode: 'contain' as const,
  },

  setupContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  // setupTopbarContainer: {
  //   flexDirection: 'row' as const,
  //   alignItems: 'center' as const,
  //   justifyContent: 'center' as const,
  //   height: 60,
  //   width: '100%',
  //   position: 'relative' as const,
  //   paddingHorizontal: spacing.md,
  //   borderBottomWidth: 1,
  //   borderBottomColor: theme.colors.outline
  // },
  // setupTopbarLeft: {
  //   position: 'absolute',
  //   left: spacing.md,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // setupTopbarRight: {
  //   position: 'absolute',
  //   right: spacing.md,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // setupTopbarTitle: {
  //   ...typography.headlineSmall,
  //   fontWeight: 'bold',
  //   color: theme.colors.onSurface,
  // },
  // setupTopbarLogo: {
  //   width: 40,
  //   height: 40,
  //   resizeMode: 'contain',
  // },
  setupTopContentContainer: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.surface,
  },
  setupContentContainer: {
    flex: 1,
    justifyContent: 'flex-start' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: theme.colors.surface,
    marginTop: spacing.md,
  },
  setupButtonGroup: {
    gap: spacing.sm,
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.surface,
  },

  // =================================================================================
  // MARK: - Setup Styles
  // =================================================================================

  button: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  buttonLabel: {
    ...typography.bodyLarge,
    color: theme.colors.primary,
    textDecorationLine: 'underline' as const,
    textAlign: 'center' as const,
  },

  checkboxContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  checkboxLabelContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  checkboxLabel: {
    ...typography.bodyMedium,
    color: theme.colors.onSurface,
  },
  checkboxLinkLabel: {
    color: theme.colors.primary,
    textDecorationLine: 'underline' as const,
  },
  authErrorText: {
    ...typography.labelMedium,
    color: theme.colors.error,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  authSuccessText: {
    ...typography.labelMedium,
    color: theme.colors.primary,
    textAlign: 'center' as const,
    marginVertical: spacing.lg,
  },
});

// =================================================================================
// MARK: - Base Styles (Shared across all tabs)
// =================================================================================

const createBaseStyles = (theme: AppTheme) => ({
  // Page Structure (used by all tabs)
  pageHeaderCard: {
    backgroundColor: 'transparent',
    elevation: 0,
    alignItems: 'flex-start' as const,
    marginBottom: spacing.sm,
  },
  pageTitle: {
    ...typography.headlineMedium,
    color: theme.colors.onBackground,
  },
  pageSubtitle: {
    ...typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  cardContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: spacing.lg,
  },

  // Common Card Styles
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    elevation: 1,
  },
  cardIcon: {
    marginRight: spacing.lg,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    ...typography.titleMedium,
    color: theme.colors.onSurface,
  },
  cardSubtitle: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },

  // Common List Item
  listItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.outline,
  },
  listItemText: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  listItemTitle: {
    ...typography.titleMedium,
    color: theme.colors.onSurface,
  },
  listItemSubtitle: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
});

// =================================================================================
// MARK: - Consolidated App Styles
// =================================================================================

export const createAppStyles = (theme: AppTheme) => {
  const baseStyles = createBaseStyles(theme);
  const authStyles = createAuthStyles(theme);

  return StyleSheet.create({
    // Base styles available to all components
    ...baseStyles,
    ...authStyles,
    dashboardAppbar: {
      margin: spacing.none,
      padding: spacing.xs,
      paddingVertical: spacing.none,
    },
    iconContainer: {
      margin: spacing.xs,
      padding: spacing.xs,
    },
    // Dashboard Specific
    buttonGroup: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    listContainer: {
      gap: spacing.sm,
    },

    // People Tab Specific
    searchInput: {
      marginBottom: spacing.md,
    },
    tagInputContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    photoGridItem: {
      width: '32%',
      aspectRatio: 1,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: borderRadius.sm,
    },
    qrCodeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      padding: spacing.xxl,
      borderRadius: borderRadius.lg,
      alignSelf: 'center',
      marginBottom: spacing.lg,
      elevation: 2,
    },

    // Settings Tab Specific
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
      elevation: 1,
    },
    settingsIconContainer: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginRight: spacing.lg,
    },
    subscriptionCard: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      elevation: 1,
    },
    subscriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    subscriptionPlan: {
      ...typography.titleLarge,
      color: theme.colors.onSurface,
    },
    subscriptionStatus: {
      ...typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      marginVertical: spacing.sm,
    },
    dangerZoneContainer: {
      marginTop: spacing.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.errorContainer,
    },
    dangerZoneTitle: {
      ...typography.titleMedium,
      color: theme.colors.error,
      marginBottom: spacing.sm,
    },

    // Shots Tab Specific
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      elevation: 1,
    },
    accordionTitle: {
      ...typography.titleMedium,
      color: theme.colors.onSurface,
      flex: 1,
      marginLeft: spacing.lg,
    },
    accordionContent: {
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: borderRadius.md,
      borderBottomRightRadius: borderRadius.md,
      paddingBottom: spacing.sm,
      elevation: 1,
    },
    checklistContainer: {
      paddingHorizontal: spacing.sm,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
    },
    checklistItemTextContainer: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    checklistItemTitle: {
      ...typography.bodyLarge,
      color: theme.colors.onSurface,
    },
    checklistItemSubtitle: {
      ...typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.xs,
    },
    completed: {
      textDecorationLine: 'line-through',
      color: theme.colors.onSurfaceVariant,
      opacity: 0.6,
    },

    // Timeline Tab Specific
    timelineContainer: {
      paddingVertical: spacing.lg,
    },
    eventRow: {
      flexDirection: 'row',
      minHeight: 80,
    },
    timeContainer: {
      alignItems: 'center',
      width: 60,
    },
    timeText: {
      ...typography.titleMedium,
      color: theme.colors.onSurface,
    },
    lineConnector: {
      flex: 1,
      width: 2,
      backgroundColor: theme.colors.outline,
    },
    timelineIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      marginVertical: spacing.sm,
      elevation: 1,
    },
    eventDetails: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: spacing.lg,
    },
    eventTitle: {
      ...typography.titleMedium,
      color: theme.colors.onSurface,
    },
    eventSubtitle: {
      ...typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.xs,
    },
    activeIcon: {
      backgroundColor: theme.colors.primary,
    },
    activeTime: {
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    activeTitle: {
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    pastEvent: {
      opacity: 0.6,
    },
    notificationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
      elevation: 1,
    },
    goldenHourCard: {
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      elevation: 2,
    },
    goldenHourRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    goldenHourItem: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    goldenHourTime: {
      ...typography.titleLarge,
      color: theme.colors.onSecondaryContainer,
    },
    goldenHourLabel: {
      ...typography.bodyMedium,
      color: theme.colors.onSecondaryContainer,
    },
  });
};

// =================================================================================
// MARK: - Common Styles
// =================================================================================

export const createCommonStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Container Styles
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    footer: {
      marginVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      alignItems: 'center' as const,
      textAlign: 'center' as const,
      borderTopWidth: 1,
      borderColor: theme.colors.outline,
    },
    footerLink: {
      ...typography.labelLarge,
      color: theme.colors.primary,
    },
    header: {
      marginVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    scrollContainer: {
      flex: 1,
      padding: spacing.lg,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    overlay: {
      backgroundColor: theme.colors.overlay,
    },

    // Text Styles
    text: {
      color: theme.colors.onBackground,
    },
    textMuted: {
      color: theme.colors.onSurfaceVariant,
    },

    // Layout Styles
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    column: {
      flexDirection: 'column',
    },
    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    tabBar: {
      borderTopWidth: 1,
      height: 70,
      paddingBottom: spacing.md,
      paddingTop: spacing.sm,
    },

    // Spacing Utilities
    marginTop: { marginTop: spacing.md },
    marginBottom: { marginBottom: spacing.md },
    marginVertical: { marginVertical: spacing.md },
    marginHorizontal: { marginHorizontal: spacing.lg },
    paddingTop: { paddingTop: spacing.md },
    paddingBottom: { paddingBottom: spacing.md },
    paddingVertical: { paddingVertical: spacing.md },
    paddingHorizontal: { paddingHorizontal: spacing.lg },
  });

// Export spacing and borderRadius for external use
export { borderRadius, spacing };
