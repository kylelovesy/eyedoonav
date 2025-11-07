/*---------------------------------------
File: src/constants/styles.ts
Description: Comprehensive styling system for the Eye-Doo application.
Provides theme-based styles for all components with Material Design 3 principles,
responsive spacing, and consistent visual hierarchy.

Key Features:
- Theme-aware style creation functions
- Material Design 3 spacing and border radius scales
- Component-specific style collections (auth, base, app-specific)
- Common utility styles for layout and typography
- Optimized for React Native performance with StyleSheet.create()

Author: Kyle Lovesy
Date: 26/10-2025 - 22.15
Version: 1.1.0
---------------------------------------*/

/* eslint-disable react-native/sort-styles */
// Styles are organized by logical sections (auth, dashboard, people, settings, etc.)
// rather than strict alphabetical order for better maintainability

import { StyleSheet } from 'react-native';
import { AppTheme } from './theme';
import { typography } from './typography';

// =================================================================================
// MARK: - Design Tokens (Spacing & Border Radius)
// =================================================================================

/**
 * Spacing scale following Material Design 3 principles
 * Provides consistent spacing throughout the application
 * Scale: 4, 8, 12, 16, 20, 24, 32 (multiples of 4 for pixel alignment)
 */
const spacing = {
  none: 0,
  xs: 4, // Small gaps, padding
  sm: 8, // Component padding, small margins
  md: 12, // Standard component spacing
  lg: 16, // Container padding, larger margins
  xl: 20, // Card padding, section spacing
  xxl: 24, // Large containers, modal spacing
  xxxl: 32, // Page-level spacing, hero sections
};

/**
 * Border radius scale for consistent corner rounding
 * Follows Material Design 3 corner radius guidelines
 */
const borderRadius = {
  sm: 8, // Small elements (chips, buttons)
  md: 12, // Standard components (cards, inputs)
  lg: 16, // Large surfaces (modals, bottom sheets)
  xl: 20, // Extra large surfaces (special cases)
};

// =================================================================================
// MARK: - Authentication & Setup Styles
// =================================================================================

/**
 * Creates authentication and setup-related styles
 * Used for login, registration, and onboarding flows
 *
 * @param theme - The application theme object
 * @returns Object containing auth and setup styles
 */
const createAuthStyles = (theme: AppTheme) => ({
  // ============================================================================
  // AUTHENTICATION SCREENS
  // ============================================================================

  /** Main container for authentication screens */
  authContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  /** Standard logo size for auth screens */
  authLogo: {
    width: 60,
    height: 60,
    marginBottom: spacing.md,
    resizeMode: 'contain' as const,
  },

  /** Large icon size for hero/auth sections */
  authIconLarge: {
    width: 120,
    height: 120,
    resizeMode: 'contain' as const,
  },

  // ============================================================================
  // SETUP/ONBOARDING SCREENS
  // ============================================================================

  /** Main container for setup/onboarding screens */
  setupContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },

  /** Top content area for setup screens */
  setupTopContentContainer: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.surface,
  },

  /** Main content container for setup screens */
  setupContentContainer: {
    flex: 1,
    justifyContent: 'flex-start' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: theme.colors.surface,
    marginTop: spacing.md,
  },

  /** Button group container for setup flows */
  setupButtonGroup: {
    gap: spacing.sm,
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.surface,
  },

  // ============================================================================
  // COMMON AUTH COMPONENTS
  // ============================================================================

  /** Base button styles for auth/setup flows */
  button: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },

  /** Link-style button labels */
  buttonLabel: {
    ...typography.bodyLarge,
    color: theme.colors.primary,
    textDecorationLine: 'underline' as const,
    textAlign: 'center' as const,
  },

  /** Checkbox container with label */
  checkboxContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },

  /** Label container within checkbox */
  checkboxLabelContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  /** Primary checkbox label text */
  checkboxLabel: {
    ...typography.bodyMedium,
    color: theme.colors.onSurface,
  },

  /** Link-style text within checkbox labels */
  checkboxLinkLabel: {
    color: theme.colors.primary,
    textDecorationLine: 'underline' as const,
  },

  /** Error message styling */
  authErrorText: {
    ...typography.labelMedium,
    color: theme.colors.error,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },

  /** Success message styling */
  authSuccessText: {
    ...typography.labelMedium,
    color: theme.colors.primary,
    textAlign: 'center' as const,
    marginVertical: spacing.lg,
  },
});

