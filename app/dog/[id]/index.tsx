import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Switch,
  IconButton,
  Surface,
  Divider,
  ActivityIndicator,
  TextInput,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import {
  getRowsByField,
  updateRow,
  deleteRow,
  getAllRows,
  insertRow,
} from '../../../src/db/database';
import type { Dog, HeatCycle, Litter, HealthClearance } from '../../../src/db/schema';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function DogDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [dog, setDog] = useState<Dog | null>(null);
  const [heatCount, setHeatCount] = useState(0);
  const [litterCount, setLitterCount] = useState(0);
  const [healthClearances, setHealthClearances] = useState<HealthClearance[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline add health clearance form
  const [showAddClearance, setShowAddClearance] = useState(false);
  const [hcTestType, setHcTestType] = useState('OFA');
  const [hcTestDate, setHcTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [hcResult, setHcResult] = useState('');
  const [hcExpiryDate, setHcExpiryDate] = useState('');
  const [hcNotes, setHcNotes] = useState('');
  const [hcSaving, setHcSaving] = useState(false);

  const TEST_TYPES = ['OFA', 'CERF', 'Cardiac', 'Genetic', 'Other'];

  const loadDog = useCallback(async () => {
    if (!id) return;
    try {
      const dogs = await getRowsByField<Dog>('dogs', 'id', [Number(id)]);
      if (dogs.length > 0) {
        setDog(dogs[0]);
      }

      // Stats
      const heats = await getRowsByField<HeatCycle>('heat_cycles', 'dog_id', [Number(id)]);
      setHeatCount(heats.length);

      const allLitters = await getAllRows<Litter>('litters');
      const damLitters = allLitters.filter((l: Litter) => l.dam_id === Number(id));
      setLitterCount(damLitters.length);

      // Health clearances
      const clearances = await getRowsByField<HealthClearance>('health_clearances', 'dog_id', [Number(id)]);
      setHealthClearances(clearances);
    } catch (err) {
      console.error('Failed to load dog:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) loadDog();
    }, [id, loadDog]),
  );

  const handleToggleActive = async () => {
    if (!dog) return;
    const newActive = dog.is_active ? 0 : 1;
    try {
      await updateRow('dogs', dog.id, { is_active: newActive } as Record<string, unknown>);
      setDog({ ...dog, is_active: newActive });
    } catch (err) {
      console.error('Failed to toggle active:', err);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Dog',
      `Are you sure you want to delete ${dog?.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!dog) return;
            try {
              await deleteRow('dogs', dog.id);
              router.back();
            } catch (err) {
              console.error('Failed to delete dog:', err);
              Alert.alert('Error', 'Failed to delete dog. Please try again.');
            }
          },
        },
      ],
    );
  };

  // ── Health Clearance handlers ────────────────────────────────────────

  const handleAddClearance = async () => {
    if (!id) return;
    setHcSaving(true);
    try {
      await insertRow('health_clearances', {
        dog_id: Number(id),
        test_type: hcTestType,
        test_date: hcTestDate.trim() || null,
        result: hcResult.trim() || null,
        expiry_date: hcExpiryDate.trim() || null,
        notes: hcNotes.trim() || null,
      } as Record<string, unknown>);
      // Reset
      setHcTestType('OFA');
      setHcTestDate(new Date().toISOString().slice(0, 10));
      setHcResult('');
      setHcExpiryDate('');
      setHcNotes('');
      setShowAddClearance(false);
      // Reload
      const clearances = await getRowsByField<HealthClearance>('health_clearances', 'dog_id', [Number(id)]);
      setHealthClearances(clearances);
    } catch (err) {
      console.error('Failed to add clearance:', err);
    } finally {
      setHcSaving(false);
    }
  };

  const handleDeleteClearance = (clearanceId: number) => {
    Alert.alert('Delete Clearance', 'Remove this health clearance?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteRow('health_clearances', clearanceId);
          const rows = await getRowsByField<HealthClearance>('health_clearances', 'dog_id', [Number(id)]);
          setHealthClearances(rows);
        },
      },
    ]);
  };

  const isExpiringSoon = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  };

  const isExpired = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  if (loading) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Surface>
    );
  }

  if (!dog) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="dog-side" size={64} color={colors.textSecondary} />
        <Text variant="bodyLarge" style={{ color: colors.textSecondary, marginTop: 16 }}>
          Dog not found.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo */}
        <View
          style={[
            styles.photoContainer,
            { backgroundColor: colors.primary + '10' },
          ]}
        >
          {dog.photo_uri ? (
            <Image source={{ uri: dog.photo_uri }} style={styles.photo} />
          ) : (
            <MaterialCommunityIcons
              name="dog-side"
              size={80}
              color={colors.primary}
            />
          )}
        </View>

        {/* Name & Sex */}
        <View style={styles.nameRow}>
          <Text
            variant="headlineMedium"
            style={[styles.dogName, { color: colors.text }]}
          >
            {dog.name}
          </Text>
          <Text style={[styles.sexBadge, { color: dog.sex === 'male' ? '#3B82F6' : '#EC4899' }]}>
            {dog.sex === 'male' ? '\u2642' : '\u2640'}{' '}
            {dog.sex === 'male' ? 'Male' : 'Female'}
          </Text>
        </View>

        {/* Stats cards */}
        <View style={styles.statsRow}>
          <Card
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.statInner}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>
                {heatCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Heat Cycle{heatCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>
          <Card
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.statInner}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>
                {litterCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Litter{litterCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>
        </View>

        {/* Details Card */}
        <Card
          style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Card.Content>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="palette" size={20} color={colors.textSecondary} />
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Color</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {dog.color || '—'}
                </Text>
              </View>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="cake-variant" size={20} color={colors.textSecondary} />
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Birthdate</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {dog.birthdate || '—'}
                </Text>
              </View>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="barcode" size={20} color={colors.textSecondary} />
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Microchip</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {dog.microchip || '—'}
                </Text>
              </View>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="certificate" size={20} color={colors.textSecondary} />
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Registration</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {dog.registration || '—'}
                </Text>
              </View>
            </View>

            {dog.notes ? (
              <>
                <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="note-text" size={20} color={colors.textSecondary} />
                  <View style={styles.detailTextCol}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Notes</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{dog.notes}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </Card.Content>
        </Card>

        {/* ═══════════════════════════════════════════════════════════
            HEALTH CLEARANCES
            ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="shield-check" size={20} color={colors.text} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Health Clearances
          </Text>
          <Chip
            mode="flat"
            compact
            style={[styles.countChip, { backgroundColor: colors.border }]}
            textStyle={{ color: colors.textSecondary, fontSize: 11 }}
          >
            {healthClearances.length}
          </Chip>
        </View>

        {healthClearances.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.emptyInner}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={28} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
                No health clearances recorded
              </Text>
            </View>
          </Card>
        ) : (
          healthClearances.map((hc) => {
            const warning = isExpired(hc.expiry_date);
            const soon = isExpiringSoon(hc.expiry_date);
            return (
              <Card
                key={hc.id}
                style={[
                  styles.clearanceCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: warning ? colors.error + '40' : soon ? colors.warning + '40' : colors.border,
                  },
                ]}
              >
                <View style={styles.clearanceRow}>
                  <View style={styles.clearanceInfo}>
                    <View style={styles.clearanceTopRow}>
                      <Chip
                        mode="flat"
                        compact
                        style={[styles.clearanceType, { backgroundColor: colors.accent + '20' }]}
                        textStyle={{ color: colors.accent, fontSize: 11, fontWeight: '600' }}
                      >
                        {hc.test_type}
                      </Chip>
                      {warning && (
                        <Chip
                          mode="flat"
                          compact
                          style={{ backgroundColor: colors.error + '20' }}
                          textStyle={{ color: colors.error, fontSize: 10, fontWeight: '600' }}
                        >
                          Expired
                        </Chip>
                      )}
                      {soon && !warning && (
                        <Chip
                          mode="flat"
                          compact
                          style={{ backgroundColor: colors.warning + '20' }}
                          textStyle={{ color: colors.warning, fontSize: 10, fontWeight: '600' }}
                        >
                          Expiring Soon
                        </Chip>
                      )}
                    </View>
                    {hc.result && (
                      <Text variant="bodyMedium" style={{ color: colors.text, marginTop: 2 }}>
                        Result: {hc.result}
                      </Text>
                    )}
                    <View style={styles.clearanceDates}>
                      {hc.test_date && (
                        <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                          Tested: {formatDate(hc.test_date)}
                        </Text>
                      )}
                      {hc.expiry_date && (
                        <Text
                          variant="bodySmall"
                          style={{ color: warning ? colors.error : soon ? colors.warning : colors.textSecondary }}
                        >
                          Expires: {formatDate(hc.expiry_date)}
                        </Text>
                      )}
                    </View>
                    {hc.notes && (
                      <Text variant="bodySmall" style={{ color: colors.text, marginTop: 2 }}>
                        {hc.notes}
                      </Text>
                    )}
                  </View>
                  <IconButton
                    icon="delete-outline"
                    size={18}
                    iconColor={colors.error}
                    onPress={() => handleDeleteClearance(hc.id)}
                  />
                </View>
              </Card>
            );
          })
        )}

        {/* Add Clearance Form */}
        {!showAddClearance ? (
          <Button
            mode="outlined"
            onPress={() => setShowAddClearance(true)}
            style={[styles.addBtn, { borderColor: colors.accent }]}
            textColor={colors.accent}
            icon="plus"
          >
            Add Clearance
          </Button>
        ) : (
          <Card style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Card.Content>
              <Text variant="labelMedium" style={{ color: colors.text, marginBottom: 8 }}>
                New Health Clearance
              </Text>

              {/* Test Type Picker */}
              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>Test Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                <View style={styles.typeRow}>
                  {TEST_TYPES.map((t) => (
                    <Chip
                      key={t}
                      mode={hcTestType === t ? 'flat' : 'outlined'}
                      selected={hcTestType === t}
                      onPress={() => setHcTestType(t)}
                      compact
                      style={[
                        styles.typeChip,
                        hcTestType === t && { backgroundColor: colors.accent + '30' },
                      ]}
                      textStyle={{
                        color: hcTestType === t ? colors.accent : colors.text,
                        fontSize: 12,
                      }}
                    >
                      {t}
                    </Chip>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.formRow}>
                <TextInput
                  mode="outlined"
                  label="Test Date"
                  value={hcTestDate}
                  onChangeText={setHcTestDate}
                  style={[styles.formInput, { flex: 1 }]}
                  outlineStyle={{ borderColor: colors.border }}
                  activeOutlineColor={colors.accent}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Expiry Date"
                  value={hcExpiryDate}
                  onChangeText={setHcExpiryDate}
                  style={[styles.formInput, { flex: 1 }]}
                  outlineStyle={{ borderColor: colors.border }}
                  activeOutlineColor={colors.accent}
                  dense
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <TextInput
                mode="outlined"
                label="Result"
                value={hcResult}
                onChangeText={setHcResult}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
                dense
                placeholder="e.g. Normal, Fair, Good, Excellent"
              />

              <TextInput
                mode="outlined"
                label="Notes (optional)"
                value={hcNotes}
                onChangeText={setHcNotes}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
                dense
              />

              <View style={styles.formBtnRow}>
                <Button
                  mode="text"
                  onPress={() => setShowAddClearance(false)}
                  textColor={colors.textSecondary}
                  compact
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddClearance}
                  loading={hcSaving}
                  disabled={hcSaving}
                  style={{ backgroundColor: colors.accent }}
                  compact
                  icon="check"
                >
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Active toggle */}
        <Card
          style={[styles.toggleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Card.Content>
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  {dog.is_active ? 'Active' : 'Inactive'}
                </Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                  {dog.is_active
                    ? 'Dog is currently active in your program'
                    : 'Dog is archived / not currently active'}
                </Text>
              </View>
              <Switch
                value={!!dog.is_active}
                onValueChange={handleToggleActive}
                color={colors.accent}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Button
            mode="contained"
            onPress={() => router.push(`/dog/${dog.id}/edit`)}
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
            contentStyle={{ paddingVertical: 6 }}
            icon="pencil"
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            contentStyle={{ paddingVertical: 6 }}
            textColor={colors.error}
            icon="delete"
          >
            Delete
          </Button>
        </View>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },
  photoContainer: {
    width: '100%', height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photo: { width: '100%', height: 220, resizeMode: 'cover' },
  nameRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingTop: 16, paddingHorizontal: 16,
  },
  dogName: { fontWeight: '700' },
  sexBadge: { fontSize: 18, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12 },
  statInner: { alignItems: 'center', paddingVertical: 16 },
  statNumber: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 13, marginTop: 4 },
  detailCard: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderRadius: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  detailTextCol: { flex: 1 },
  detailLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 16, marginTop: 2 },
  divider: { marginVertical: 2 },
  toggleCard: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderRadius: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
  toggleSub: { fontSize: 13, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 20 },
  editBtn: { flex: 1, borderRadius: 10 },
  deleteBtn: { flex: 1, borderRadius: 10 },
  // Health Clearances
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginBottom: 10, marginHorizontal: 16,
  },
  sectionTitle: { fontWeight: '600', flex: 1 },
  countChip: { height: 22 },
  emptyCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  emptyInner: { alignItems: 'center', padding: 16 },
  clearanceCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
  clearanceRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 10 },
  clearanceInfo: { flex: 1, gap: 2 },
  clearanceTopRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  clearanceType: { height: 22 },
  clearanceDates: { flexDirection: 'row', gap: 12, marginTop: 2 },
  addBtn: { marginHorizontal: 16, borderRadius: 10, marginBottom: 16 },
  formCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 12, marginBottom: 16 },
  miniLabel: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  typeScroll: { marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 6 },
  typeChip: { marginBottom: 0 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  formInput: { marginBottom: 8 },
  formBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});
