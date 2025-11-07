import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Switch } from 'react-native-paper';
import UserPreferencesScreen from '../../../src/app/(user)/preferences';

// Mock the hooks
jest.mock('../../../src/hooks/use-auth');
jest.mock('../../../src/hooks/use-user.preferences');

// Mock components
jest.mock('../../../src/components/common/screen', () => ({
  Screen: ({ children }: any) =>
    React.createElement('View', { testID: 'screen' }, children),
}));

jest.mock('../../../src/components/common/loading-indicator', () => ({
  LoadingIndicator: () =>
    React.createElement('View', { testID: 'loading-indicator' },
      React.createElement('Text', {}, 'Loading...')
    ),
}));

jest.mock('../../../src/components/common/error-display', () => ({
  ErrorDisplay: ({ error }: any) =>
    React.createElement('View', { testID: 'error-display' },
      React.createElement('Text', {}, error.message)
    ),
}));

// Mock react-native-paper Switch
jest.mock('react-native-paper', () => ({
  Switch: ({ value, onValueChange, testID }: any) =>
    React.createElement('Switch', {
      testID,
      value,
      onValueChange,
    }),
  Text: ({ children }: any) =>
    React.createElement('Text', {}, children),
}));

// Mock ServiceFactory
jest.mock('../../../src/services/ServiceFactory', () => ({
  ServiceFactory: {
    userPreferences: {},
  },
}));

describe('UserPreferencesScreen', () => {
  const mockAuthUser = {
    id: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockPreferences = {
    id: 'prefs123',
    userId: 'user123',
    notifications: true,
    darkMode: false,
    language: 'en',
    weatherUnits: 'metric',
    weekStartsOn: 1,
    marketingConsent: false,
    timezone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    createdAt: new Date(),
  };

  const mockUseUserPreferences = {
    preferences: mockPreferences,
    loading: false,
    error: null,
    updatePreferences: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (require('../../../src/hooks/use-auth') as jest.Mock).mockReturnValue({
      user: mockAuthUser,
    });
    (require('../../../src/hooks/use-user.preferences') as jest.Mock).mockReturnValue(mockUseUserPreferences);
  });

  it('renders the preferences screen correctly', () => {
    render(<UserPreferencesScreen />);

    expect(screen.getByTestId('screen')).toBeTruthy();
    expect(screen.getByText('Preferences')).toBeTruthy();
    expect(screen.getByText('Dark Mode')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('displays current preference values', () => {
    render(<UserPreferencesScreen />);

    // Check that switches reflect current values
    const darkModeSwitch = screen.getByTestId('dark-mode-switch');
    const notificationsSwitch = screen.getByTestId('notifications-switch');

    expect(darkModeSwitch.props.value).toBe(false);
    expect(notificationsSwitch.props.value).toBe(true);
  });

  it('calls updatePreferences when dark mode switch is toggled', () => {
    render(<UserPreferencesScreen />);

    const darkModeSwitch = screen.getByTestId('dark-mode-switch');
    fireEvent(darkModeSwitch, 'onValueChange', true);

    expect(mockUseUserPreferences.updatePreferences).toHaveBeenCalledWith({
      darkMode: true,
    });
  });

  it('calls updatePreferences when notifications switch is toggled', () => {
    render(<UserPreferencesScreen />);

    const notificationsSwitch = screen.getByTestId('notifications-switch');
    fireEvent(notificationsSwitch, 'onValueChange', false);

    expect(mockUseUserPreferences.updatePreferences).toHaveBeenCalledWith({
      notifications: false,
    });
  });

  it('shows loading indicator when loading and preferences are null', () => {
    (require('../../../src/hooks/use-user.preferences') as jest.Mock).mockReturnValue({
      ...mockUseUserPreferences,
      loading: true,
      preferences: null,
    });

    render(<UserPreferencesScreen />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByText('Preferences')).toBeNull();
  });

  it('shows error screen when there is an error', () => {
    const mockError = { message: 'Failed to load preferences' };
    (require('../../../src/hooks/use-user.preferences') as jest.Mock).mockReturnValue({
      ...mockUseUserPreferences,
      error: mockError,
    });

    render(<UserPreferencesScreen />);

    expect(screen.getByTestId('screen')).toBeTruthy();
    expect(screen.getByTestId('error-display')).toBeTruthy();
    expect(screen.getByText('Failed to load preferences')).toBeTruthy();
    expect(screen.queryByText('Preferences')).toBeNull();
  });

  it('does not render preferences when preferences is null', () => {
    (require('../../../src/hooks/use-user.preferences') as jest.Mock).mockReturnValue({
      ...mockUseUserPreferences,
      preferences: null,
    });

    render(<UserPreferencesScreen />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByText('Preferences')).toBeNull();
  });

  it('passes correct userId to useUserPreferences hook', () => {
    const useUserPreferencesMock = jest.fn().mockReturnValue(mockUseUserPreferences);
    jest.doMock('../../../src/hooks/use-user.preferences', () => useUserPreferencesMock);

    render(<UserPreferencesScreen />);

    expect(useUserPreferencesMock).toHaveBeenCalledWith(
      'user123',
      expect.any(Object),
      { autoFetch: true }
    );
  });

  it('handles empty userId gracefully', () => {
    (require('../../../src/hooks/use-auth') as jest.Mock).mockReturnValue({
      user: { ...mockAuthUser, id: '' },
    });

    render(<UserPreferencesScreen />);

    const darkModeSwitch = screen.getByTestId('dark-mode-switch');
    fireEvent(darkModeSwitch, 'onValueChange', true);

    expect(mockUseUserPreferences.updatePreferences).toHaveBeenCalledWith({
      darkMode: true,
    });
  });

  it('toggles switches correctly', () => {
    render(<UserPreferencesScreen />);

    // Initially dark mode is false
    let darkModeSwitch = screen.getByTestId('dark-mode-switch');
    expect(darkModeSwitch.props.value).toBe(false);

    // Toggle to true
    fireEvent(darkModeSwitch, 'onValueChange', true);

    // Re-render to check updated state (in real app this would be handled by the hook)
    (require('../../../src/hooks/use-user.preferences') as jest.Mock).mockReturnValue({
      ...mockUseUserPreferences,
      preferences: { ...mockPreferences, darkMode: true },
    });

    render(<UserPreferencesScreen />);

    darkModeSwitch = screen.getByTestId('dark-mode-switch');
    expect(darkModeSwitch.props.value).toBe(true);
  });
});