// =================================================================================
// MARK: - Base Styles (Shared Components)
// =================================================================================

/**
 * Creates base styles shared across all application screens and components
 * Includes common patterns for cards, lists, typography, and layout
 *
 * @param theme - The application theme object
 * @returns Object containing base component styles
 */
const createBaseStyles = (theme: AppTheme) => ({
  // ============================================================================
  // PAGE STRUCTURE & HEADERS
  // ============================================================================

  /** Page header card container (transparent background) */
  pageHeaderCard: {
    backgroundColor: 'transparent',
    elevation: 0,
    alignItems: 'flex-start' as const,
    marginBottom: spacing.sm,
  },

  /** Main page title styling */
  pageTitle: {
    ...typography.headlineMedium,
    color: theme.colors.onBackground,
  },

  /** Page subtitle/description styling */
  pageSubtitle: {
    ...typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },

  /** Standard card content container with padding */
  cardContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: spacing.lg,
  },

  // ============================================================================
  // CARD COMPONENTS
  // ============================================================================

  /** Base card styling with elevation and rounded corners */
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    elevation: 1,
  },

  /** Icon container within cards (primary colored background) */
  cardIcon: {
    marginRight: spacing.lg,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },

  /** Text content container within cards */
  cardTextContainer: {
    flex: 1,
  },

  /** Card title typography */
  cardTitle: {
    ...typography.titleMedium,
    color: theme.colors.onSurface,
  },

  /** Card subtitle/description typography */
  cardSubtitle: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },

  // ============================================================================
  // LIST COMPONENTS
  // ============================================================================

  /** Base list item container with bottom border */
  listItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.outline,
  },

  /** Text content area within list items */
  listItemText: {
    flex: 1,
    marginLeft: spacing.lg,
  },

  /** List item title typography */
  listItemTitle: {
    ...typography.titleMedium,
    color: theme.colors.onSurface,
  },

  /** List item subtitle typography */
  listItemSubtitle: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
});

// =================================================================================
// MARK: - Application-Specific Styles
// =================================================================================

/**
 * Creates application-specific styles for all screens and components
 * Combines base styles with screen-specific styling for each major app section
 *
 * @param theme - The application theme object
 * @returns StyleSheet object containing all application styles
 */
