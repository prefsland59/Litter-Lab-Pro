import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../src/theme/ThemeContext';
import { getAllRows } from '../src/db/database';
import type { Litter, HeatCycle, Puppy } from '../src/db/schema';

interface AnalyticsData {
  avgLitterSize: number | null;
  totalLitters: number;
  avgCycleLength: number | null;
  totalCycles: number;
  survivalRate: number | null;
  totalBorn: number;
  totalStillborns: number;
  colorDistribution: { color: string; count: number }[];
  totalPuppies: number;
}

export default function AnalyticsScreen() {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    avgLitterSize: null,
    totalLitters: 0,
    avgCycleLength: null,
    totalCycles: 0,
    survivalRate: null,
    totalBorn: 0,
    totalStillborns: 0,
    colorDistribution: [],
    totalPuppies: 0,
  });

  const loadAnalytics = useCallback(async () => {
    try {
      const [litters, heatCycles, puppies] = await Promise.all([
        getAllRows<Litter>('litters'),
        getAllRows<HeatCycle>('heat_cycles'),
        getAllRows<Puppy>('puppies'),
      ]);

      // Average litter size (completed litters with total_puppies)
      const completedLitters = litters.filter(
        (l: Litter) => l.total_puppies != null && l.total_puppies > 0
      );
      const avgLitterSize =
        completedLitters.length > 0
          ? completedLitters.reduce((sum: number, l: Litter) => sum + (l.total_puppies || 0), 0) /
            completedLitters.length
          : null;

      // Average cycle length (completed cycles with start & end)
      const completedCycles = heatCycles.filter(
        (h: HeatCycle) => h.start_date && h.end_date
      );
      let avgCycleLength: number | null = null;
      if (completedCycles.length > 0) {
        const totalDays = completedCycles.reduce((sum: number, h: HeatCycle) => {
          const start = new Date(h.start_date);
          const end = new Date(h.end_date!);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgCycleLength = totalDays / completedCycles.length;
      }

      // Survival rate: (total_puppies - stillborns) / total_puppies
      const allBorn = litters.reduce((sum: number, l: Litter) => sum + (l.total_puppies || 0), 0);
      const allStillborns = litters.reduce((sum: number, l: Litter) => sum + (l.stillborns || 0), 0);
      const survivalRate = allBorn > 0 ? (allBorn - allStillborns) / allBorn : null;

      // Color distribution
      const colorMap = new Map<string, number>();
      puppies.forEach((p: Puppy) => {
        if (p.color) {
          const c = p.color.trim();
          colorMap.set(c, (colorMap.get(c) || 0) + 1);
        }
      });
      const colorDistribution = Array.from(colorMap.entries())
        .map(([color, count]) => ({ color, count }))
        .sort((a, b) => b.count - a.count);

      setData({
        avgLitterSize,
        totalLitters: completedLitters.length,
        avgCycleLength,
        totalCycles: completedCycles.length,
        survivalRate,
        totalBorn: allBorn,
        totalStillborns: allStillborns,
        colorDistribution,
        totalPuppies: puppies.length,
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [loadAnalytics]),
  );

  // Color palette for pie-like display
  const PIE_COLORS = [
    '#C8963E', '#3B82F6', '#EC4899', '#16A34A', '#8B5CF6',
    '#D97706', '#EF4444', '#06B6D4', '#84CC16', '#F59E0B',
  ];

  const maxColorCount = Math.max(1, ...data.colorDistribution.map((c) => c.count));

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
        <Text variant="headlineSmall" style={[styles.heading, { color: colors.text }]}>
          Breeding Analytics
        </Text>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <Card style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metricInner}>
              <MaterialCommunityIcons name="dog-side" size={22} color={colors.accent} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {data.avgLitterSize != null ? data.avgLitterSize.toFixed(1) : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Avg Litter Size
              </Text>
              <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
                {data.totalLitters} litter{data.totalLitters !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metricInner}>
              <MaterialCommunityIcons name="calendar-sync" size={22} color={colors.accent} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {data.avgCycleLength != null ? `${Math.round(data.avgCycleLength)}d` : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Avg Cycle Length
              </Text>
              <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
                {data.totalCycles} complete cycle{data.totalCycles !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metricInner}>
              <MaterialCommunityIcons
                name="heart-pulse"
                size={22}
                color={data.survivalRate != null && data.survivalRate < 0.9 ? colors.warning : colors.success}
              />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {data.survivalRate != null ? `${(data.survivalRate * 100).toFixed(0)}%` : '—'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Survival Rate
              </Text>
              <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
                {data.totalBorn - data.totalStillborns}/{data.totalBorn} alive
              </Text>
            </View>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metricInner}>
              <MaterialCommunityIcons name="paw" size={22} color={colors.accent} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {data.totalPuppies}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Puppies Recorded
              </Text>
              <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
                {data.totalStillborns} stillborn
              </Text>
            </View>
          </Card>
        </View>

        {/* Color Distribution */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
              Color Distribution
            </Text>

            {data.colorDistribution.length === 0 ? (
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                No color data available. Add puppies with colors to see distribution.
              </Text>
            ) : (
              <View style={styles.colorList}>
                {data.colorDistribution.map((item, idx) => {
                  const pct = (item.count / maxColorCount) * 100;
                  const barColor = PIE_COLORS[idx % PIE_COLORS.length];
                  return (
                    <View key={item.color} style={styles.colorRow}>
                      <Text style={[styles.colorLabel, { color: colors.text }]} numberOfLines={1}>
                        {item.color}
                      </Text>
                      <View style={styles.colorBarTrack}>
                        <View
                          style={[
                            styles.colorBarFill,
                            {
                              width: `${Math.max(pct, 3)}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.colorCount, { color: colors.text }]}>
                        {item.count}
                      </Text>
                    </View>
                  );
                })}
              </View>
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  heading: { fontWeight: '700', marginBottom: 16 },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
  },
  metricInner: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  metricSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 10,
  },
  colorList: {
    gap: 8,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorLabel: {
    width: 90,
    fontSize: 13,
  },
  colorBarTrack: {
    flex: 1,
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 7,
    overflow: 'hidden',
  },
  colorBarFill: {
    height: 14,
    borderRadius: 7,
    minWidth: 4,
  },
  colorCount: {
    width: 30,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
  },
});
