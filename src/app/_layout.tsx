/*---------------------------------------
File: src/app/_layout.tsx
Description: Layout for the app using React Native Paper
Author: Kyle Lovesy
Date: 26/10-2025 - 22.15
Version: 1.1.0
---------------------------------------*/
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlobalErrorHandler } from '@/services/global-error-handler-service';

// Local Imports
import { ErrorBoundary } from '@/components/common/error-boundary';
// import { AuthInitializer } from '@components/auth/auth-initializer'; // To be migrated in Phase 2
import { AppDarkTheme, AppLightTheme } from '@/constants/theme';
import { fontAssets } from '@/constants/typography';
import { ToastContainer } from '@/components/common/toast';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? AppDarkTheme : AppLightTheme;

  useEffect(() => {
    // Initialize the global error handler
    GlobalErrorHandler.initialize();

    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Render even if fonts fail to load (fallback to system fonts)
  if (!fontsLoaded && !fontError) {
    return null; // Still loading
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          {/* AuthInitializer will wrap the Stack once migrated */}
          <Stack screenOptions={{ headerShown: false }} />
          <ToastContainer />
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
