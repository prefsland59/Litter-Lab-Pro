import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import {
  getRowsByField,
  deleteRow,
  getAllRows,
} from '../../../src/db/database';
import type { Buyer, Placement, Puppy } from '../../../src/db/schema';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  Reserved: '#3B82F6',
  'Deposit Paid': '#D97706',
  'Paid in Full': '#16A34A',
  'Picked Up': '#8B5CF6',
};

export default function BuyerDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [placements, setPlacements] = useState<(Placement & { puppy_name: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const buyers = await getRowsByField<Buyer>('buyers', 'id', [Number(id)]);
      if (buyers.length === 0) { setLoading(false); return; }
      setBuyer(buyers[0]);

      const allPlacements = await getAllRows<Placement>('placements');
      const buyerPlacements = allPlacements.filter(
        (p: Placement) => p.buyer_id === Number(id)
      );

      const allPuppies = await getAllRows<Puppy>('puppies');
      const puppyMap = new Map<number, string>();
      allPuppies.forEach((p: Puppy) => puppyMap.set(p.id, p.name_or_id || `Puppy #${p.id}`));

      setPlacements(
        buyerPlacements.map((p: Placement) => ({
          ...p,
          puppy_name: puppyMap.get(p.puppy_id) || `Puppy #${p.puppy_id}`,
        }))
      );
    } catch (err) {
      console.error('Failed to load buyer:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id, loadData]),
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Buyer',
      `Are you sure you want to delete ${buyer?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!buyer) return;
            await deleteRow('buyers', buyer.id);
            router.back();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Surface>
    );
  }

  if (!buyer) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="account-off" size={64} color={colors.textSecondary} />
        <Text variant="bodyLarge" style={{ color: colors.textSecondary, marginTop: 16 }}>
          Buyer not found.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.iconRow}>
          <MaterialCommunityIcons name="account-circle" size={72} color={colors.accent} />
        </View>
        <Text variant="headlineMedium" style={[styles.name, { color: colors.text }]}>
          {buyer.name}
        </Text>

        {/* Contact Card */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
              Contact Info
            </Text>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="email" size={18} color={colors.textSecondary} />
              <Text style={{ color: buyer.email ? colors.text : colors.textSecondary }}>
                {buyer.email || 'No email'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="phone" size={18} color={colors.textSecondary} />
              <Text style={{ color: buyer.phone ? colors.text : colors.textSecondary }}>
                {buyer.phone || 'No phone'}
              </Text>
            </View>

            {buyer.notes ? (
              <>
                <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="note-text" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.text, flex: 1 }}>{buyer.notes}</Text>
                </View>
              </>
            ) : null}
          </Card.Content>
        </Card>

        {/* Placements */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="paw" size={20} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitleText, { color: colors.text }]}>
            Placements
          </Text>
        </View>

        {placements.length === 0 ? (
          <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="paw-off" size={28} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                No puppies assigned yet
              </Text>
            </View>
          </Card>
        ) : (
          placements.map((p) => {
            const statusColor = STATUS_COLORS[p.status] || colors.textSecondary;
            return (
              <Card
                key={p.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/puppy/${p.puppy_id}`)}
              >
                <View style={styles.placementRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.puppyName, { color: colors.text }]}>
                      {p.puppy_name}
                    </Text>
                    <View style={styles.placementMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{p.status}</Text>
                      </View>
                      {p.price != null && (
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          ${p.price}
                        </Text>
                      )}
                      {p.pickup_date && (
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {formatDate(p.pickup_date)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              </Card>
            );
          })
        )}

        {/* Delete */}
        <Button
          mode="outlined"
          onPress={handleDelete}
          style={[styles.deleteBtn, { borderColor: colors.error }]}
          textColor={colors.error}
          icon="delete"
        >
          Delete Buyer
        </Button>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  iconRow: { alignItems: 'center', marginBottom: 4 },
  name: { fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  card: { borderWidth: 1, borderRadius: 12, marginBottom: 14 },
  sectionTitle: { fontWeight: '600', marginBottom: 10 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  divider: { marginVertical: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitleText: { fontWeight: '600' },
  emptyInner: { alignItems: 'center', padding: 20 },
  placementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  puppyName: { fontWeight: '600', fontSize: 15 },
  placementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    borderRadius: 10,
    marginTop: 10,
  },
});
