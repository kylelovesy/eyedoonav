/*---------------------------------------
File: src/components/auth/SignInForm.tsx
Description: Sign-in form component with validation and error handling
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 2.0.0
---------------------------------------*/

import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { TextInput, Button, Checkbox, Text } from 'react-native-paper';
import { SignInInput, signInInputSchema } from '@/domain/user/auth.schema';
import { useAppStyles } from '@/hooks/use-app-styles';

interface SignInFormProps {
  onSubmit: (input: SignInInput) => Promise<boolean>;
  onForgotPassword?: () => void;
  loading?: boolean;
}

/**
 * SignInForm component for user authentication
 * Provides form validation, error handling, and loading states
 *
 * @param props - Component props
 * @param props.onSubmit - Callback function called when form is submitted with valid data
 * @param props.onForgotPassword - Optional callback for forgot password action
 * @param props.loading - Whether form submission is in progress
 *
 * @example
 * ```typescript
 * const { signIn, loading, error } = useSignIn({
 *   onSuccess: (user) => router.push('/(app)/home'),
 * });
 *
 * <SignInForm
 *   onSubmit={signIn}
 *   onForgotPassword={() => router.push('/(auth)/forgot-password')}
 *   loading={loading}
 * />
 * ```
 */
export const SignInForm: React.FC<SignInFormProps> = ({
  onSubmit,
  onForgotPassword,
  loading = false,
}) => {
  const { theme, typography, spacing } = useAppStyles();

  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof SignInInput, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    const result = signInInputSchema.safeParse(formData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    const success = await onSubmit(result.data);

    if (success) {
      setFormData({ email: '', password: '', rememberMe: false });
      setFieldErrors({});
    }
  };

  return (
    <View style={{ padding: spacing.lg }}>
      <Text
        style={[
          typography.headlineMedium,
          {
            color: theme.colors.onBackground,
            textAlign: 'center',
            marginBottom: spacing.lg,
          },
        ]}
      >
        Sign In
      </Text>

      <View style={{ marginBottom: spacing.md }}>
        <TextInput
          mode="outlined"
          label="Email"
          value={formData.email}
          onChangeText={value => handleChange('email', value)}
          placeholder="john@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          error={!!fieldErrors.email}
          style={{ marginBottom: spacing.xs }}
          testID="signin-email-input"
        />
        {fieldErrors.email && (
          <Text
            style={[
              typography.labelSmall,
              {
                color: theme.colors.error,
                marginTop: spacing.xs,
                paddingHorizontal: spacing.sm,
              },
            ]}
            testID="signin-email-error"
          >
            {fieldErrors.email}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <TextInput
          mode="outlined"
          label="Password"
          value={formData.password}
          onChangeText={value => handleChange('password', value)}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          error={!!fieldErrors.password}
          style={{ marginBottom: spacing.xs }}
          testID="signin-password-input"
        />
        {fieldErrors.password && (
          <Text
            style={[
              typography.labelSmall,
              {
                color: theme.colors.error,
                marginTop: spacing.xs,
                paddingHorizontal: spacing.sm,
              },
            ]}
            testID="signin-password-error"
          >
            {fieldErrors.password}
          </Text>
        )}
      </View>

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Checkbox
            status={formData.rememberMe ? 'checked' : 'unchecked'}
            onPress={() => handleChange('rememberMe', !formData.rememberMe)}
            disabled={loading}
            testID="signin-remember-me"
          />
          <Text
            style={[
              typography.bodyMedium,
              {
                color: theme.colors.onSurface,
              },
            ]}
          >
            Remember me
          </Text>
        </View>

        {onForgotPassword && (
          <TouchableOpacity
            onPress={onForgotPassword}
            disabled={loading}
            testID="signin-forgot-password"
          >
            <Text
              style={[
                typography.labelMedium,
                {
                  color: theme.colors.primary,
                  textDecorationLine: 'underline',
                },
              ]}
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={loading}
        loading={loading}
        style={{ marginTop: spacing.md }}
        contentStyle={{ paddingVertical: spacing.sm }}
        labelStyle={typography.labelLarge}
        testID="signin-submit-button"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </Button>
    </View>
  );
};
