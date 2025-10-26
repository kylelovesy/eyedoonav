/*--------------------------------------------------------------------------------
  File      src/app/_layout.tsx
  Description: Layout for the app using React Native Paper
  Author: Kyle Lovesy
  Date: 2025-10-26
  Version: 1.1.0
--------------------------------------------------------------------------------*/

import { useFonts } from 'expo-font';
import { ErrorBoundary, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Local Imports
// import { ErrorBoundary } from '@components/common/error-boundary';
// import { AuthInitializer } from '@components/auth/auth-initializer'; // To be migrated in Phase 2
import { AppDarkTheme, AppLightTheme } from '@/constants/theme';
import { fontAssets } from '@/constants/typography';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? AppDarkTheme : AppLightTheme;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    // <ErrorBoundary>
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        {/* AuthInitializer will wrap the Stack once migrated */}
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </SafeAreaProvider>
    // </ErrorBoundary>
  );
}
