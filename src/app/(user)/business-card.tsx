import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { Screen } from '../../components/common/screen';
import { useAuth } from '../../hooks/use-auth';
import { useBusinessCard } from '../../hooks/use-business-card';
import { LoadingIndicator } from '../../components/common/loading-indicator';
import { ErrorDisplay } from '../../components/common/error-display';
import { BusinessCardForm } from '../../components/user/BusinessCardForm';
import { BusinessCard } from '../../domain/user/business-card.schema';
import { ServiceFactory } from '@/services/ServiceFactory';

/**
 * Placeholder screen for displaying and editing the user's business card.
 */
export default function BusinessCardScreen() {
  const { user: authUser } = useAuth();
  const { card, loading, error, updateCard } = useBusinessCard(
    authUser?.id ?? '',
    ServiceFactory.businessCard,
    { autoFetch: true },
  );

  const handleSave = (data: Partial<BusinessCard>) => {
    if (!authUser?.id) return;
    updateCard(data);
  };

  return (
    <Screen>
      <View style={{ padding: 16, gap: 16 }}>
        <Text variant="headlineMedium">Your Business Card</Text>

        {loading && <LoadingIndicator />}

        {error && <ErrorDisplay error={error} />}

        {card && <BusinessCardForm card={card} onSave={handleSave} />}
      </View>
    </Screen>
  );
}
