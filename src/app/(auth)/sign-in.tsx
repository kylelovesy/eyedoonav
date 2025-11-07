/*---------------------------------------
File: src/app/(auth)/sign-in.tsx
Description: Sign-in screen for user authentication
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 2.0.0
---------------------------------------*/

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/common/screen';
import { SignInForm } from '@/components/auth/SignInForm';
import { useSignIn } from '@/hooks/-use-sign-in';
import { useAppStyles } from '@/hooks/use-app-styles';

/**
 * Sign-in screen for user authentication
 * Provides form submission, error handling, and navigation
 */
export default function SignInScreen() {
  const router = useRouter();
  const { theme, typography, spacing } = useAppStyles();
  const { loading, error, signIn, reset } = useSignIn({
    onSuccess: () => {
      // Navigate to app
      // @ts-expect-error Route not yet implemented
      router.replace('/(app)/home');
    },
  });

  return (
    <ScreenWrapper
      loading={loading}
      error={error}
      onRetry={reset}
      scrollable={true}
      testID="sign-in-screen"
    >
      <SignInForm
        onSubmit={signIn}
        onForgotPassword={() => {
          // @ts-expect-error Route not yet implemented
          router.push('/(auth)/password-reset');
        }}
        loading={loading}
      />

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
          Don&apos;t have an account?
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/sign-up')}
          testID="sign-in-link-to-sign-up"
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
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}
