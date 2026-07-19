import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';

export default function BuyerLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="add" options={{ title: 'Add Buyer' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Buyer Details' }} />
    </Stack>
  );
}