export const createAppStyles = (theme: AppTheme) => {
  const baseStyles = createBaseStyles(theme);
  const authStyles = createAuthStyles(theme);

  return StyleSheet.create({
    // ============================================================================
    // SHARED STYLES (Available to all components)
    // ============================================================================

    /** Base styles from createBaseStyles function */
    ...baseStyles,

    /** Auth and setup styles from createAuthStyles function */
    ...authStyles,

    // ============================================================================
    // DASHBOARD & NAVIGATION
    // ============================================================================

    /** Horizontal button group container */
    buttonGroup: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },

    /** Dashboard app bar styling */
    dashboardAppbar: {
      margin: spacing.none,
      padding: spacing.xs,
      paddingVertical: spacing.none,
    },

    /** Icon container for navigation and action buttons */
    iconContainer: {
      margin: spacing.xs,
      padding: spacing.xs,
    },

    /** Container for lists with consistent gaps */
    listContainer: {
      gap: spacing.sm,
    },

    // ============================================================================
    // PEOPLE TAB - Contact Management
    // ============================================================================

    /** Photo grid container for contact images */
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },

    /** Individual photo grid item (3 per row) */
    photoGridItem: {
      aspectRatio: 1,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: borderRadius.sm,
      width: '32%', // 3 items per row with gaps
    },

    /** QR code display container with elevation */
    qrCodeContainer: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 2,
      justifyContent: 'center',
      marginBottom: spacing.lg,
      padding: spacing.xxl,
    },

    /** Search input container styling */
    searchInput: {
      marginBottom: spacing.md,
    },
    /** Container for tag chips with wrapping */
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },

    /** Tag input row container */
    tagInputContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },

    // ============================================================================
    // SETTINGS TAB - App Configuration
    // ============================================================================

    /** Individual settings row container */
    settingsRow: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      elevation: 1,
      flexDirection: 'row',
      marginBottom: spacing.sm,
      padding: spacing.lg,
    },

    /** Icon container for settings rows */
    settingsIconContainer: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: borderRadius.sm,
      marginRight: spacing.lg,
      padding: spacing.sm,
    },

    /** Subscription information card */
    subscriptionCard: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: borderRadius.md,
      elevation: 1,
      marginBottom: spacing.lg,
      padding: spacing.lg,
    },

    /** Subscription card header with plan name and status */
    subscriptionHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    /** Current subscription plan name */
    subscriptionPlan: {
      ...typography.titleLarge,
      color: theme.colors.onSurface,
    },

    /** Subscription status text */
    subscriptionStatus: {
      ...typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      marginVertical: spacing.sm,
    },

    /** Danger zone container for destructive actions */
    dangerZoneContainer: {
      backgroundColor: theme.colors.errorContainer,
      borderColor: theme.colors.error,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      marginTop: spacing.xxl,
      padding: spacing.lg,
    },

    /** Danger zone section title */
    dangerZoneTitle: {
      ...typography.titleMedium,
      color: theme.colors.error,
      marginBottom: spacing.sm,
    },

    // ============================================================================
    // SHOTS TAB - Photography Workflow
    // ============================================================================

    /** Accordion/expandable section header */
    accordionHeader: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      elevation: 1,
      flexDirection: 'row',
      padding: spacing.lg,
    },

    /** Accordion title text */
    accordionTitle: {
      ...typography.titleMedium,
      color: theme.colors.onSurface,
      flex: 1,
      marginLeft: spacing.lg,
    },

    /** Accordion expanded content container */
    accordionContent: {
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: borderRadius.md,
      borderBottomRightRadius: borderRadius.md,
      elevation: 1,
      paddingBottom: spacing.sm,
    },

    /** Checklist container within accordions */
    checklistContainer: {
      paddingHorizontal: spacing.sm,
    },

    /** Individual checklist item container */
    checklistItem: {
      alignItems: 'center',
      flexDirection: 'row',
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
    },

    /** Checklist item text content container */
    checklistItemTextContainer: {
      flex: 1,
      marginLeft: spacing.sm,
    },

    /** Checklist item title */
    checklistItemTitle: {
      ...typography.bodyLarge,
      color: theme.colors.onSurface,
    },

    /** Checklist item subtitle/description */
    checklistItemSubtitle: {
      ...typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.xs,
    },

    /** Completed checklist item styling */
    completed: {
      color: theme.colors.onSurfaceVariant,
      opacity: 0.6,
      textDecorationLine: 'line-through',
    },

    // ============================================================================
    // TIMELINE TAB - Schedule & Events
    // ============================================================================

    /** Main timeline container with vertical padding */
    timelineContainer: {
      paddingVertical: spacing.lg,
    },

    /** Individual timeline event row container */
    eventRow: {
      flexDirection: 'row',
      minHeight: 80,
    },

    /** Time display container on the left */
    timeContainer: {
      alignItems: 'center',
      width: 60,
    },

    /** Event time text styling */
    timeText: {
      ...typography.titleMedium,
      color: theme.colors.onSurface,
    },

    /** Vertical line connecting timeline events */
    lineConnector: {
      backgroundColor: theme.colors.outline,
      flex: 1,
      width: 2,
    },

    /** Circular icon container for timeline events */
    timelineIconContainer: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 20,
      elevation: 1,
      height: 40,
      justifyContent: 'center',
      marginVertical: spacing.sm,
      width: 40,
    },

    /** Event details container on the right */
    eventDetails: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: spacing.lg,
    },

    /** Event title text */
    eventTitle: {
      ...typography.titleMedium,
      color: theme.colors.onSurface,
    },

    /** Event subtitle/description text */
    eventSubtitle: {
      ...typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.xs,
    },

    /** Active/current event icon styling */
    activeIcon: {
      backgroundColor: theme.colors.primary,
    },

    /** Active event time text styling */
    activeTime: {
      color: theme.colors.primary,
      fontWeight: 'bold',
    },

    /** Active event title text styling */
    activeTitle: {
      color: theme.colors.primary,
      fontWeight: 'bold',
    },

    /** Past/completed event styling */
    pastEvent: {
      opacity: 0.6,
    },

    /** Notification/reminder row container */
    notificationRow: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      elevation: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },

    /** Golden hour information card */
    goldenHourCard: {
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: borderRadius.md,
      elevation: 2,
      padding: spacing.lg,
    },

    /** Golden hour time information row */
    goldenHourRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    /** Individual golden hour time item */
    goldenHourItem: {
      alignItems: 'center',
      gap: spacing.xs,
    },

    /** Golden hour time display */
    goldenHourTime: {
      ...typography.titleLarge,
      color: theme.colors.onSecondaryContainer,
    },

    /** Golden hour label text */
    goldenHourLabel: {
      ...typography.bodyMedium,
      color: theme.colors.onSecondaryContainer,
    },
  });
};

