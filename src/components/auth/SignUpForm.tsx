/*---------------------------------------
File: src/components/auth/SignUpForm.tsx
Description: Sign-up form component with validation and error handling
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 2.0.0
---------------------------------------*/

import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Checkbox, Text, SegmentedButtons } from 'react-native-paper';
import { SignUpInput, signUpInputSchema } from '@/domain/user/auth.schema';
import { SubscriptionPlan } from '@/constants/enums';
import { useAppStyles } from '@/hooks/use-app-styles';

interface SignUpFormProps {
  onSubmit: (input: SignUpInput) => Promise<boolean>;
  loading?: boolean;
}

/**
 * SignUpForm component for user registration
 * Provides form validation, error handling, and loading states
 *
 * @param props - Component props
 * @param props.onSubmit - Callback function called when form is submitted with valid data
 * @param props.loading - Whether form submission is in progress
 *
 * @example
 * ```typescript
 * const { signUp, loading, error } = useSignUp({
 *   onSuccess: (user) => router.push('/(app)/home'),
 * });
 *
 * <SignUpForm onSubmit={signUp} loading={loading} />
 * ```
 */
export const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, loading = false }) => {
  const { theme, typography, spacing } = useAppStyles();

  const [formData, setFormData] = useState<SignUpInput>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    subscriptionPlan: SubscriptionPlan.PRO,
    acceptTerms: false,
    acceptPrivacy: false,
    acceptMarketing: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof SignUpInput, value: string | boolean | SubscriptionPlan) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleBlur = (field: keyof SignUpInput) => {
    // Validate the entire form to catch cross-field errors like password matching
    const result = signUpInputSchema.safeParse(formData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0] && err.path[0] === field) {
          errors[field] = err.message;
        }
      });

      if (errors[field]) {
        setFieldErrors(prev => ({ ...prev, [field]: errors[field] }));
      }
    }
  };

  const handleSubmit = async () => {
    // Validate all fields
    const result = signUpInputSchema.safeParse(formData);

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

    // Submit
    const success = await onSubmit(result.data);

    if (success) {
      // Clear form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        subscriptionPlan: SubscriptionPlan.PRO,
        acceptTerms: false,
        acceptPrivacy: false,
        acceptMarketing: false,
      });
      setFieldErrors({});
    }
  };

  // Prepare segmented buttons data for subscription plan
  const subscriptionPlanButtons = Object.values(SubscriptionPlan).map(plan => ({
    value: plan,
    label: plan.toUpperCase(),
    testID: `signup-plan-${plan}`,
  }));

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
        Create Account
      </Text>

      <View style={{ marginBottom: spacing.md }}>
        <TextInput
          mode="outlined"
          label="Display Name"
          value={formData.displayName}
          onChangeText={value => handleChange('displayName', value)}
          onBlur={() => handleBlur('displayName')}
          placeholder="John Doe"
          autoCapitalize="words"
          editable={!loading}
          error={!!fieldErrors.displayName}
          style={{ marginBottom: spacing.xs }}
          testID="signup-display-name-input"
        />
        {fieldErrors.displayName && (
          <Text
            style={[
              typography.labelSmall,
              {
                color: theme.colors.error,
                marginTop: spacing.xs,
                paddingHorizontal: spacing.sm,
              },
            ]}
            testID="signup-display-name-error"
          >
            {fieldErrors.displayName}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <TextInput
          mode="outlined"
          label="Email"
          value={formData.email}
          onChangeText={value => handleChange('email', value)}
          onBlur={() => handleBlur('email')}
          placeholder="john@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          error={!!fieldErrors.email}
          style={{ marginBottom: spacing.xs }}
          testID="signup-email-input"
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
            testID="signup-email-error"
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
          onBlur={() => handleBlur('password')}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          error={!!fieldErrors.password}
          style={{ marginBottom: spacing.xs }}
          testID="signup-password-input"
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
            testID="signup-password-error"
          >
            {fieldErrors.password}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <TextInput
          mode="outlined"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={value => handleChange('confirmPassword', value)}
          onBlur={() => handleBlur('confirmPassword')}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          error={!!fieldErrors.confirmPassword}
          style={{ marginBottom: spacing.xs }}
          testID="signup-confirm-password-input"
        />
        {fieldErrors.confirmPassword && (
          <Text
            style={[
              typography.labelSmall,
              {
                color: theme.colors.error,
                marginTop: spacing.xs,
                paddingHorizontal: spacing.sm,
              },
            ]}
            testID="signup-confirm-password-error"
          >
            {fieldErrors.confirmPassword}
          </Text>
        )}
      </View>

      {/* Subscription Plan Picker */}
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={[
            typography.titleMedium,
            {
              color: theme.colors.onSurface,
              marginBottom: spacing.sm,
            },
          ]}
        >
          Subscription Plan
        </Text>
        <SegmentedButtons
          value={formData.subscriptionPlan}
          onValueChange={value => handleChange('subscriptionPlan', value as SubscriptionPlan)}
          buttons={subscriptionPlanButtons}
          style={{ marginBottom: spacing.xs }}
        />
      </View>

      {/* Checkboxes */}
      <View style={{ marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Checkbox
            status={formData.acceptTerms ? 'checked' : 'unchecked'}
            onPress={() => handleChange('acceptTerms', !formData.acceptTerms)}
            disabled={loading}
            testID="signup-accept-terms"
          />
          <Text
            style={[
              typography.bodyMedium,
              {
                color: fieldErrors.acceptTerms ? theme.colors.error : theme.colors.onSurface,
                flex: 1,
              },
            ]}
          >
            I accept the Terms of Service
          </Text>
        </View>
        {fieldErrors.acceptTerms && (
          <Text
            style={[
              typography.labelSmall,
              {
                color: theme.colors.error,
                marginTop: spacing.xs,
                paddingHorizontal: spacing.sm,
                marginLeft: 40, // Align with checkbox text
              },
            ]}
            testID="signup-accept-terms-error"
          >
            {fieldErrors.acceptTerms}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Checkbox
            status={formData.acceptPrivacy ? 'checked' : 'unchecked'}
            onPress={() => handleChange('acceptPrivacy', !formData.acceptPrivacy)}
            disabled={loading}
            testID="signup-accept-privacy"
          />
          <Text
            style={[
              typography.bodyMedium,
              {
                color: fieldErrors.acceptPrivacy ? theme.colors.error : theme.colors.onSurface,
                flex: 1,
              },
            ]}
          >
            I accept the Privacy Policy
          </Text>
        </View>
        {fieldErrors.acceptPrivacy && (
          <Text
            style={[
              typography.labelSmall,
              {
                color: theme.colors.error,
                marginTop: spacing.xs,
                paddingHorizontal: spacing.sm,
                marginLeft: 40, // Align with checkbox text
              },
            ]}
            testID="signup-accept-privacy-error"
          >
            {fieldErrors.acceptPrivacy}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Checkbox
            status={formData.acceptMarketing ? 'checked' : 'unchecked'}
            onPress={() => handleChange('acceptMarketing', !formData.acceptMarketing)}
            disabled={loading}
            testID="signup-accept-marketing"
          />
          <Text
            style={[
              typography.bodyMedium,
              {
                color: theme.colors.onSurface,
                flex: 1,
              },
            ]}
          >
            I want to receive marketing emails (optional)
          </Text>
        </View>
      </View>

      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={loading}
        loading={loading}
        style={{ marginTop: spacing.md }}
        contentStyle={{ paddingVertical: spacing.sm }}
        labelStyle={typography.labelLarge}
        testID="signup-submit-button"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </View>
  );
};
