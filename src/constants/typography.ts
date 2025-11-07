/*---------------------------------------
File: src/constants/typography.ts
Description: Comprehensive typography system for the Eye-Doo application.
Provides consistent text styling across all components with Material Design 3
inspired typography scale and custom font configurations.

Key Features:
- Custom font loading for Montserrat (sans-serif) and Playfair Display (serif)
- Material Design 3 typography scale with Tailwind-inspired sizing
- Hierarchical text styles for displays, headlines, titles, bodies, and labels
- Optimized line heights and letter spacing for readability

Author: Kyle Lovesy
Date: 26/10-2025 - 22.15
Version: 1.1.0
---------------------------------------*/

import MontserratLight from '../assets/fonts/Montserrat-Light.ttf';
import MontserratRegular from '../assets/fonts/Montserrat-Regular.ttf';
import MontserratMedium from '../assets/fonts/Montserrat-Medium.ttf';
import MontserratSemiBold from '../assets/fonts/Montserrat-SemiBold.ttf';
import MontserratBold from '../assets/fonts/Montserrat-Bold.ttf';
import MontserratExtraBold from '../assets/fonts/Montserrat-ExtraBold.ttf';
import PlayfairDisplayRegular from '../assets/fonts/PlayfairDisplay-Regular.ttf';
import PlayfairDisplayMedium from '../assets/fonts/PlayfairDisplay-Medium.ttf';
import PlayfairDisplayBold from '../assets/fonts/PlayfairDisplay-Bold.ttf';

// =================================================================================
// MARK: - Font Assets & Loading
// =================================================================================

/**
 * Font asset mappings for Expo Font loading
 * Maps font names to their respective TTF file paths
 */
export const fontAssets = {
  'Montserrat-Light': MontserratLight,
  'Montserrat-Regular': MontserratRegular,
  'Montserrat-Medium': MontserratMedium,
  'Montserrat-SemiBold': MontserratSemiBold,
  'Montserrat-Bold': MontserratBold,
  'Montserrat-ExtraBold': MontserratExtraBold,
  'PlayfairDisplay-Regular': PlayfairDisplayRegular,
  'PlayfairDisplay-Medium': PlayfairDisplayMedium,
  'PlayfairDisplay-Bold': PlayfairDisplayBold,
};

// =================================================================================
// MARK: - Font Family Configurations
// =================================================================================

/**
 * Montserrat (Sans-serif) font family configuration
 * Used for UI elements, body text, and labels for optimal readability
 */
export const SansConfig = {
  light: 'Montserrat-Light',
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semiBold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
  extraBold: 'Montserrat-ExtraBold',
};

/**
 * Playfair Display (Serif) font family configuration
 * Used for display headings and titles to add elegance and hierarchy
 */
export const SerifConfig = {
  regular: 'PlayfairDisplay-Regular',
  medium: 'PlayfairDisplay-Medium',
  bold: 'PlayfairDisplay-Bold',
};

// =================================================================================
// MARK: - Typography Scale (Material Design 3 + Tailwind)
// =================================================================================

/**
 * Comprehensive typography scale following Material Design 3 principles
 * with Tailwind CSS sizing conventions for consistency and accessibility.
 *
 * Design Principles:
 * - Uses serif fonts (Playfair Display) for display/headline text to add elegance
 * - Uses sans-serif fonts (Montserrat) for body text and UI elements for readability
 * - Line heights optimized for mobile readability (1.4-1.5 ratio)
 * - Letter spacing adjusted for visual hierarchy and legibility
 *
 * Size Reference (Tailwind equivalents):
 * - xs: 12px, sm: 14px, base: 16px, lg: 18px, xl: 20px
 * - 2xl: 24px, 3xl: 30px, 4xl: 36px, 5xl: 48px, 6xl: 60px
 */

