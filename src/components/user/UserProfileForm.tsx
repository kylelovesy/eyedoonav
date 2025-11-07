import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { UserProfile } from '../../domain/user/user.schema';

type UserProfileFormProps = {
  profile: UserProfile;
  onSave: (data: { bio: string; website: string }) => void;
  isLoading?: boolean;
};

/**
 * Placeholder component for a form to edit the UserProfile.
 */
export const UserProfileForm = ({ profile, onSave, isLoading }: UserProfileFormProps) => {
  const [bio, setBio] = useState(profile.bio || '');
  const [website, setWebsite] = useState(profile.website || '');

  const handleSave = () => {
    onSave({ bio, website });
  };

  return (
    <View style={{ gap: 16 }}>
      <Text variant="titleMedium">Edit Your Details</Text>
      <TextInput
        label="Bio"
        value={bio}
        onChangeText={setBio}
        mode="outlined"
        multiline
        numberOfLines={3}
        placeholder="Tell us about yourself"
        testID="bio-input"
      />
      <TextInput
        label="Website"
        value={website}
        onChangeText={setWebsite}
        mode="outlined"
        placeholder="https://your-website.com"
        autoCapitalize="none"
        testID="website-input"
      />
      <Button mode="contained" onPress={handleSave} disabled={isLoading} loading={isLoading}>
        {isLoading ? 'Saving...' : 'Save Profile'}
      </Button>
    </View>
  );
};
