import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Image } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { initDatabase } from '../src/db/database';
import { checkFirstLaunch } from '../src/utils/firstLaunch';
import { requestNotificationPermissions } from '../src/utils/notifications';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const router = useRouter();
  const dbInitRef = useRef(false);

  useEffect(() => {
    if (dbInitRef.current) return;
    dbInitRef.current = true;

    // Safety timeout: if DB init doesn't complete in 3 seconds,
    // set dbReady anyway so the app renders instead of hanging.
    const timeout = setTimeout(() => {
      setDbReady((prev) => {
        if (!prev) {
          console.warn('Database init timed out — proceeding without DB');
        }
        return true;
      });
    }, 3000);

    initDatabase()
      .then(() => setDbReady(true))
      .catch((err: unknown) => {
        console.error('Failed to initialize database:', err);
        // Proceed even on error so the app doesn't hang
        setDbReady(true);
      })
      .finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (dbReady) {
      checkFirstLaunch().then((isFirst) => {
        if (isFirst) {
          // Delay redirect slightly to ensure navigation stack is mounted
          setTimeout(() => {
            router.replace('/privacy-disclaimer');
          }, 100);
        } else {
          // Request notification permissions after first launch flow
          requestNotificationPermissions();
        }
      });
    }
  }, [dbReady, router]);

  // Always render within ThemeProvider so that PaperProvider and SafeAreaProvider
  // are available before Slot (expo-router navigation) mounts. This prevents a
  // boolean/string prop type mismatch when the native side receives theme or
  // safe-area props before the providers are ready.
  return (
    <ThemeProvider>
      {!dbReady ? (
        <View style={styles.loadingContainer}>
          <Image
            source={require('../assets/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Litter Lab Pro</Text>
          <Text style={styles.subtitle}>Professional Breeding Management</Text>
        </View>
      ) : (
        <Slot />
      )}
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