export const typography = {
  // ============================================================================
  // DISPLAY TEXT - Largest scale, used for hero sections and major headings
  // ============================================================================

  /**
   * Largest display text - Hero titles, landing pages
   * Serif font for maximum impact and elegance
   */
  displayLarge: {
    fontFamily: SerifConfig.bold,
    fontSize: 48, // Tailwind 5xl
    lineHeight: 56,
    letterSpacing: -0.5, // Tighter spacing for large text
  },

  /**
   * Medium display text - Section headers, important titles
   */
  displayMedium: {
    fontFamily: SerifConfig.bold,
    fontSize: 36, // Tailwind 4xl
    lineHeight: 44,
    letterSpacing: -0.25, // Slightly tighter for visual balance
  },

  /**
   * Small display text - Subsection headers
   */
  displaySmall: {
    fontFamily: SerifConfig.bold,
    fontSize: 30, // Tailwind 3xl
    lineHeight: 36,
  },

  // ============================================================================
  // HEADLINE TEXT - High-level content organization
  // ============================================================================

  /**
   * Large headlines - Page titles, major content sections
   */
  headlineLarge: {
    fontFamily: SerifConfig.bold,
    fontSize: 24, // Tailwind 2xl
    lineHeight: 32,
  },

  /**
   * Medium headlines - Card titles, subsection headers
   */
  headlineMedium: {
    fontFamily: SerifConfig.medium,
    fontSize: 20, // Tailwind xl
    lineHeight: 28,
  },

  /**
   * Small headlines - Minor section headers
   */
  headlineSmall: {
    fontFamily: SerifConfig.medium,
    fontSize: 18, // Tailwind lg
    lineHeight: 28,
  },

  // ============================================================================
  // TITLE TEXT - Content hierarchy and navigation
  // ============================================================================

  /**
   * Large titles - Primary card titles, dialog titles
   */
  titleLarge: {
    fontFamily: SerifConfig.bold,
    fontSize: 20, // Tailwind xl
    lineHeight: 28,
  },

  /**
   * Medium titles - List item titles, button text, form labels
   * Semi-bold for emphasis while maintaining readability
   */
  titleMedium: {
    fontFamily: SansConfig.semiBold,
    fontSize: 16, // Tailwind base
    lineHeight: 24,
    letterSpacing: 0.15, // Material Design standard for medium emphasis
  },

  /**
   * Small titles - Supporting titles, metadata
   */
  titleSmall: {
    fontFamily: SansConfig.medium,
    fontSize: 14, // Tailwind sm
    lineHeight: 20,
  },

  // ============================================================================
  // BODY TEXT - Primary reading content
  // ============================================================================

  /**
   * Bold body text - Emphasized content within body text
   */
  bodyBold: {
    fontFamily: SansConfig.semiBold,
    fontSize: 16, // Tailwind base
    lineHeight: 24,
  },

  /**
   * Large body text - Primary reading content, descriptions
   */
  bodyLarge: {
    fontFamily: SansConfig.regular,
    fontSize: 16, // Tailwind base
    lineHeight: 24,
  },

  /**
   * Medium body text - Secondary content, card descriptions
   */
  bodyMedium: {
    fontFamily: SansConfig.regular,
    fontSize: 14, // Tailwind sm
    lineHeight: 20,
  },

  /**
   * Small body text - Captions, footnotes, metadata
   */
  bodySmall: {
    fontFamily: SansConfig.regular,
    fontSize: 12, // Tailwind xs
    lineHeight: 16,
  },

  // ============================================================================
  // LABEL TEXT - Interactive and form elements
  // ============================================================================

  /**
   * Large labels - Primary button text, important form labels
   */
  labelLarge: {
    fontFamily: SansConfig.medium,
    fontSize: 14, // Tailwind sm
    lineHeight: 20,
    letterSpacing: 0.1, // Material Design standard for labels
  },

  /**
   * Medium labels - Form inputs, secondary buttons
   */
  labelMedium: {
    fontFamily: SansConfig.medium,
    fontSize: 12, // Tailwind xs
    lineHeight: 16,
  },

  /**
   * Small labels - Input hints, micro-interactions
   * Slightly smaller than standard xs for compact UI elements
   */
  labelSmall: {
    fontFamily: SansConfig.medium,
    fontSize: 11,
    lineHeight: 16,
  },
};

// =================================================================================
// MARK: - Type Definitions
// =================================================================================

/**
 * Type definition for the typography system
 * Enables type-safe access to typography styles throughout the app
 */
export type Typography = typeof typography;
