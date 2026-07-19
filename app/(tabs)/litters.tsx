import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  Chip,
  Surface,
  Searchbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { getAllRows } from '../../src/db/database';
import type { Dog, Litter } from '../../src/db/schema';

const ACTIVE_WINDOW_WEEKS = 12;

function isLitterActive(litter: Litter): boolean {
  if (!litter.whelping_date) return true;
  const whelpDate = new Date(litter.whelping_date);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACTIVE_WINDOW_WEEKS * 7);
  return whelpDate >= cutoff;
}

export default function LittersScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [litters, setLitters] = useState<Litter[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [allLitters, allDogs] = await Promise.all([
        getAllRows<Litter>('litters'),
        getAllRows<Dog>('dogs'),
      ]);
      setLitters(allLitters);
      setDogs(allDogs);
    } catch (err) {
      console.error('Failed to load litters:', err);
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

  const getDogName = (dogId: number | null): string => {
    if (!dogId) return 'External Stud';
    const dog = dogs.find((d) => d.id === dogId);
    return dog ? dog.name : 'Unknown Dog';
  };

  const activeLitters = litters.filter(isLitterActive);
  const pastLitters = litters.filter((l) => !isLitterActive(l));

  // Filter by search
  const filteredActive = searchQuery.trim()
    ? activeLitters.filter((l) => getDogName(l.dam_id).toLowerCase().includes(searchQuery.toLowerCase()))
    : activeLitters;
  const filteredPast = searchQuery.trim()
    ? pastLitters.filter((l) => getDogName(l.dam_id).toLowerCase().includes(searchQuery.toLowerCase()))
    : pastLitters;

  // Year/month grouping for past litters
  const pastGroups = useMemo(() => {
    const groups: { label: string; litters: Litter[] }[] = [];
    // Sort past litters by whelping_date descending
    const sorted = [...filteredPast].sort((a, b) => {
      const da = a.whelping_date || '0000-00-00';
      const db = b.whelping_date || '0000-00-00';
      return db.localeCompare(da);
    });

    for (const l of sorted) {
      const date = l.whelping_date ? new Date(l.whelping_date) : new Date('0000-01-01');
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, litters: [] };
        groups.push(group);
      }
      group.litters.push(l);
    }
    return groups;
  }, [filteredPast]);

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Expected';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (litter: Litter): { label: string; color: string } => {
    if (!litter.whelping_date) {
      return { label: 'Expected', color: colors.warning };
    }
    if (isLitterActive(litter)) {
      return { label: 'Active', color: colors.success };
    }
    return { label: 'Past', color: colors.textSecondary };
  };

  const getPuppyCount = (litter: Litter): string => {
    if (litter.total_puppies == null) return '—';
    const alive = litter.total_puppies - (litter.stillborns || 0);
    return `${alive} puppy${alive !== 1 ? 'ies' : ''}`;
  };

  const renderLitterCard = (litter: Litter) => {
    const status = getStatusBadge(litter);
    return (
      <Card
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/litter/${litter.id}`)}
      >
        <View style={styles.cardInner}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.accent + '15' },
            ]}
          >
            <MaterialCommunityIcons
              name="home-heart"
              size={32}
              color={colors.accent}
            />
          </View>

          <View style={styles.litterInfo}>
            <View style={styles.nameRow}>
              <Text
                variant="titleMedium"
                style={[styles.damName, { color: colors.text }]}
                numberOfLines={1}
              >
                {getDogName(litter.dam_id)}
              </Text>
              <Chip
                mode="flat"
                compact
                style={[styles.statusChip, { backgroundColor: status.color + '20' }]}
                textStyle={{ color: status.color, fontSize: 11 }}
              >
                {status.label}
              </Chip>
            </View>

            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="calendar"
                size={14}
                color={colors.textSecondary}
              />
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                {litter.whelping_date ? formatDate(litter.whelping_date) : 'Whelping: Expected'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="dog-side"
                size={14}
                color={colors.textSecondary}
              />
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                {getPuppyCount(litter)}
                {litter.stillborns ? ` (${litter.stillborns} stillborn)` : ''}
              </Text>
            </View>
          </View>

          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.textSecondary}
          />
        </View>
      </Card>
    );
  };

  const sectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <Chip
        mode="flat"
        compact
        style={[styles.countChip, { backgroundColor: colors.border }]}
        textStyle={{ color: colors.textSecondary, fontSize: 11 }}
      >
        {count}
      </Chip>
    </View>
  );

  // Build combined sections list
  type Section =
    | { type: 'header'; title: string; count: number }
    | { type: 'litter'; litter: Litter }
    | { type: 'summary' };

  const sections: Section[] = [];

  // Summary
  sections.push({ type: 'summary' });

  if (filteredActive.length > 0) {
    sections.push({ type: 'header', title: 'Active', count: filteredActive.length });
    for (const l of filteredActive) {
      sections.push({ type: 'litter', litter: l });
    }
  }
  if (filteredPast.length > 0) {
    sections.push({ type: 'header', title: 'Past', count: filteredPast.length });
    for (const group of pastGroups) {
      // Group header
      sections.push({ type: 'header', title: group.label, count: group.litters.length });
      for (const l of group.litters) {
        sections.push({ type: 'litter', litter: l });
      }
    }
  }

  const isEmpty = filteredActive.length === 0 && filteredPast.length === 0;

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sections}
        keyExtractor={(item, idx) => {
          if (item.type === 'litter') return `litter-${item.litter.id}`;
          if (item.type === 'summary') return 'summary';
          return `header-${item.title}-${idx}`;
        }}
        renderItem={({ item }) => {
          if (item.type === 'summary') {
            return (
              <View style={styles.summaryContainer}>
                <Searchbar
                  placeholder="Search litters by dam name..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  iconColor={colors.textSecondary}
                  inputStyle={{ color: colors.text }}
                  placeholderTextColor={colors.textSecondary}
                />
                <Card style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: colors.accent }]}>{litters.length}</Text>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
                    </View>
                    <View style={[styles.summaryDiv, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: colors.success }]}>{activeLitters.length}</Text>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Active</Text>
                    </View>
                    <View style={[styles.summaryDiv, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>{pastLitters.length}</Text>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Archived</Text>
                    </View>
                  </View>
                </Card>
              </View>
            );
          }
          if (item.type === 'header') {
            return sectionHeader(item.title, item.count);
          }
          return (
            <View style={{ marginBottom: 8 }}>
              {renderLitterCard(item.litter)}
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="home-heart"
                size={64}
                color={colors.textSecondary}
              />
              <Text
                variant="bodyLarge"
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                {searchQuery.trim()
                  ? 'No litters match your search.'
                  : 'No litters yet. Create your first litter to get started.'}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={
          isEmpty ? styles.emptyList : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.accent }]}
        color="#FFFFFF"
        onPress={() => router.push('/litter/add')}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 80 },
  emptyList: { flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countChip: { height: 22 },
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
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  litterInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  damName: { fontWeight: '600', flexShrink: 1 },
  statusChip: { height: 24 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 16,
  },
  // ── Summary ───────────────────────────────────────────────────────────
  summaryContainer: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBar: {
    borderRadius: 12,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
    marginBottom: 10,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryDiv: {
    width: 1,
    height: 30,
  },
});
