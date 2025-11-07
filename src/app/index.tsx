/*---------------------------------------
File: src/app/index.tsx
Description: Root index screen - redirects to sign-up on app launch
Author: Kyle Lovesy
Date: 28/10-2025 - 16.30
Version: 1.0.0
---------------------------------------*/

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(auth)/sign-up');
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
