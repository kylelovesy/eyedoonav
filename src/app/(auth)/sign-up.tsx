/*---------------------------------------
File: src/app/(auth)/sign-up.tsx
Description: Sign-up screen for user registration
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 2.0.0
---------------------------------------*/

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/common/screen';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useSignUp } from '@/hooks/-use-sign-up';
import { useAppStyles } from '@/hooks/use-app-styles';

/**
 * Sign-up screen for new user registration
 * Provides form submission, error handling, and navigation
 */
export default function SignUpScreen() {
  const router = useRouter();
  const { theme, typography, spacing } = useAppStyles();
  const { loading, error, signUp, reset } = useSignUp({
    onSuccess: () => {
      // Navigate to email verification or onboarding
      // @ts-expect-error Route not yet implemented
      router.replace('/(app)/onboarding');
    },
  });

  return (
    <ScreenWrapper
      loading={loading}
      error={error}
      onRetry={reset}
      scrollable={true}
      testID="sign-up-screen"
    >
      <SignUpForm onSubmit={signUp} loading={loading} />

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <Text
          style={[
            typography.bodyMedium,
            {
              color: theme.colors.onSurfaceVariant,
            },
          ]}
        >
          Already have an account?
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-in')}
          testID="sign-up-link-to-sign-in"
        >
          <Text
            style={[
              typography.labelLarge,
              {
                color: theme.colors.primary,
                textDecorationLine: 'underline',
              },
            ]}
          >
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
