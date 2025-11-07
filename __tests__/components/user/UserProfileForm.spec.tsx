import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { UserProfileForm } from '../../../src/components/user/UserProfileForm';
import { UserProfile } from '../../../src/domain/user/user.schema';
import { PaperProvider } from 'react-native-paper';

// Mock profile data
const mockProfile: UserProfile = {
  id: '123',
  userId: '123',
  createdAt: new Date(),
  name: { firstName: 'Test', lastName: 'User' },
  bio: 'Test bio',
  website: 'https://example.com',
  businessName: 'Test Business',
  bannedAt: null,
  bannedReason: null,
  updatedAt: new Date(),
};

describe('UserProfileForm', () => {
  const onSaveMock = jest.fn();

  beforeEach(() => {
    onSaveMock.mockClear();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof UserProfileForm>> = {}) => {
    return render(
      <PaperProvider>
        <UserProfileForm profile={mockProfile} onSave={onSaveMock} {...props} />
      </PaperProvider>,
    );
  };

  it('should render the form with initial values', () => {
    renderComponent();

    const bioInput = screen.getByTestId('bio-input');
    const websiteInput = screen.getByTestId('website-input');

    expect(bioInput.props.value).toBe(mockProfile.bio);
    expect(websiteInput.props.value).toBe(mockProfile.website);
  });

  it('should update state when user types', () => {
    renderComponent();

    const bioInput = screen.getByTestId('bio-input');
    fireEvent.changeText(bioInput, 'New bio text');

    expect(bioInput.props.value).toBe('New bio text');
  });

  it('should call onSave with updated values when button is pressed', () => {
    renderComponent();

    const bioInput = screen.getByTestId('bio-input');
    const websiteInput = screen.getByTestId('website-input');
    const saveButton = screen.getByText('Save Profile');

    // Act: Change text
    fireEvent.changeText(bioInput, 'Updated bio');
    fireEvent.changeText(websiteInput, 'https://updated.com');

    // Act: Press save
    fireEvent.press(saveButton);

    // Assert
    expect(onSaveMock).toHaveBeenCalledTimes(1);
    expect(onSaveMock).toHaveBeenCalledWith({
      bio: 'Updated bio',
      website: 'https://updated.com',
    });
  });

  it('should show loading state when isLoading is true', () => {
    renderComponent({ isLoading: true });
    const saveButton = screen.getByRole('button', { name: 'Saving...' });
    expect(saveButton).toBeDisabled(); // Check disabled state
    expect(screen.queryByRole('button', { name: 'Save Profile' })).toBeNull(); // Text changed to loading
    // No need for .props.isLoading; RTL doesn't expose it directly
  });
});
