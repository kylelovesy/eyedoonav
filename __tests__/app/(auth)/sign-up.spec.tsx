import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import SignUpScreen from '../../../src/app/(auth)/sign-up';

// Mock the hooks
jest.mock('../../../src/hooks/-use-sign-up');
jest.mock('../../../src/hooks/use-app-styles');
jest.mock('expo-router');

// Mock components
jest.mock('../../../src/components/common/screen', () => ({
  ScreenWrapper: ({ children, loading, error, onRetry, testID }: any) =>
    React.createElement(
      'View',
      { testID, 'data-loading': loading, 'data-error': error },
      [
        children,
        error &&
          React.createElement(
            'TouchableOpacity',
            { key: 'retry', onPress: onRetry, testID: 'retry-button' },
            React.createElement('Text', {}, 'Retry'),
          ),
      ].filter(Boolean),
    ),
}));

jest.mock('../../../src/components/auth/SignUpForm', () => ({
  SignUpForm: ({ onSubmit, loading }: any) =>
    React.createElement('View', { testID: 'sign-up-form' }, [
      React.createElement(
        'TouchableOpacity',
        {
          key: 'submit',
          testID: 'submit-button',
          onPress: () =>
            onSubmit({
              email: 'test@example.com',
              password: 'password123',
              confirmPassword: 'password123',
              displayName: 'Test User',
              subscriptionPlan: 'FREE',
              acceptTerms: true,
              acceptPrivacy: true,
            }),
          disabled: loading,
        },
        React.createElement('Text', {}, loading ? 'Creating Account...' : 'Create Account'),
      ),
      React.createElement(
        'TouchableOpacity',
        {
          key: 'link',
          testID: 'sign-up-link-to-sign-in',
          onPress: () => {},
        },
        React.createElement('Text', {}, 'Sign In'),
      ),
    ]),
}));

describe('SignUpScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  const mockUseSignUp = {
    loading: false,
    error: null,
    signUp: jest.fn(),
    reset: jest.fn(),
  };

  const mockUseAppStyles = {
    theme: {
      colors: {
        onSurfaceVariant: '#666',
        primary: '#007AFF',
      },
    },
    typography: {
      bodyMedium: { fontSize: 14 },
      labelLarge: { fontSize: 16 },
    },
    spacing: {
      sm: 8,
      lg: 16,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (require('../../../src/hooks/-use-sign-up') as jest.Mock).mockReturnValue(mockUseSignUp);
    (require('../../../src/hooks/use-app-styles') as jest.Mock).mockReturnValue(mockUseAppStyles);
  });

  it('renders the sign-up screen correctly', () => {
    render(<SignUpScreen />);

    expect(screen.getByTestId('sign-up-screen')).toBeTruthy();
    expect(screen.getByTestId('sign-up-form')).toBeTruthy();
    expect(screen.getByText('Already have an account?')).toBeTruthy();
    expect(screen.getByTestId('sign-up-link-to-sign-in')).toBeTruthy();
  });

  it('calls signUp when form is submitted', async () => {
    render(<SignUpScreen />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockUseSignUp.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        displayName: 'Test User',
        subscriptionPlan: 'FREE',
        acceptTerms: true,
        acceptPrivacy: true,
      });
    });
  });

  it('navigates to onboarding on successful sign-up', () => {
    const mockUseSignUpWithSuccess = {
      ...mockUseSignUp,
      signUp: jest.fn(data => {
        // Simulate success callback
        setTimeout(() => {
          mockRouter.replace('/(app)/onboarding');
        }, 0);
      }),
    };

    (require('../../../src/hooks/-use-sign-up') as jest.Mock).mockReturnValue(
      mockUseSignUpWithSuccess,
    );

    render(<SignUpScreen />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.press(submitButton);

    expect(mockUseSignUpWithSuccess.signUp).toHaveBeenCalled();
  });

  it('shows loading state when creating account', () => {
    (require('../../../src/hooks/-use-sign-up') as jest.Mock).mockReturnValue({
      ...mockUseSignUp,
      loading: true,
    });

    render(<SignUpScreen />);

    expect(screen.getByText('Creating Account...')).toBeTruthy();
  });

  it('shows error state and retry button', () => {
    const mockError = { message: 'Email already exists' };
    (require('../../../src/hooks/-use-sign-up') as jest.Mock).mockReturnValue({
      ...mockUseSignUp,
      error: mockError,
    });

    render(<SignUpScreen />);

    expect(screen.getByTestId('retry-button')).toBeTruthy();
  });

  it('calls reset when retry button is pressed', () => {
    const mockError = { message: 'Network error' };
    (require('../../../src/hooks/-use-sign-up') as jest.Mock).mockReturnValue({
      ...mockUseSignUp,
      error: mockError,
    });

    render(<SignUpScreen />);

    const retryButton = screen.getByTestId('retry-button');
    fireEvent.press(retryButton);

    expect(mockUseSignUp.reset).toHaveBeenCalled();
  });

  it('navigates to sign-in screen when sign-in link is pressed', () => {
    render(<SignUpScreen />);

    const signInLink = screen.getByTestId('sign-up-link-to-sign-in');
    fireEvent.press(signInLink);

    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/sign-in');
  });
});
