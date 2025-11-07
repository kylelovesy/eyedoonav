import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Screen } from '../../components/common/screen';
import { UserProfileForm } from '../../components/user/UserProfileForm';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useAuth } from '../../hooks/use-auth';
import { LoadingIndicator } from '../../components/common/loading-indicator';
import { ErrorDisplay } from '../../components/common/error-display';
import { ServiceFactory } from '@/services/ServiceFactory';

/**
 * Placeholder screen for displaying and editing the user's profile.
 */
export default function UserProfileScreen() {
  const { user: authUser } = useAuth();
  const { profile, loading, error, updateProfile } = useUserProfile(
    authUser?.id ?? '',
    ServiceFactory.userProfile,
    { autoFetch: true },
  );

  const handleSave = (data: { bio: string; website: string }) => {
    if (!authUser?.id) return;
    // In a real app, you'd add loading/error handling for the update
    updateProfile(data);
  };

  return (
    <Screen>
      <View style={{ padding: 16, gap: 16 }}>
        <Text variant="headlineMedium">Your Profile</Text>

        {loading && <LoadingIndicator />}

        {error && <ErrorDisplay error={error} />}

        {profile && <UserProfileForm profile={profile} onSave={handleSave} />}
      </View>
    </Screen>
  );
}
