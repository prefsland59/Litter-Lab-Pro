import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../src/theme/ThemeContext';
import { markDisclaimerSeen } from '../src/utils/firstLaunch';
import { requestNotificationPermissions } from '../src/utils/notifications';

const DISCLAIMER_LEGAL = `This app is for informational and record-keeping purposes only. It does not provide veterinary, breeding, or legal advice. All users are responsible for consulting licensed veterinarians and attorneys for professional guidance. Contract templates are editable samples only — the developer is not a law firm and provides no warranties regarding their legal validity or enforceability in any jurisdiction. Users must ensure compliance with all applicable local, state, and federal laws regarding animal breeding, sales, and contracts.`;

const DISCLAIMER_PRIVACY = `100% Private. All breeding and puppy data stays on your device. No accounts. No cloud sync. No data collection.`;

export default function PrivacyDisclaimerScreen() {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';

  const handleAccept = async () => {
    await markDisclaimerSeen();
    // Request notification permissions after user has accepted the disclaimer
    requestNotificationPermissions();
    router.replace('/');
  };

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Header */}
        <View style={styles.headerSection}>
          <Text
            variant="headlineMedium"
            style={[styles.title, { color: colors.primary }]}
          >
            Welcome to{'\n'}Litter Lab Pro
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            Please review before continuing
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Legal Disclaimer */}
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            Disclaimer
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.disclaimerText, { color: colors.textSecondary }]}
          >
            {DISCLAIMER_LEGAL}
          </Text>
        </View>

        {/* Privacy Statement */}
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: colors.text }]}
          >
            Privacy
          </Text>
          <View
            style={[
              styles.privacyBox,
              {
                backgroundColor: isDark ? '#1A2A1A' : '#F0FDF4',
                borderColor: colors.success,
              },
            ]}
          >
            <Text
              variant="bodyMedium"
              style={[styles.privacyText, { color: colors.success }]}
            >
              {DISCLAIMER_PRIVACY}
            </Text>
          </View>
        </View>

        {/* Spacer so button doesn't overlap content */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View
        style={[
          styles.buttonContainer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Button
          mode="contained"
          onPress={handleAccept}
          buttonColor={colors.accent}
          textColor={isDark ? colors.background : '#FFFFFF'}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          I Understand
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  headerSection: {
    marginBottom: 20,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.8,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  disclaimerText: {
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  privacyBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  privacyText: {
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
