import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  TextInput,
  Chip,
  IconButton,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { getAllRows } from '../../src/db/database';
import type { Dog } from '../../src/db/schema';

export default function DogsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDogs = useCallback(async () => {
    try {
      const rows = await getAllRows<Dog>('dogs');
      setDogs(rows);
    } catch (err) {
      console.error('Failed to load dogs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDogs();
  }, [loadDogs]);

  useFocusEffect(
    useCallback(() => {
      loadDogs();
    }, [loadDogs]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDogs();
    setRefreshing(false);
  }, [loadDogs]);

  const filteredDogs = dogs.filter((dog) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      dog.name.toLowerCase().includes(q) ||
      (dog.color && dog.color.toLowerCase().includes(q)) ||
      (dog.microchip && dog.microchip.toLowerCase().includes(q))
    );
  });

  const handleDogPress = (dog: Dog) => {
    router.push(`/dog/${dog.id}`);
  };

  const renderDogCard = ({ item: dog }: { item: Dog }) => (
    <Card
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleDogPress(dog)}
    >
      <View style={styles.cardInner}>
        {/* Photo thumbnail or placeholder */}
        <View
          style={[
            styles.photoContainer,
            { backgroundColor: colors.primary + '15' },
          ]}
        >
          {dog.photo_uri ? (
            <Image source={{ uri: dog.photo_uri }} style={styles.photo} />
          ) : (
            <MaterialCommunityIcons
              name="dog-side"
              size={36}
              color={colors.primary}
            />
          )}
        </View>

        {/* Info */}
        <View style={styles.dogInfo}>
          <View style={styles.nameRow}>
            <Text
              variant="titleMedium"
              style={[styles.dogName, { color: colors.text }]}
              numberOfLines={1}
            >
              {dog.name}
            </Text>
            <Text style={[styles.sexIcon, { color: dog.sex === 'male' ? '#3B82F6' : '#EC4899' }]}>
              {dog.sex === 'male' ? '\u2642' : '\u2640'}
            </Text>
          </View>

          {dog.color ? (
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              {dog.color}
            </Text>
          ) : null}

          <View style={styles.chipRow}>
            {dog.is_active ? (
              <Chip
                mode="flat"
                compact
                style={[styles.activeChip, { backgroundColor: colors.success + '20' }]}
                textStyle={{ color: colors.success, fontSize: 11 }}
              >
                Active
              </Chip>
            ) : (
              <Chip
                mode="flat"
                compact
                style={[styles.inactiveChip, { backgroundColor: colors.textSecondary + '20' }]}
                textStyle={{ color: colors.textSecondary, fontSize: 11 }}
              >
                Inactive
              </Chip>
            )}
          </View>
        </View>

        {/* Chevron */}
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={colors.textSecondary}
        />
      </View>
    </Card>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="dog-side"
          size={64}
          color={colors.textSecondary}
        />
        <Text
          variant="bodyLarge"
          style={[styles.emptyText, { color: colors.textSecondary }]}
        >
          No dogs yet. Tap + to add your first dog.
        </Text>
      </View>
    );
  };

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <TextInput
          mode="outlined"
          placeholder="Search by name, color, or microchip..."
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
        data={filteredDogs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDogCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          filteredDogs.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.accent }]}
        color="#FFFFFF"
        onPress={() => router.push('/dog/add')}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInput: {
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  emptyList: {
    flexGrow: 1,
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
  photoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  dogInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dogName: {
    fontWeight: '600',
    flexShrink: 1,
  },
  sexIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  activeChip: {
    height: 24,
  },
  inactiveChip: {
    height: 24,
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
});
