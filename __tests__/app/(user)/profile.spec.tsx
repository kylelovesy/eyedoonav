import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import UserProfileScreen from '../../../src/app/(user)/profile';

// Mock the hooks
jest.mock('../../../src/hooks/use-auth');
jest.mock('../../../src/hooks/use-user-profile');

// Mock components
jest.mock('../../../src/components/common/screen', () => ({
  Screen: ({ children }: any) => React.createElement('View', { testID: 'screen' }, children),
}));

jest.mock('../../../src/components/common/loading-indicator', () => ({
  LoadingIndicator: () =>
    React.createElement(
      'View',
      { testID: 'loading-indicator' },
      React.createElement('Text', {}, 'Loading...'),
    ),
}));

jest.mock('../../../src/components/common/error-display', () => ({
  ErrorDisplay: ({ error }: any) =>
    React.createElement(
      'View',
      { testID: 'error-display' },
      React.createElement('Text', {}, error.message),
    ),
}));

jest.mock('../../../src/components/user/UserProfileForm', () => ({
  UserProfileForm: ({ profile, onSave }: any) =>
    React.createElement('View', { testID: 'user-profile-form' }, [
      React.createElement('Text', { key: 'bio' }, `Bio: ${profile.bio}`),
      React.createElement('Text', { key: 'website' }, `Website: ${profile.website}`),
      React.createElement(
        'TouchableOpacity',
        {
          key: 'save',
          testID: 'save-profile-button',
          onPress: () => onSave({ bio: 'Updated bio', website: 'https://updated.com' }),
        },
        React.createElement('Text', {}, 'Save Profile'),
      ),
    ]),
}));

// Mock ServiceFactory
jest.mock('../../../src/services/ServiceFactory', () => ({
  ServiceFactory: {
    userProfile: {},
  },
}));

describe('UserProfileScreen', () => {
  const mockAuthUser = {
    id: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockProfile = {
    id: 'profile123',
    userId: 'user123',
    name: { firstName: 'Test', lastName: 'User' },
    bio: 'Test bio',
    website: 'https://example.com',
    businessName: 'Test Business',
    bannedAt: null,
    bannedReason: null,
    createdAt: new Date(),
  };

  const mockUseUserProfile = {
    profile: mockProfile,
    loading: false,
    error: null,
    updateProfile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (require('../../../src/hooks/use-auth') as jest.Mock).mockReturnValue({
      user: mockAuthUser,
    });
    (require('../../../src/hooks/use-user-profile') as jest.Mock).mockReturnValue(
      mockUseUserProfile,
    );
  });

  it('renders the profile screen correctly', () => {
    render(<UserProfileScreen />);

    expect(screen.getByTestId('screen')).toBeTruthy();
    expect(screen.getByText('Your Profile')).toBeTruthy();
    expect(screen.getByTestId('user-profile-form')).toBeTruthy();
  });

  it('displays profile data in the form', () => {
    render(<UserProfileScreen />);

    expect(screen.getByText('Bio: Test bio')).toBeTruthy();
    expect(screen.getByText('Website: https://example.com')).toBeTruthy();
  });

  it('calls updateProfile when form is saved', () => {
    render(<UserProfileScreen />);

    const saveButton = screen.getByTestId('save-profile-button');
    fireEvent.press(saveButton);

    expect(mockUseUserProfile.updateProfile).toHaveBeenCalledWith({
      bio: 'Updated bio',
      website: 'https://updated.com',
    });
  });

  it('does not call updateProfile if user is not authenticated', () => {
    (require('../../../src/hooks/use-auth') as jest.Mock).mockReturnValue({
      user: null,
    });

    render(<UserProfileScreen />);

    const saveButton = screen.getByTestId('save-profile-button');
    fireEvent.press(saveButton);

    expect(mockUseUserProfile.updateProfile).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    (require('../../../src/hooks/use-user-profile') as jest.Mock).mockReturnValue({
      ...mockUseUserProfile,
      loading: true,
      profile: null,
    });

    render(<UserProfileScreen />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('user-profile-form')).toBeNull();
  });

  it('shows error display when there is an error', () => {
    const mockError = { message: 'Failed to load profile' };
    (require('../../../src/hooks/use-user-profile') as jest.Mock).mockReturnValue({
      ...mockUseUserProfile,
      error: mockError,
      profile: null,
    });

    render(<UserProfileScreen />);

    expect(screen.getByTestId('error-display')).toBeTruthy();
    expect(screen.getByText('Failed to load profile')).toBeTruthy();
    expect(screen.queryByTestId('user-profile-form')).toBeNull();
  });

  it('does not show form when profile is null', () => {
    (require('../../../src/hooks/use-user-profile') as jest.Mock).mockReturnValue({
      ...mockUseUserProfile,
      profile: null,
    });

    render(<UserProfileScreen />);

    expect(screen.queryByTestId('user-profile-form')).toBeNull();
  });

  it('handles empty userId gracefully', () => {
    (require('../../../src/hooks/use-auth') as jest.Mock).mockReturnValue({
      user: { ...mockAuthUser, id: undefined },
    });

    render(<UserProfileScreen />);

    const saveButton = screen.getByTestId('save-profile-button');
    fireEvent.press(saveButton);

    expect(mockUseUserProfile.updateProfile).not.toHaveBeenCalled();
  });

  it('passes correct userId to useUserProfile hook', () => {
    const useUserProfileMock = jest.fn().mockReturnValue(mockUseUserProfile);
    jest.doMock('../../../src/hooks/use-user-profile', () => useUserProfileMock);

    render(<UserProfileScreen />);

    expect(useUserProfileMock).toHaveBeenCalledWith('user123', expect.any(Object), {
      autoFetch: true,
    });
  });
});
