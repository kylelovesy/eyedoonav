import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BusinessCardScreen from '../../../src/app/(user)/business-card';

// Mock the hooks
jest.mock('../../../src/hooks/use-auth');
jest.mock('../../../src/hooks/use-business-card');

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

jest.mock('../../../src/components/user/BusinessCardForm', () => ({
  BusinessCardForm: ({ card, onSave }: any) =>
    React.createElement('View', { testID: 'business-card-form' }, [
      React.createElement('Text', { key: 'name' }, `Name: ${card.name}`),
      React.createElement('Text', { key: 'business' }, `Business: ${card.businessName}`),
      React.createElement(
        'TouchableOpacity',
        {
          key: 'save',
          testID: 'save-card-button',
          onPress: () =>
            onSave({
              name: 'Updated Name',
              businessName: 'Updated Business',
              phone: '123-456-7890',
              email: 'updated@example.com',
            }),
        },
        React.createElement('Text', {}, 'Save Card'),
      ),
    ]),
}));

// Mock ServiceFactory
jest.mock('../../../src/services/ServiceFactory', () => ({
  ServiceFactory: {
    businessCard: {},
  },
}));

describe('BusinessCardScreen', () => {
  const mockAuthUser = {
    id: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockCard = {
    id: 'card123',
    userId: 'user123',
    name: 'John Doe',
    businessName: 'Test Business',
    phone: '123-456-7890',
    email: 'john@testbusiness.com',
    website: 'https://testbusiness.com',
    address: '123 Test St',
    logo: '',
    createdAt: new Date(),
  };

  const mockUseBusinessCard = {
    card: mockCard,
    loading: false,
    error: null,
    updateCard: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (require('../../../src/hooks/use-auth') as jest.Mock).mockReturnValue({
      user: mockAuthUser,
    });
    (require('../../../src/hooks/use-business-card') as jest.Mock).mockReturnValue(
      mockUseBusinessCard,
    );
  });

  it('renders the business card screen correctly', () => {
    render(<BusinessCardScreen />);

    expect(screen.getByTestId('screen')).toBeTruthy();
    expect(screen.getByText('Your Business Card')).toBeTruthy();
    expect(screen.getByTestId('business-card-form')).toBeTruthy();
  });

  it('displays business card data in the form', () => {
    render(<BusinessCardScreen />);

    expect(screen.getByText('Name: John Doe')).toBeTruthy();
    expect(screen.getByText('Business: Test Business')).toBeTruthy();
  });

  it('calls updateCard when form is saved', () => {
    render(<BusinessCardScreen />);

    const saveButton = screen.getByTestId('save-card-button');
    fireEvent.press(saveButton);

    expect(mockUseBusinessCard.updateCard).toHaveBeenCalledWith({
      name: 'Updated Name',
      businessName: 'Updated Business',
      phone: '123-456-7890',
      email: 'updated@example.com',
    });
  });

  it('does not call updateCard if user is not authenticated', () => {
    (require('../../../src/hooks/use-auth') as jest.Mock).mockReturnValue({
      user: null,
    });

    render(<BusinessCardScreen />);

    const saveButton = screen.getByTestId('save-card-button');
    fireEvent.press(saveButton);

    expect(mockUseBusinessCard.updateCard).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    (require('../../../src/hooks/use-business-card') as jest.Mock).mockReturnValue({
      ...mockUseBusinessCard,
      loading: true,
      card: null,
    });

    render(<BusinessCardScreen />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('business-card-form')).toBeNull();
  });

  it('shows error display when there is an error', () => {
    const mockError = { message: 'Failed to load business card' };
    (require('../../../src/hooks/use-business-card') as jest.Mock).mockReturnValue({
      ...mockUseBusinessCard,
      error: mockError,
      card: null,
    });

    render(<BusinessCardScreen />);

    expect(screen.getByTestId('error-display')).toBeTruthy();
    expect(screen.getByText('Failed to load business card')).toBeTruthy();
    expect(screen.queryByTestId('business-card-form')).toBeNull();
  });

  it('does not show form when card is null', () => {
    (require('../../../src/hooks/use-business-card') as jest.Mock).mockReturnValue({
      ...mockUseBusinessCard,
      card: null,
    });

    render(<BusinessCardScreen />);

    expect(screen.queryByTestId('business-card-form')).toBeNull();
  });

  it('handles empty userId gracefully', () => {
    (require('../../../src/hooks/use-auth') as jest.Mock).mockReturnValue({
      user: { ...mockAuthUser, id: undefined },
    });

    render(<BusinessCardScreen />);

    const saveButton = screen.getByTestId('save-card-button');
    fireEvent.press(saveButton);

    expect(mockUseBusinessCard.updateCard).not.toHaveBeenCalled();
  });

  it('passes correct userId to useBusinessCard hook', () => {
    const useBusinessCardMock = jest.fn().mockReturnValue(mockUseBusinessCard);
    jest.doMock('../../../src/hooks/use-business-card', () => useBusinessCardMock);

    render(<BusinessCardScreen />);

    expect(useBusinessCardMock).toHaveBeenCalledWith('user123', expect.any(Object), {
      autoFetch: true,
    });
  });

  it('handles form submission with partial data', () => {
    render(<BusinessCardScreen />);

    const saveButton = screen.getByTestId('save-card-button');
    fireEvent.press(saveButton);

    expect(mockUseBusinessCard.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Name',
        businessName: 'Updated Business',
      }),
    );
  });

  it('renders with different card data', () => {
    const differentCard = {
      ...mockCard,
      name: 'Jane Smith',
      businessName: 'Different Business',
    };

    (require('../../../src/hooks/use-business-card') as jest.Mock).mockReturnValue({
      ...mockUseBusinessCard,
      card: differentCard,
    });

    render(<BusinessCardScreen />);

    expect(screen.getByText('Name: Jane Smith')).toBeTruthy();
    expect(screen.getByText('Business: Different Business')).toBeTruthy();
  });
});
