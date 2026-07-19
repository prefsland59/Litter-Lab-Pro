import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  Chip,
  Surface,
  ActivityIndicator,
  Searchbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { getAllRows, getRowsByField } from '../../src/db/database';
import type { HeatCycle, Dog } from '../../src/db/schema';

// ── Types ────────────────────────────────────────────────────────────────────

interface HeatWithDog extends HeatCycle {
  dog_name: string;
}

interface CyclePrediction {
  dog_id: number;
  dog_name: string;
  avg_cycle_days: number;
  last_start: string;
  next_expected: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Mini Calendar ────────────────────────────────────────────────────────────

interface CalendarDay {
  date: string;
  dayNum: number;
  isToday: boolean;
  hasActive: boolean;
  hasPredicted: boolean;
}

function generateCalendarDays(
  activeHeats: HeatWithDog[],
  predictions: CyclePrediction[],
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay()); // Sunday of this week

  // Build sets for quick lookup
  const activeSet = new Set<string>();
  for (const h of activeHeats) {
    const d = new Date(h.start_date);
    for (let i = 0; i <= 21; i++) {
      const c = new Date(d);
      c.setDate(d.getDate() + i);
      activeSet.add(c.toISOString().slice(0, 10));
    }
  }

  const predictedSet = new Set<string>();
  for (const p of predictions) {
    if (p.next_expected) {
      const d = new Date(p.next_expected);
      for (let i = -3; i <= 3; i++) {
        const c = new Date(d);
        c.setDate(d.getDate() + i);
        predictedSet.add(c.toISOString().slice(0, 10));
      }
    }
  }

  for (let i = 0; i < 42; i++) {
    const c = new Date(start);
    c.setDate(start.getDate() + i);
    const ds = c.toISOString().slice(0, 10);
    days.push({
      date: ds,
      dayNum: c.getDate(),
      isToday: ds === todayStr(),
      hasActive: activeSet.has(ds),
      hasPredicted: predictedSet.has(ds),
    });
  }
  return days;
}

