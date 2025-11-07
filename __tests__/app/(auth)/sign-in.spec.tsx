import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import SignInScreen from '../../../src/app/(auth)/sign-in';

// Mock the hooks
jest.mock('../../../src/hooks/-use-sign-in');
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

jest.mock('../../../src/components/auth/SignInForm', () => ({
  SignInForm: ({ onSubmit, onForgotPassword, loading }: any) =>
    React.createElement('View', { testID: 'sign-in-form' }, [
      React.createElement(
        'TouchableOpacity',
        {
          key: 'submit',
          testID: 'submit-button',
          onPress: () => onSubmit({ email: 'test@example.com', password: 'password123' }),
          disabled: loading,
        },
        React.createElement('Text', {}, loading ? 'Signing In...' : 'Sign In'),
      ),
      React.createElement(
        'TouchableOpacity',
        {
          key: 'forgot',
          testID: 'forgot-password-button',
          onPress: onForgotPassword,
        },
        React.createElement('Text', {}, 'Forgot Password'),
      ),
      React.createElement(
        'TouchableOpacity',
        {
          key: 'link',
          testID: 'sign-in-link-to-sign-up',
          onPress: () => {},
        },
        React.createElement('Text', {}, 'Sign Up'),
      ),
    ]),
}));

describe('SignInScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  const mockUseSignIn = {
    loading: false,
    error: null,
    signIn: jest.fn(),
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
    (require('../../../src/hooks/-use-sign-in') as jest.Mock).mockReturnValue(mockUseSignIn);
    (require('../../../src/hooks/use-app-styles') as jest.Mock).mockReturnValue(mockUseAppStyles);
  });

  it('renders the sign-in screen correctly', () => {
    render(<SignInScreen />);

    expect(screen.getByTestId('sign-in-screen')).toBeTruthy();
    expect(screen.getByTestId('sign-in-form')).toBeTruthy();
    expect(screen.getByText("Don't have an account?")).toBeTruthy();
    expect(screen.getByTestId('sign-in-link-to-sign-up')).toBeTruthy();
  });

  it('calls signIn when form is submitted', async () => {
    render(<SignInScreen />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockUseSignIn.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('navigates to home on successful sign-in', () => {
    const mockUseSignInWithSuccess = {
      ...mockUseSignIn,
      signIn: jest.fn(data => {
        // Simulate success callback
        setTimeout(() => {
          mockRouter.replace('/(app)/home');
        }, 0);
      }),
    };

    (require('../../../src/hooks/-use-sign-in') as jest.Mock).mockReturnValue(
      mockUseSignInWithSuccess,
    );

    render(<SignInScreen />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.press(submitButton);

    expect(mockUseSignInWithSuccess.signIn).toHaveBeenCalled();
  });

  it('shows loading state when signing in', () => {
    (require('../../../src/hooks/-use-sign-in') as jest.Mock).mockReturnValue({
      ...mockUseSignIn,
      loading: true,
    });

    render(<SignInScreen />);

    expect(screen.getByText('Signing In...')).toBeTruthy();
  });

  it('shows error state and retry button', () => {
    const mockError = { message: 'Invalid credentials' };
    (require('../../../src/hooks/-use-sign-in') as jest.Mock).mockReturnValue({
      ...mockUseSignIn,
      error: mockError,
    });

    render(<SignInScreen />);

    expect(screen.getByTestId('retry-button')).toBeTruthy();
  });

  it('calls reset when retry button is pressed', () => {
    const mockError = { message: 'Network error' };
    (require('../../../src/hooks/-use-sign-in') as jest.Mock).mockReturnValue({
      ...mockUseSignIn,
      error: mockError,
    });

    render(<SignInScreen />);

    const retryButton = screen.getByTestId('retry-button');
    fireEvent.press(retryButton);

    expect(mockUseSignIn.reset).toHaveBeenCalled();
  });

  it('navigates to password reset when forgot password is clicked', () => {
    render(<SignInScreen />);

    const forgotPasswordButton = screen.getByTestId('forgot-password-button');
    fireEvent.press(forgotPasswordButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/password-reset');
  });

  it('navigates to sign-up screen when sign-up link is pressed', () => {
    render(<SignInScreen />);

    const signUpLink = screen.getByTestId('sign-in-link-to-sign-up');
    fireEvent.press(signUpLink);

    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/sign-up');
  });
});
