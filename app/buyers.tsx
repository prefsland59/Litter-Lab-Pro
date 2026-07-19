import React, { useCallback, useState } from 'react';
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
  TextInput,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../src/theme/ThemeContext';
import { getAllRows } from '../src/db/database';
import type { Buyer } from '../src/db/schema';

export default function BuyersScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBuyers = useCallback(async () => {
    try {
      const rows = await getAllRows<Buyer>('buyers');
      setBuyers(rows);
    } catch (err) {
      console.error('Failed to load buyers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBuyers();
    }, [loadBuyers]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBuyers();
    setRefreshing(false);
  }, [loadBuyers]);

  const filteredBuyers = buyers.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.email && b.email.toLowerCase().includes(q)) ||
      (b.phone && b.phone.toLowerCase().includes(q))
    );
  });

  const renderCard = ({ item }: { item: Buyer }) => (
    <Card
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/buyer/${item.id}`)}
    >
      <View style={styles.cardInner}>
        <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
          <MaterialCommunityIcons name="account" size={28} color={colors.accent} />
        </View>
        <View style={styles.cardInfo}>
          <Text variant="titleSmall" style={[styles.buyerName, { color: colors.text }]}>
            {item.name}
          </Text>
          {item.email ? (
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              {item.email}
            </Text>
          ) : null}
          {item.phone ? (
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              {item.phone}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
      </View>
    </Card>
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
      <View style={styles.searchContainer}>
        <TextInput
          mode="outlined"
          placeholder="Search buyers..."
          value={search}
          onChangeText={setSearch}
          left={<TextInput.Icon icon="magnify" />}
          right={
            search.length > 0 ? (
              <TextInput.Icon icon="close" onPress={() => setSearch('')} />
            ) : null
          }
          style={styles.searchInput}
          outlineStyle={{ borderColor: colors.border }}
        />
      </View>

      <FlatList
        data={filteredBuyers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-group" size={56} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 15 }}>
              No buyers yet.
            </Text>
          </View>
        }
        contentContainerStyle={filteredBuyers.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.accent }]}
        color="#FFFFFF"
        onPress={() => router.push('/buyer/add')}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchInput: { marginBottom: 4 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
  emptyList: { flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 12 },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1, gap: 2 },
  buyerName: { fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  fab: { position: 'absolute', right: 20, bottom: 20, borderRadius: 16 },
});
