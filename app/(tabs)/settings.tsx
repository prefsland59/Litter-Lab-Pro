import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Switch, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { Text, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { getAllRows } from '../../src/db/database';
import { writeAsStringAsync, Paths } from 'expo-file-system';
import { shareAsync, isAvailableAsync } from 'expo-sharing';

// All table names to export
const ALL_TABLES = [
  'dogs',
  'heat_cycles',
  'progesterone_tests',
  'breedings',
  'litters',
  'puppies',
  'weight_entries',
  'feeding_logs',
  'health_notes',
  'milestones',
  'photos',
  'buyers',
  'placements',
  'expenses',
  'health_clearances',
  'contracts',
];

function formatDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useAppTheme();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    try {
      setExporting(true);

      // Collect all data from all tables
      const exportData: Record<string, unknown[]> = {};
      for (const table of ALL_TABLES) {
        try {
          const rows = await getAllRows(table);
          exportData[table] = rows;
        } catch {
          // Table might not have data — that's fine
          exportData[table] = [];
        }
      }

      const jsonString = JSON.stringify(
        {
          app: 'Litter Lab Pro',
          version: '1.0.0',
          exported_at: new Date().toISOString(),
          data: exportData,
        },
        null,
        2,
      );

      const filename = `litter_lab_pro_backup_${formatDate()}.json`;
      const fileUri = Paths.document.uri + filename;

      // Write file using expo-file-system legacy API
      await writeAsStringAsync(fileUri, jsonString, {
        encoding: 'utf8',
      });

      // Share the file
      const available = await isAvailableAsync();
      if (!available) {
        Alert.alert(
          'Export Complete',
          `Data exported to ${filename} in the app documents. Sharing is not available on this device.`,
        );
        return;
      }

      await shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Litter Lab Pro Data',
      });
    } catch (err) {
      console.error('Export failed:', err);
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text
          variant="headlineMedium"
          style={[styles.heading, { color: colors.text }]}
        >
          Settings
        </Text>

        {/* About Section */}
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: colors.primary }]}
          >
            About
          </Text>
          <View style={styles.aboutHeader}>
            <Image
              source={require('../../assets/logo.jpg')}
              style={styles.aboutLogo}
              resizeMode="contain"
            />
            <View style={styles.aboutText}>
              <Text variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>
                Litter Lab Pro
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                1.0.0
              </Text>
            </View>
          </View>
        </Surface>

        <View style={styles.sectionSpacing} />

        {/* Pro Features Section */}
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: colors.primary }]}
          >
            Pro Features
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.pressableRow,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => router.push('/buyers')}
          >
            <View style={styles.linkRow}>
              <MaterialCommunityIcons name="account-group" size={20} color={colors.accent} />
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                Buyer Management
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
              ›
            </Text>
          </Pressable>

          <Divider style={{ backgroundColor: colors.border, marginVertical: 4 }} />

          <Pressable
            style={({ pressed }) => [
              styles.pressableRow,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => router.push('/analytics')}
          >
            <View style={styles.linkRow}>
              <MaterialCommunityIcons name="chart-bar" size={20} color={colors.accent} />
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                Breeding Analytics
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
              ›
            </Text>
          </Pressable>
        </Surface>

        <View style={styles.sectionSpacing} />

        {/* Appearance Section */}
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: colors.primary }]}
          >
            Appearance
          </Text>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              Dark Mode
            </Text>
            <View style={styles.toggleRow}>
              <Text
                variant="bodySmall"
                style={{ color: colors.textSecondary, marginRight: 10 }}
              >
                {theme === 'dark' ? 'On' : 'Off'}
              </Text>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{
                  false: colors.border,
                  true: colors.accent,
                }}
                thumbColor={theme === 'dark' ? colors.primary : '#f4f3f4'}
              />
            </View>
          </View>
        </Surface>

        <View style={styles.sectionSpacing} />

        {/* Privacy Section */}
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: colors.primary }]}
          >
            Privacy
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.pressableRow,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => {
              router.push('/privacy-disclaimer');
            }}
          >
            <View style={styles.linkRow}>
              <MaterialCommunityIcons name="shield-check" size={20} color={colors.accent} />
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                Privacy Disclaimer
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
              ›
            </Text>
          </Pressable>
        </Surface>

        <View style={styles.sectionSpacing} />

        {/* Data Section */}
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: colors.primary }]}
          >
            Data
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.pressableRow,
              pressed && { opacity: 0.6 },
              exporting && { opacity: 0.5 },
            ]}
            onPress={handleExportData}
            disabled={exporting}
          >
            <View style={styles.linkRow}>
              <MaterialCommunityIcons
                name="file-export"
                size={20}
                color={colors.accent}
              />
              <Text variant="bodyMedium" style={{ color: colors.accent }}>
                Export Data
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                ›
              </Text>
            )}
          </Pressable>
        </Surface>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heading: {
    marginBottom: 20,
    fontWeight: '700',
  },
  section: {
    borderRadius: 12,
    padding: 16,
  },
  sectionSpacing: {
    height: 14,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  aboutLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  aboutText: {
    flex: 1,
  },
  bottomPadding: {
    height: 40,
  },
});
