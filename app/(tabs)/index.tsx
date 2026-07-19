import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { getAllRows } from '../../src/db/database';
import type { Dog, Litter, HeatCycle, Milestone, WeightEntry } from '../../src/db/schema';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeFemales: 0,
    activeMales: 0,
    activeHeatCycles: 0,
    activeLitters: 0,
  });
  const [upcomingMilestones, setUpcomingMilestones] = useState<(Milestone & { dam_name: string })[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ text: string; date: string }[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const [dogs, heats, litters, milestones, weightEntries] = await Promise.all([
        getAllRows<Dog>('dogs'),
        getAllRows<HeatCycle>('heat_cycles'),
        getAllRows<Litter>('litters'),
        getAllRows<Milestone>('milestones'),
        getAllRows<WeightEntry>('weight_entries'),
      ]);

      // Stats
      const activeDogs = dogs.filter((d) => d.is_active === 1);
      setStats({
        activeFemales: activeDogs.filter((d) => d.sex === 'female').length,
        activeMales: activeDogs.filter((d) => d.sex === 'male').length,
        activeHeatCycles: heats.filter((h) => !h.end_date).length,
        activeLitters: litters.filter((l) => {
          if (!l.whelping_date) return true;
          const d = new Date(l.whelping_date);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 12 * 7);
          return d >= cutoff;
        }).length,
      });

      // Build dam name map
      const dogMap = new Map<number, string>();
      dogs.forEach((d) => dogMap.set(d.id, d.name));

      // Upcoming milestones (next 3 due, not completed)
      const upcoming = milestones
        .filter((m) => !m.completed_at && m.due_date && m.litter_id)
        .sort((a, b) => (a.due_date!).localeCompare(b.due_date!))
        .slice(0, 3)
        .map((m) => {
          // Find litter for dam name
          const litter = litters.find((l) => l.id === m.litter_id);
          return { ...m, dam_name: litter ? dogMap.get(litter.dam_id) || 'Unknown' : 'Unknown' };
        });
      setUpcomingMilestones(upcoming);

      // Recent activity
      const activity: { text: string; date: string }[] = [];

      // Recent completed milestones
      const completedMs = milestones
        .filter((m) => m.completed_at)
        .sort((a, b) => b.completed_at!.localeCompare(a.completed_at!))
        .slice(0, 3);
      for (const m of completedMs) {
        const litter = litters.find((l) => l.id === m.litter_id);
        const damName = litter ? dogMap.get(litter.dam_id) || 'Unknown' : 'Unknown';
        activity.push({
          text: `${damName}'s litter: ${m.title} completed`,
          date: m.completed_at!,
        });
      }

      // If fewer than 3 milestones, fill with recent weights
      if (activity.length < 3 && weightEntries.length > 0) {
        const recentWeights = weightEntries
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 3 - activity.length);
        for (const w of recentWeights) {
          activity.push({
            text: `Weight recorded: ${w.weight_grams}g`,
            date: w.date,
          });
        }
      }

      setRecentActivity(activity);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  if (loading) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Surface>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={[styles.heading, { color: colors.text }]}>
          Dashboard
        </Text>

        {/* At a Glance */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: '600' }}>
              At a Glance
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="gender-female" size={20} color="#EC4899" />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeFemales}</Text>
                <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Females</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="gender-male" size={20} color="#3B82F6" />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeMales}</Text>
                <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Males</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="thermometer" size={20} color={colors.warning} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeHeatCycles}</Text>
                <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Active Heats</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="home-heart" size={20} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeLitters}</Text>
                <Text style={[styles.statItemLabel, { color: colors.textSecondary }]}>Active Litters</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Upcoming */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: '600' }}>
              Upcoming
            </Text>
            {upcomingMilestones.length === 0 ? (
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                No upcoming events
              </Text>
            ) : (
              upcomingMilestones.map((m, i) => (
                <View key={m.id} style={[styles.activityRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                  <MaterialCommunityIcons
                    name="flag-checkered"
                    size={18}
                    color={colors.warning}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: colors.text }}>
                      {m.dam_name}: {m.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                      Due {formatDate(m.due_date!)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: colors.primary, fontWeight: '600' }}>
              Recent Activity
            </Text>
            {recentActivity.length === 0 ? (
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                Your recent activity will appear here
              </Text>
            ) : (
              recentActivity.map((a, i) => (
                <View key={i} style={[styles.activityRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={18}
                    color={colors.success}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: colors.text }}>{a.text}</Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{formatDate(a.date)}</Text>
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  heading: { marginBottom: 20, fontWeight: '700' },
  card: { marginBottom: 14, borderRadius: 12, borderWidth: 1 },
  cardBody: { marginTop: 8 },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statItemLabel: {
    fontSize: 11,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
});