function MiniCalendar({
  activeHeats,
  predictions,
  colors,
}: {
  activeHeats: HeatWithDog[];
  predictions: CyclePrediction[];
  colors: { accent: string; warning: string; text: string; textSecondary: string; surface: string; border: string; background: string };
}) {
  const days = useMemo(
    () => generateCalendarDays(activeHeats, predictions),
    [activeHeats, predictions],
  );

  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={[miniStyles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Legend */}
      <View style={miniStyles.legend}>
        <View style={miniStyles.legendItem}>
          <View style={[miniStyles.dot, { backgroundColor: colors.warning }]} />
          <Text style={[miniStyles.legendText, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={miniStyles.legendItem}>
          <View style={[miniStyles.dot, { backgroundColor: colors.accent }]} />
          <Text style={[miniStyles.legendText, { color: colors.textSecondary }]}>Predicted</Text>
        </View>
      </View>

      {/* Weekday headers */}
      <View style={miniStyles.weekRow}>
        {weekdayLabels.map((lbl, i) => (
          <View key={i} style={miniStyles.dayCell}>
            <Text style={[miniStyles.weekdayText, { color: colors.textSecondary }]}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      {Array.from({ length: 6 }).map((_, weekIdx) => (
        <View key={weekIdx} style={miniStyles.weekRow}>
          {days.slice(weekIdx * 7, (weekIdx + 1) * 7).map((day, dayIdx) => (
            <TouchableOpacity
              key={dayIdx}
              style={[
                miniStyles.dayCell,
                day.isToday && { backgroundColor: colors.accent + '20', borderRadius: 6 },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  miniStyles.dayText,
                  { color: day.isToday ? colors.accent : colors.text },
                  day.isToday && { fontWeight: '700' },
                ]}
              >
                {day.dayNum}
              </Text>
              <View style={miniStyles.dotsRow}>
                {day.hasActive && <View style={[miniStyles.dot, { backgroundColor: colors.warning }]} />}
                {day.hasPredicted && <View style={[miniStyles.dot, { backgroundColor: colors.accent }]} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const miniStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 11,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayText: {
    fontSize: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function HeatsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [allHeats, setAllHeats] = useState<HeatWithDog[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [heatRows, dogRows] = await Promise.all([
        getAllRows<HeatCycle>('heat_cycles'),
        getAllRows<Dog>('dogs'),
      ]);
      setDogs(dogRows);

      const dogMap = new Map<number, string>();
      for (const d of dogRows) {
        dogMap.set(d.id, d.name);
      }

      const enriched: HeatWithDog[] = heatRows.map((h) => ({
        ...h,
        dog_name: dogMap.get(h.dog_id) ?? `Dog #${h.dog_id}`,
      }));
      setAllHeats(enriched);
    } catch (err) {
      console.error('Failed to load heats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Split into active / past
  const activeHeats = allHeats.filter((h) => !h.end_date);
  const pastHeats = allHeats.filter((h) => !!h.end_date);

  // Filter by search query
  const filteredActive = searchQuery.trim()
    ? activeHeats.filter((h) => h.dog_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeHeats;
  const filteredPast = searchQuery.trim()
    ? pastHeats.filter((h) => h.dog_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : pastHeats;

  // ── Predictions ──────────────────────────────────────────────────────────

  const predictions = useMemo<CyclePrediction[]>(() => {
    // Build predictions per female dog from heat history
    const femaleDogs = dogs.filter((d) => d.sex === 'female');
    const result: CyclePrediction[] = [];

    for (const dog of femaleDogs) {
      const dogHeats = allHeats
        .filter((h) => h.dog_id === dog.id)
        .sort((a, b) => a.start_date.localeCompare(b.start_date));

      if (dogHeats.length < 2) continue; // need at least 2 cycles

      const gaps: number[] = [];
      for (let i = 1; i < dogHeats.length; i++) {
        gaps.push(daysBetween(dogHeats[i - 1].start_date, dogHeats[i].start_date));
      }

      const avgCycle = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
      const lastStart = dogHeats[dogHeats.length - 1].start_date;
      const nextExpected = addDays(lastStart, avgCycle);

      result.push({
        dog_id: dog.id,
        dog_name: dog.name,
        avg_cycle_days: avgCycle,
        last_start: lastStart,
        next_expected: nextExpected,
      });
    }

    return result;
  }, [dogs, allHeats]);

  const predictionMap = useMemo(() => {
    const m = new Map<number, CyclePrediction>();
    for (const p of predictions) {
      m.set(p.dog_id, p);
    }
    return m;
  }, [predictions]);

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderHeatCard = (heat: HeatWithDog) => {
    const isActive = !heat.end_date;
    const daysSince = daysBetween(heat.start_date, todayStr());
    const pred = predictionMap.get(heat.dog_id);

    return (
      <Card
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/heat/${heat.id}`)}
      >
        <View style={styles.cardInner}>
          <View style={styles.cardLeft}>
            <Text variant="titleMedium" style={[styles.dogName, { color: colors.text }]}>
              {heat.dog_name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              Started {heat.start_date}
            </Text>
            {isActive && (
              <Text variant="bodySmall" style={{ color: colors.warning, marginTop: 2 }}>
                Day {daysSince} of cycle
              </Text>
            )}
            {!isActive && heat.end_date && (
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                {daysBetween(heat.start_date, heat.end_date)} days · Ended {heat.end_date}
              </Text>
            )}
            {pred && (
              <Text variant="bodySmall" style={{ color: colors.accent, marginTop: 2 }}>
                Avg cycle: {pred.avg_cycle_days} days · Next expected ~{pred.next_expected}
              </Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <Chip
              mode="flat"
              compact
              style={[
                styles.statusChip,
                {
                  backgroundColor: isActive
                    ? colors.warning + '20'
                    : colors.textSecondary + '20',
                },
              ]}
              textStyle={{
                color: isActive ? colors.warning : colors.textSecondary,
                fontSize: 11,
              }}
            >
              {isActive ? 'Active' : 'Ended'}
            </Chip>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={colors.textSecondary}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Card>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>
      <Chip compact mode="flat" style={{ backgroundColor: colors.accent + '20' }} textStyle={{ color: colors.accent, fontSize: 11 }}>
        {count}
      </Chip>
    </View>
  );

  // ── Flattened data for FlatList ──────────────────────────────────────────

  const listData = useMemo(() => {
    const sections: { type: 'section' | 'heat' | 'noactive' | 'calendar'; title?: string; heat?: HeatWithDog }[] = [];

    // Calendar
    sections.push({ type: 'calendar' });

    // Active section
    if (filteredActive.length > 0) {
      sections.push({ type: 'section', title: 'Active' });
      for (const h of filteredActive) {
        sections.push({ type: 'heat', heat: h });
      }
    } else if (!searchQuery.trim() || activeHeats.length > 0) {
      sections.push({ type: 'noactive' });
    }

    // Past section
    if (filteredPast.length > 0) {
      sections.push({ type: 'section', title: 'Past' });
      for (const h of filteredPast) {
        sections.push({ type: 'heat', heat: h });
      }
    }

    return sections;
  }, [filteredActive, filteredPast, searchQuery, activeHeats.length]);

  const renderItem = ({ item }: { item: typeof listData[number] }) => {
    if (item.type === 'calendar') {
      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <MiniCalendar
            activeHeats={activeHeats}
            predictions={predictions}
            colors={colors}
          />
        </View>
      );
    }
    if (item.type === 'section') {
      const count = item.title === 'Active' ? filteredActive.length : filteredPast.length;
      return (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          {renderSectionHeader(item.title!, count)}
        </View>
      );
    }
    if (item.type === 'noactive') {
      return (
        <Card
          style={[styles.noActiveCard, { backgroundColor: colors.surface, borderColor: colors.warning + '40' }]}
        >
          <View style={styles.noActiveInner}>
            <MaterialCommunityIcons name="thermometer-low" size={32} color={colors.warning} />
            <Text style={[styles.noActiveText, { color: colors.textSecondary }]}>
              No active heat cycles
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
              Tap + to log a new heat cycle for a female dog.
            </Text>
          </View>
        </Card>
      );
    }
    if (item.type === 'heat' && item.heat) {
      return (
        <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
          {renderHeatCard(item.heat)}
        </View>
      );
    }
    return null;
  };

  // ── Empty state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Surface>
    );
  }

  if (allHeats.length === 0) {
    return (
      <Surface style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="thermometer"
            size={64}
            color={colors.textSecondary}
          />
          <Text
            variant="bodyLarge"
            style={[styles.emptyText, { color: colors.textSecondary }]}
          >
            No heat cycles recorded yet.
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap + to log your first heat cycle.
          </Text>
        </View>
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: colors.accent }]}
          color="#FFFFFF"
          onPress={() => router.push('/heat/add')}
        />
      </Surface>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={listData}
        keyExtractor={(item, idx) => {
          if (item.type === 'heat' && item.heat) return item.heat.id.toString();
          return `${item.type}-${idx}`;
        }}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Searchbar
              placeholder="Search heats by dog name..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
              iconColor={colors.textSecondary}
              inputStyle={{ color: colors.text }}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.accent }]}
        color="#FFFFFF"
        onPress={() => router.push('/heat/add')}
      />
    </Surface>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  cardLeft: {
    flex: 1,
  },
  cardRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  dogName: {
    fontWeight: '600',
  },
  statusChip: {
    height: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  noActiveCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  noActiveInner: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  noActiveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 16,
  },
  searchBar: {
    borderRadius: 12,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
});
