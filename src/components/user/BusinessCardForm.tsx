import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { BusinessCard } from '../../domain/user/business-card.schema';

type BusinessCardFormProps = {
  card: BusinessCard;
  onSave: (data: Partial<BusinessCard>) => void;
  isLoading?: boolean;
};

/**
 * Placeholder component for a form to edit the BusinessCard.
 */
export const BusinessCardForm = ({ card, onSave, isLoading }: BusinessCardFormProps) => {
  const [name, setName] = useState(card.displayName);
  const [email, setEmail] = useState(card.contactEmail || '');
  const [phone, setPhone] = useState(card.contactPhone || '');
  const [website, setWebsite] = useState(card.website || '');

  const handleSave = () => {
    onSave({ displayName: name, contactEmail: email, contactPhone: phone, website });
  };

  return (
    <View style={{ gap: 16 }}>
      <Text variant="titleMedium">Edit Business Card</Text>
      <TextInput
        label="Business Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        testID="name-input"
      />
      <TextInput
        label="Public Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        autoCapitalize="none"
        testID="email-input"
      />
      <TextInput
        label="Public Phone"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        testID="phone-input"
      />
      <TextInput
        label="Public Website"
        value={website}
        onChangeText={setWebsite}
        mode="outlined"
        autoCapitalize="none"
        testID="website-input"
      />
      <Button mode="contained" onPress={handleSave} disabled={isLoading} loading={isLoading}>
        {isLoading ? 'Saving...' : 'Save Card'}
      </Button>
    </View>
  );
};
