import React from 'react';
import { View } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { Screen } from '../../components/common/screen';
import { useAuth } from '../../hooks/use-auth';
import { useUserPreferences } from '../../hooks/use-user.preferences';
import { LoadingIndicator } from '../../components/common/loading-indicator';
import { ErrorDisplay } from '../../components/common/error-display';
import { ServiceFactory } from '@/services/ServiceFactory';

/**
 * Placeholder screen for managing user preferences (theme, notifications).
 */
export default function UserPreferencesScreen() {
  const { user: authUser } = useAuth();
  const { preferences, loading, error, updatePreferences } = useUserPreferences(
    authUser?.id ?? '',
    ServiceFactory.userPreferences,
    { autoFetch: true },
  );

  if (loading || !preferences) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <Screen>
        <ErrorDisplay error={error} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ padding: 16, gap: 24 }}>
        <Text variant="headlineMedium">Preferences</Text>

        {/* Dark Mode Preference */}
        <View>
          <Text variant="titleMedium">Dark Mode</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Switch
              value={preferences.darkMode}
              onValueChange={value => {
                updatePreferences({ darkMode: value });
              }}
            />
            <Text>Enable Dark Mode</Text>
          </View>
        </View>

        {/* Notification Preferences */}
        <View>
          <Text variant="titleMedium">Notifications</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Switch
              value={preferences.notifications}
              onValueChange={value => {
                updatePreferences({ notifications: value });
              }}
            />
            <Text>Enable Notifications</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
