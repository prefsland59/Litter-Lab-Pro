import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Image } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { initDatabase } from '../src/db/database';
import { checkFirstLaunch } from '../src/utils/firstLaunch';
import { requestNotificationPermissions } from '../src/utils/notifications';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((err: unknown) => {
        console.error('Failed to initialize database:', err);
        // Proceed even on error so the app doesn't hang
        setDbReady(true);
      });
  }, []);

  useEffect(() => {
    if (dbReady) {
      checkFirstLaunch().then((isFirst) => {
        if (isFirst) {
          router.replace('/privacy-disclaimer');
        } else {
          // Request notification permissions after first launch flow
          requestNotificationPermissions();
        }
      });
    }
  }, [dbReady, router]);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../assets/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Litter Lab Pro</Text>
        <Text style={styles.subtitle}>Professional Breeding Management</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 32,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 24,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
