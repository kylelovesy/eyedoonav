/*--------------------------------------------------------------------------------
  @file      typography.ts
  @author    Kyle Lovesy
  @date      2025-10-25
  @version   1.1.0
  @description Typography for the app using React Native Paper
--------------------------------------------------------------------------------*/
// =================================================================================
// MARK: - Font Configuration
// =================================================================================

import MontserratLight from '@/assets/fonts/Montserrat-Light.ttf';
import MontserratRegular from '@/assets/fonts/Montserrat-Regular.ttf';
import MontserratMedium from '@/assets/fonts/Montserrat-Medium.ttf';
import MontserratSemiBold from '@/assets/fonts/Montserrat-SemiBold.ttf';
import MontserratBold from '@/assets/fonts/Montserrat-Bold.ttf';
import MontserratExtraBold from '@/assets/fonts/Montserrat-ExtraBold.ttf';
import PlayfairDisplayRegular from '@/assets/fonts/PlayfairDisplay-Regular.ttf';
import PlayfairDisplayMedium from '@/assets/fonts/PlayfairDisplay-Medium.ttf';
import PlayfairDisplayBold from '@/assets/fonts/PlayfairDisplay-Bold.ttf';

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
// Simplified font families
export const SansConfig = {
  light: 'Montserrat-Light',
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semiBold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
  extraBold: 'Montserrat-ExtraBold',
};

export const SerifConfig = {
  regular: 'PlayfairDisplay-Regular',
  medium: 'PlayfairDisplay-Medium',
  bold: 'PlayfairDisplay-Bold',
};

// =================================================================================
// MARK: - Typography Scale (Tailwind-inspired, Material-ish)
// =================================================================================

/**
 * Instead of arbitrary values, we’ll match Tailwind defaults:
 * text-xs (12/16), sm (14/20), base (16/24), lg (18/28),
 * xl (20/28), 2xl (24/32), 3xl (30/36), 4xl (36/40), 5xl (48/1),
 * 6xl (60/1), etc.
 */

export const typography = {
  // Display
  displayLarge: {
    fontFamily: SerifConfig.bold,
    fontSize: 48, // Tailwind 5xl
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: SerifConfig.bold,
    fontSize: 36, // Tailwind 4xl
    lineHeight: 44,
    letterSpacing: -0.25,
  },
  displaySmall: {
    fontFamily: SerifConfig.bold,
    fontSize: 30, // Tailwind 3xl
    lineHeight: 36,
  },

  // Headline
  headlineLarge: {
    fontFamily: SerifConfig.bold,
    fontSize: 24, // Tailwind 2xl
    lineHeight: 32,
  },
  headlineMedium: {
    fontFamily: SerifConfig.medium,
    fontSize: 20, // Tailwind xl
    lineHeight: 28,
  },
  headlineSmall: {
    fontFamily: SerifConfig.medium,
    fontSize: 18, // Tailwind lg
    lineHeight: 28,
  },

  // Title
  titleLarge: {
    fontFamily: SerifConfig.bold,
    fontSize: 20, // Tailwind xl
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: SansConfig.semiBold,
    fontSize: 16, // Tailwind base
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily: SansConfig.medium,
    fontSize: 14, // Tailwind sm
    lineHeight: 20,
  },

  // Body
  bodyBold: {
    fontFamily: SansConfig.semiBold,
    fontSize: 16, // Tailwind base
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: SansConfig.regular,
    fontSize: 16, // Tailwind base
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: SansConfig.regular,
    fontSize: 14, // Tailwind sm
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: SansConfig.regular,
    fontSize: 12, // Tailwind xs
    lineHeight: 16,
  },

  // Label
  labelLarge: {
    fontFamily: SansConfig.medium,
    fontSize: 14, // Tailwind sm
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: SansConfig.medium,
    fontSize: 12, // Tailwind xs
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: SansConfig.medium,
    fontSize: 11, // Slightly smaller than Tailwind xs
    lineHeight: 16,
  },
};

export type Typography = typeof typography;
