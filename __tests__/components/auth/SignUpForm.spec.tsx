import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { SignUpInput } from '@/domain/user/auth.schema';
import { SubscriptionPlan } from '@/constants/enums';

// Mock the useAppStyles hook
jest.mock('@/hooks/use-app-styles', () => ({
  useAppStyles: () => ({
    theme: {
      colors: {
        onBackground: '#000000',
        onSurface: '#000000',
        error: '#FF0000',
      },
    },
    typography: {
      headlineMedium: { fontSize: 28, fontWeight: 'bold' },
      titleMedium: { fontSize: 16, fontWeight: '500' },
      bodyMedium: { fontSize: 14 },
      labelSmall: { fontSize: 11 },
      labelLarge: { fontSize: 14, fontWeight: '500' },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
    },
  }),
}));

describe('SignUpForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all form elements', () => {
    const { getByText, getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    // Check title
    expect(getByText('Create Account')).toBeTruthy();

    // Check form inputs
    expect(getByTestId('signup-display-name-input')).toBeTruthy();
    expect(getByTestId('signup-email-input')).toBeTruthy();
    expect(getByTestId('signup-password-input')).toBeTruthy();
    expect(getByTestId('signup-confirm-password-input')).toBeTruthy();

    // Check subscription plan section
    expect(getByText('Subscription Plan')).toBeTruthy();

    // Check checkboxes
    expect(getByTestId('signup-accept-terms')).toBeTruthy();
    expect(getByTestId('signup-accept-privacy')).toBeTruthy();
    expect(getByTestId('signup-accept-marketing')).toBeTruthy();

    // Check submit button
    expect(getByTestId('signup-submit-button')).toBeTruthy();
  });

  it('should update form data when inputs change', () => {
    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const displayNameInput = getByTestId('signup-display-name-input');
    const emailInput = getByTestId('signup-email-input');
    const passwordInput = getByTestId('signup-password-input');
    const confirmPasswordInput = getByTestId('signup-confirm-password-input');

    fireEvent.changeText(displayNameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    expect(displayNameInput.props.value).toBe('John Doe');
    expect(emailInput.props.value).toBe('john@example.com');
    expect(passwordInput.props.value).toBe('password123');
    expect(confirmPasswordInput.props.value).toBe('password123');
  });

  it('should handle subscription plan selection', () => {
    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    // The SegmentedButtons component uses onValueChange
    // We need to simulate the value change
    const segmentedButtons = getByTestId('signup-plan-pro'); // PRO is default
    expect(segmentedButtons).toBeTruthy();

    // Note: SegmentedButtons testing is complex, this test ensures it renders
  });

  it('should toggle checkboxes', () => {
    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const termsCheckbox = getByTestId('signup-accept-terms');
    const privacyCheckbox = getByTestId('signup-accept-privacy');
    const marketingCheckbox = getByTestId('signup-accept-marketing');

    // Initially unchecked
    expect(termsCheckbox.props.status).toBe('unchecked');
    expect(privacyCheckbox.props.status).toBe('unchecked');
    expect(marketingCheckbox.props.status).toBe('unchecked');

    // Toggle terms checkbox
    fireEvent.press(termsCheckbox);
    expect(termsCheckbox.props.status).toBe('checked');

    // Toggle privacy checkbox
    fireEvent.press(privacyCheckbox);
    expect(privacyCheckbox.props.status).toBe('checked');

    // Toggle marketing checkbox
    fireEvent.press(marketingCheckbox);
    expect(marketingCheckbox.props.status).toBe('checked');
  });

  it('should show validation errors for required fields', async () => {
    const { getByTestId, getByText } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const submitButton = getByTestId('signup-submit-button');

    // Try to submit empty form
    fireEvent.press(submitButton);

    await waitFor(() => {
      // Check for validation errors
      expect(getByTestId('signup-display-name-error')).toBeTruthy();
      expect(getByTestId('signup-email-error')).toBeTruthy();
      expect(getByTestId('signup-password-error')).toBeTruthy();
      expect(getByTestId('signup-confirm-password-error')).toBeTruthy();
      expect(getByTestId('signup-accept-terms-error')).toBeTruthy();
      expect(getByTestId('signup-accept-privacy-error')).toBeTruthy();
    });
  });

  it('should clear field errors when user starts typing', () => {
    const { getByTestId, queryByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const displayNameInput = getByTestId('signup-display-name-input');
    const submitButton = getByTestId('signup-submit-button');

    // Submit empty form to trigger errors
    fireEvent.press(submitButton);

    // Error should be visible initially
    expect(queryByTestId('signup-display-name-error')).toBeTruthy();

    // Start typing in the field
    fireEvent.changeText(displayNameInput, 'J');

    // Error should be cleared
    expect(queryByTestId('signup-display-name-error')).toBeFalsy();
  });

  it('should submit form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(true);

    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const displayNameInput = getByTestId('signup-display-name-input');
    const emailInput = getByTestId('signup-email-input');
    const passwordInput = getByTestId('signup-password-input');
    const confirmPasswordInput = getByTestId('signup-confirm-password-input');
    const termsCheckbox = getByTestId('signup-accept-terms');
    const privacyCheckbox = getByTestId('signup-accept-privacy');
    const submitButton = getByTestId('signup-submit-button');

    // Fill form with valid data
    fireEvent.changeText(displayNameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    // Accept required checkboxes
    fireEvent.press(termsCheckbox);
    fireEvent.press(privacyCheckbox);

    // Submit form
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        displayName: 'John Doe',
        subscriptionPlan: SubscriptionPlan.PRO,
        acceptTerms: true,
        acceptPrivacy: true,
        acceptMarketing: false,
      });
    });
  });

  it('should clear form after successful submission', async () => {
    mockOnSubmit.mockResolvedValue(true);

    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const displayNameInput = getByTestId('signup-display-name-input');
    const emailInput = getByTestId('signup-email-input');
    const passwordInput = getByTestId('signup-password-input');
    const confirmPasswordInput = getByTestId('signup-confirm-password-input');
    const termsCheckbox = getByTestId('signup-accept-terms');
    const privacyCheckbox = getByTestId('signup-accept-privacy');
    const marketingCheckbox = getByTestId('signup-accept-marketing');
    const submitButton = getByTestId('signup-submit-button');

    // Fill form
    fireEvent.changeText(displayNameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(termsCheckbox);
    fireEvent.press(privacyCheckbox);
    fireEvent.press(marketingCheckbox);

    // Submit
    fireEvent.press(submitButton);

    await waitFor(() => {
      // Form should be cleared
      expect(displayNameInput.props.value).toBe('');
      expect(emailInput.props.value).toBe('');
      expect(passwordInput.props.value).toBe('');
      expect(confirmPasswordInput.props.value).toBe('');
      expect(termsCheckbox.props.status).toBe('unchecked');
      expect(privacyCheckbox.props.status).toBe('unchecked');
      expect(marketingCheckbox.props.status).toBe('unchecked');
    });
  });

  it('should not clear form after failed submission', async () => {
    mockOnSubmit.mockResolvedValue(false);

    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const displayNameInput = getByTestId('signup-display-name-input');
    const emailInput = getByTestId('signup-email-input');
    const termsCheckbox = getByTestId('signup-accept-terms');
    const privacyCheckbox = getByTestId('signup-accept-privacy');
    const submitButton = getByTestId('signup-submit-button');

    // Fill form
    fireEvent.changeText(displayNameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(getByTestId('signup-password-input'), 'password123');
    fireEvent.changeText(getByTestId('signup-confirm-password-input'), 'password123');
    fireEvent.press(termsCheckbox);
    fireEvent.press(privacyCheckbox);

    // Submit
    fireEvent.press(submitButton);

    await waitFor(() => {
      // Form should NOT be cleared
      expect(displayNameInput.props.value).toBe('John Doe');
      expect(emailInput.props.value).toBe('john@example.com');
      expect(termsCheckbox.props.status).toBe('checked');
      expect(privacyCheckbox.props.status).toBe('checked');
    });
  });

  it('should disable inputs and button when loading', () => {
    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} loading={true} />
    );

    const displayNameInput = getByTestId('signup-display-name-input');
    const emailInput = getByTestId('signup-email-input');
    const passwordInput = getByTestId('signup-password-input');
    const confirmPasswordInput = getByTestId('signup-confirm-password-input');
    const termsCheckbox = getByTestId('signup-accept-terms');
    const privacyCheckbox = getByTestId('signup-accept-privacy');
    const marketingCheckbox = getByTestId('signup-accept-marketing');
    const submitButton = getByTestId('signup-submit-button');

    expect(displayNameInput.props.editable).toBe(false);
    expect(emailInput.props.editable).toBe(false);
    expect(passwordInput.props.editable).toBe(false);
    expect(confirmPasswordInput.props.editable).toBe(false);
    expect(termsCheckbox.props.disabled).toBe(true);
    expect(privacyCheckbox.props.disabled).toBe(true);
    expect(marketingCheckbox.props.disabled).toBe(true);
    expect(submitButton.props.disabled).toBe(true);
    expect(submitButton.props.loading).toBe(true);
  });

  it('should show loading text on submit button when loading', () => {
    const { getByText } = render(
      <SignUpForm onSubmit={mockOnSubmit} loading={true} />
    );

    expect(getByText('Creating Account...')).toBeTruthy();
  });

  it('should show validation errors for password mismatch', async () => {
    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const displayNameInput = getByTestId('signup-display-name-input');
    const emailInput = getByTestId('signup-email-input');
    const passwordInput = getByTestId('signup-password-input');
    const confirmPasswordInput = getByTestId('signup-confirm-password-input');
    const termsCheckbox = getByTestId('signup-accept-terms');
    const privacyCheckbox = getByTestId('signup-accept-privacy');
    const submitButton = getByTestId('signup-submit-button');

    // Fill form with mismatched passwords
    fireEvent.changeText(displayNameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'differentpassword');
    fireEvent.press(termsCheckbox);
    fireEvent.press(privacyCheckbox);

    // Submit form
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByTestId('signup-confirm-password-error')).toBeTruthy();
    });
  });

  it('should validate email format', async () => {
    const { getByTestId } = render(
      <SignUpForm onSubmit={mockOnSubmit} />
    );

    const displayNameInput = getByTestId('signup-display-name-input');
    const emailInput = getByTestId('signup-email-input');
    const passwordInput = getByTestId('signup-password-input');
    const confirmPasswordInput = getByTestId('signup-confirm-password-input');
    const termsCheckbox = getByTestId('signup-accept-terms');
    const privacyCheckbox = getByTestId('signup-accept-privacy');
    const submitButton = getByTestId('signup-submit-button');

    // Fill form with invalid email
    fireEvent.changeText(displayNameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(termsCheckbox);
    fireEvent.press(privacyCheckbox);

    // Submit form
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByTestId('signup-email-error')).toBeTruthy();
    });
  });
});
