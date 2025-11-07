/*---------------------------------------
File: src/constants/theme.ts
Description: Theme configuration for the application.
Author: Kyle Lovesy
Date: 26/10-2025 - 22.15
Version: 1.1.0
---------------------------------------*/
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const lightThemeColors = {
  primary: '#4A90E2',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D0E4FF',
  onPrimaryContainer: '#001D36',

  secondary: '#D4A76A',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#FFF2D1',
  onSecondaryContainer: '#3D2B00',

  tertiary: '#6B8E23',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#D4E3FF',
  onTertiaryContainer: '#222F00',

  error: '#C44536',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  background: '#F5F5F5',
  onBackground: '#1A1A1A',

  surface: '#FFFFFF',
  onSurface: '#1A1A1A',
  surfaceVariant: '#E9ECEF',
  onSurfaceVariant: '#6C757D',

  outline: '#CEDBE8',
  outlineVariant: '#E1E8ED',

  shadow: '#000000',
  scrim: '#000000',

  inverseSurface: '#2F3033',
  inverseOnSurface: '#F0F0F3',
  inversePrimary: '#A5C8FF',

  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F8F9FA',
    level3: '#F1F3F4',
    level4: '#ECEFF1',
    level5: '#E8EBF0',
  },

  surfaceDisabled: 'rgba(26, 26, 26, 0.12)',
  onSurfaceDisabled: 'rgba(26, 26, 26, 0.38)',
  backdrop: 'rgba(44, 49, 55, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const darkThemeColors = {
  primary: '#4A90E2',
  onPrimary: '#003258',
  primaryContainer: '#004F55',
  onPrimaryContainer: '#A5EAF1',

  secondary: '#D4A76A',
  onSecondary: '#402D00',
  secondaryContainer: '#4A3A00',
  onSecondaryContainer: '#FFF2D1',

  tertiary: '#9CCBFF',
  onTertiary: '#003258',
  tertiaryContainer: '#254766',
  onTertiaryContainer: '#D4E3FF',

  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  background: '#1A1A1A',
  onBackground: '#E9ECEF',

  surface: '#1A1A1A',
  onSurface: '#E9ECEF',
  surfaceVariant: '#41484D',
  onSurfaceVariant: '#C1C8CE',

  outline: '#8C959D',
  outlineVariant: '#41484D',

  shadow: '#000000',
  scrim: '#000000',

  inverseSurface: '#E9ECEF',
  inverseOnSurface: '#2E3036',
  inversePrimary: '#4A90E2',

  elevation: {
    level0: 'transparent',
    level1: '#1F1F1F',
    level2: '#232323',
    level3: '#282828',
    level4: '#2C2C2C',
    level5: '#2F2F2F',
  },

  surfaceDisabled: 'rgba(233, 236, 239, 0.12)',
  onSurfaceDisabled: 'rgba(233, 236, 239, 0.38)',
  backdrop: 'rgba(44, 49, 55, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const AppLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightThemeColors,
  },
};

export const AppDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkThemeColors,
  },
};

export type AppTheme = typeof AppLightTheme;