// =================================================================================
// MARK: - Common Utility Styles
// =================================================================================

/**
 * Creates common utility styles used across multiple components
 * Provides reusable layout, spacing, and typography patterns
 *
 * @param theme - The application theme object
 * @returns StyleSheet object containing common utility styles
 */
export const createCommonStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // ============================================================================
    // CONTAINER & LAYOUT STYLES
    // ============================================================================

    /** Full-screen container with background color */
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },

    /** App footer with top border */
    footer: {
      alignItems: 'center' as const,
      borderColor: theme.colors.outline,
      borderTopWidth: 1,
      marginVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      textAlign: 'center' as const,
    },

    /** Footer link text styling */
    footerLink: {
      ...typography.labelLarge,
      color: theme.colors.primary,
    },

    /** Generic header container with margins */
    header: {
      marginVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    // ============================================================================
    // LAYOUT UTILITIES
    // ============================================================================

    /** Center both horizontally and vertically */
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    /** Safe area container for full-screen layouts */
    safeArea: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },

    /** Overlay background for modals and overlays */
    overlay: {
      backgroundColor: theme.colors.overlay,
    },

    /** Vertical column layout */
    column: {
      flexDirection: 'column',
    },

    /** Horizontal row layout */
    row: {
      alignItems: 'center',
      flexDirection: 'row',
    },

    /** Horizontal row with space between items */
    rowBetween: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    /** Scrollable content container with padding */
    scrollContainer: {
      flex: 1,
      padding: spacing.lg,
    },

    // ============================================================================
    // TEXT STYLES
    // ============================================================================

    /** Default text color for primary content */
    text: {
      color: theme.colors.onBackground,
    },

    /** Muted text color for secondary content */
    textMuted: {
      color: theme.colors.onSurfaceVariant,
    },

    /** Bottom tab bar styling */
    tabBar: {
      borderTopWidth: 1,
      height: 70,
      paddingBottom: spacing.md,
      paddingTop: spacing.sm,
    },

    // ============================================================================
    // SPACING UTILITIES
    // ============================================================================

    /** Standard top margin */
    marginTop: { marginTop: spacing.md },

    /** Standard bottom margin */
    marginBottom: { marginBottom: spacing.md },

    /** Standard vertical margins */
    marginVertical: { marginVertical: spacing.md },

    /** Standard horizontal margins */
    marginHorizontal: { marginHorizontal: spacing.lg },

    /** Standard top padding */
    paddingTop: { paddingTop: spacing.md },

    /** Standard bottom padding */
    paddingBottom: { paddingBottom: spacing.md },

    /** Standard vertical padding */
    paddingVertical: { paddingVertical: spacing.md },

    /** Standard horizontal padding */
    paddingHorizontal: { paddingHorizontal: spacing.lg },
  });

// Export spacing and borderRadius for external use
export { borderRadius, spacing };
