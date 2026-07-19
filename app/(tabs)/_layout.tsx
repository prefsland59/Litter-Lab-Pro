import React from 'react';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/ThemeContext';

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => (
            <MaterialCommunityIcons
              name="view-dashboard"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dogs"
        options={{
          title: 'Dogs',
          tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => (
            <MaterialCommunityIcons
              name="dog-side"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="heats"
        options={{
          title: 'Heats',
          tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => (
            <MaterialCommunityIcons
              name="thermometer"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="litters"
        options={{
          title: 'Litters',
          tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => (
            <MaterialCommunityIcons
              name="home-heart"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => (
            <MaterialCommunityIcons
              name="cog"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
