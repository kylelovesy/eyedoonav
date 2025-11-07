import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { BusinessCardForm } from '../../../src/components/user/BusinessCardForm';
import { BusinessCard } from '../../../src/domain/user/business-card.schema';
import { PaperProvider } from 'react-native-paper';

// Mock card data
const mockCard: BusinessCard = {
  id: '123',
  userId: '123',
  createdAt: new Date(),
  firstName: 'Test',
  lastName: 'Business',
  displayName: 'Test Business',
  companyName: 'Test Company',
  jobTitle: 'Test Job Title',
  street: '123 Main St',
  city: 'Anytown',
  postalCode: '12345',
  contactEmail: 'test@biz.com',
  contactPhone: '123-456-7890',
  website: 'https://biz.com',
  instagram: 'https://instagram.com/test',
  facebook: 'https://facebook.com/test',
  twitter: 'https://twitter.com/test',
  linkedin: 'https://linkedin.com/test',
  youtube: 'https://youtube.com/test',
  tiktok: null,
  pinterest: null,
  socialMediaOther: null,
  notes: null,
};

describe('BusinessCardForm', () => {
  const onSaveMock = jest.fn();

  beforeEach(() => {
    onSaveMock.mockClear();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof BusinessCardForm>> = {}) => {
    return render(
      <PaperProvider>
        <BusinessCardForm card={mockCard} onSave={onSaveMock} {...props} />
      </PaperProvider>,
    );
  };

  it('should render the form with initial values', () => {
    renderComponent();

    expect(screen.getByTestId('name-input').props.value).toBe(mockCard.displayName);
    expect(screen.getByTestId('email-input').props.value).toBe(mockCard.contactEmail);
    expect(screen.getByTestId('phone-input').props.value).toBe(mockCard.contactPhone);
    expect(screen.getByTestId('website-input').props.value).toBe(mockCard.website);
  });

  it('should call onSave with updated values when button is pressed', () => {
    renderComponent();

    const nameInput = screen.getByTestId('name-input');
    const emailInput = screen.getByTestId('email-input');
    const saveButton = screen.getByText('Save Card');

    // Act: Change text
    fireEvent.changeText(nameInput, 'Updated Name');
    fireEvent.changeText(emailInput, 'updated@biz.com');

    // Act: Press save
    fireEvent.press(saveButton);

    // Assert
    expect(onSaveMock).toHaveBeenCalledTimes(1);
    expect(onSaveMock).toHaveBeenCalledWith({
      displayName: 'Updated Name',
      contactEmail: 'updated@biz.com',
      contactPhone: '123-456-7890',
      website: 'https://biz.com',
    });
  });

  it('should show loading state when isLoading is true', () => {
    renderComponent({ isLoading: true });

    const saveButton = screen.getByRole('button', { name: 'Saving...' });
    expect(saveButton).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
