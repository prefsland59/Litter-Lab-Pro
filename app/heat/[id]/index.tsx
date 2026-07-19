import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Surface,
  Divider,
  TextInput,
  ActivityIndicator,
  IconButton,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import {
  getRowsByField,
  insertRow,
  updateRow,
  deleteRow,
  getAllRows,
} from '../../../src/db/database';
import type {
  HeatCycle,
  Dog,
  ProgesteroneTest,
  Breeding,
} from '../../../src/db/schema';
import {
  scheduleNotification,
  storeNotificationId,
} from '../../../src/utils/notifications';

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function HeatDetailScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [heat, setHeat] = useState<HeatCycle | null>(null);
  const [dog, setDog] = useState<Dog | null>(null);
  const [progTests, setProgTests] = useState<ProgesteroneTest[]>([]);
  const [breedings, setBreedings] = useState<Breeding[]>([]);
  const [maleDogs, setMaleDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Inline form state ───────────────────────────────────────────────────

  const [showProgForm, setShowProgForm] = useState(false);
  const [progDate, setProgDate] = useState(todayStr());
  const [progLevel, setProgLevel] = useState('');
  const [progUnit, setProgUnit] = useState('ng/mL');
  const [progNotes, setProgNotes] = useState('');
  const [savingProg, setSavingProg] = useState(false);

  const [showBreedingForm, setShowBreedingForm] = useState(false);
  const [breedingDate, setBreedingDate] = useState(todayStr());
  const [breedingMethod, setBreedingMethod] = useState<'natural' | 'AI'>('natural');
  const [studName, setStudName] = useState('');
  const [studDetails, setStudDetails] = useState('');
  const [breedingNotes, setBreedingNotes] = useState('');
  const [existingStudId, setExistingStudId] = useState<number | null>(null);
  const [savingBreeding, setSavingBreeding] = useState(false);

  const [progErrors, setProgErrors] = useState<{ date?: string; level?: string }>({});
  const [breedingErrors, setBreedingErrors] = useState<{ date?: string }>({});

  // ── Data loading ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [heats, tests, breedingsRows, allDogs] = await Promise.all([
        getRowsByField<HeatCycle>('heat_cycles', 'id', [Number(id)]),
        getRowsByField<ProgesteroneTest>('progesterone_tests', 'heat_cycle_id', [Number(id)]),
        getRowsByField<Breeding>('breedings', 'heat_cycle_id', [Number(id)]),
        getAllRows<Dog>('dogs'),
      ]);

      if (heats.length > 0) {
        const h = heats[0];
        setHeat(h);
        const d = allDogs.find((dg) => dg.id === h.dog_id) ?? null;
        setDog(d);
      }
      setProgTests(tests);
      setBreedings(breedingsRows);
      setMaleDogs(allDogs.filter((d) => d.sex === 'male'));
    } catch (err) {
      console.error('Failed to load heat detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id, loadData]),
  );

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleEndHeat = () => {
    if (!heat) return;
    Alert.alert(
      'End Heat Cycle',
      `Set the end date to today (${todayStr()})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Heat',
          onPress: async () => {
            try {
              await updateRow('heat_cycles', heat.id, {
                end_date: todayStr(),
              } as Record<string, unknown>);
              loadData();
            } catch (err) {
              console.error('Failed to end heat:', err);
              Alert.alert('Error', 'Failed to end heat cycle.');
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Heat Cycle',
      'Are you sure you want to delete this heat cycle and all associated progesterone tests and breeding records?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!heat) return;
            try {
              await deleteRow('heat_cycles', heat.id);
              router.back();
            } catch (err) {
              console.error('Failed to delete heat:', err);
              Alert.alert('Error', 'Failed to delete heat cycle.');
            }
          },
        },
      ],
    );
  };

  // ── Progesterone test actions ───────────────────────────────────────────

  const validateProg = () => {
    const errs: { date?: string; level?: string } = {};
    if (!progDate.trim()) errs.date = 'Date required';
    if (!progLevel.trim() || isNaN(Number(progLevel))) errs.level = 'Valid number required';
    setProgErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProg = async () => {
    if (!validateProg() || !heat) return;
    setSavingProg(true);
    try {
      await insertRow('progesterone_tests', {
        heat_cycle_id: heat.id,
        test_date: progDate.trim(),
        result_level: Number(progLevel),
        unit: progUnit,
        notes: progNotes.trim() || null,
      } as Record<string, unknown>);

      setProgDate(todayStr());
      setProgLevel('');
      setProgUnit('ng/mL');
      setProgNotes('');
      setShowProgForm(false);
      loadData();
    } catch (err) {
      console.error('Failed to save progesterone test:', err);
      Alert.alert('Error', 'Failed to save test.');
    } finally {
      setSavingProg(false);
    }
  };

  // ── Breeding actions ────────────────────────────────────────────────────

  const validateBreeding = () => {
    const errs: { date?: string } = {};
    if (!breedingDate.trim()) errs.date = 'Date required';
    setBreedingErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveBreeding = async () => {
    if (!validateBreeding() || !heat) return;
    setSavingBreeding(true);
    try {
      const finalStudName = existingStudId
        ? maleDogs.find((d) => d.id === existingStudId)?.name ?? studName
        : studName;

      await insertRow('breedings', {
        heat_cycle_id: heat.id,
        breeding_date: breedingDate.trim(),
        method: breedingMethod,
        stud_name: finalStudName.trim() || null,
        stud_details: studDetails.trim() || null,
        notes: breedingNotes.trim() || null,
      } as Record<string, unknown>);

      // Schedule whelping countdown notification (~60 days for French Bulldogs)
      const whelpingDateStr = addDays(breedingDate.trim(), 60);
      const whelpingDate = new Date(whelpingDateStr);
      // Schedule 3 days before estimated whelping
      whelpingDate.setDate(whelpingDate.getDate() - 3);

      if (whelpingDate.getTime() > Date.now()) {
        const damName = dog?.name ?? 'the dam';
        const notifId = await scheduleNotification(
          'Whelping Approaching',
          `Expected whelping for ${damName} is around ${whelpingDateStr}. Prepare for C-section scheduling.`,
          whelpingDate,
        );
        if (notifId) {
          // We store the notification without a breeding ID (since we don't have it yet after insert),
          // so we'll just use the heat cycle ID for tracking
          await storeNotificationId(`whelping_heat_${heat.id}`, notifId);
        }
      }

      setBreedingDate(todayStr());
      setBreedingMethod('natural');
      setStudName('');
      setStudDetails('');
      setBreedingNotes('');
      setExistingStudId(null);
      setShowBreedingForm(false);
      loadData();
    } catch (err) {
      console.error('Failed to save breeding:', err);
      Alert.alert('Error', 'Failed to save breeding record.');
    } finally {
      setSavingBreeding(false);
    }
  };

  // ── Loading / Not Found ─────────────────────────────────────────────────

  if (loading) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Surface>
    );
  }

  if (!heat) {
    return (
      <Surface style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="thermometer-off" size={64} color={colors.textSecondary} />
        <Text variant="bodyLarge" style={{ color: colors.textSecondary, marginTop: 16 }}>
          Heat cycle not found.
        </Text>
      </Surface>
    );
  }

  const isActive = !heat.end_date;
  const daysSince = daysBetween(heat.start_date, todayStr());
  const duration = heat.end_date ? daysBetween(heat.start_date, heat.end_date) : daysSince;
  const symptomsList = heat.symptoms ? heat.symptoms.split(',') : [];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header card */}
        <Card
          style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={[styles.dogName, { color: colors.text }]}>
                  {dog?.name ?? `Dog #${heat.dog_id}`}
                </Text>
                <View style={styles.badgeRow}>
                  <Chip
                    mode="flat"
                    compact
                    style={{
                      backgroundColor: isActive ? colors.warning + '20' : colors.textSecondary + '20',
                    }}
                    textStyle={{
                      color: isActive ? colors.warning : colors.textSecondary,
                      fontSize: 12,
                    }}
                  >
                    {isActive ? 'Active' : 'Ended'}
                  </Chip>
                  {dog && (
                    <Chip
                      mode="flat"
                      compact
                      style={{ backgroundColor: '#EC4899' + '20' }}
                      textStyle={{ color: '#EC4899', fontSize: 12 }}
                      icon={() => (
                        <MaterialCommunityIcons name="gender-female" size={12} color="#EC4899" />
                      )}
                    >
                      {dog.name}
                    </Chip>
                  )}
                </View>
              </View>
              <View style={styles.dayCounter}>
                <Text style={[styles.dayNumber, { color: colors.accent }]}>
                  {duration}
                </Text>
                <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                  {isActive ? 'days so far' : 'days total'}
                </Text>
              </View>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar-start" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                Started {heat.start_date}
              </Text>
            </View>
            {heat.end_date && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="calendar-end" size={18} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  Ended {heat.end_date}
                </Text>
              </View>
            )}

            {/* Symptoms */}
            {symptomsList.length > 0 && (
              <>
                <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SYMPTOMS</Text>
                <View style={styles.chipRow}>
                  {symptomsList.map((sym) => (
                    <Chip
                      key={sym}
                      mode="flat"
                      compact
                      style={{ backgroundColor: colors.warning + '20' }}
                      textStyle={{ color: colors.warning, fontSize: 12 }}
                    >
                      {sym.trim()}
                    </Chip>
                  ))}
                </View>
              </>
            )}

            {heat.notes ? (
              <>
                <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NOTES</Text>
                <Text style={{ color: colors.text }}>{heat.notes}</Text>
              </>
            ) : null}
          </Card.Content>
        </Card>

        {/* ── Progesterone Tests ─────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Progesterone Tests
          </Text>
          <Button
            mode="text"
            icon="plus"
            textColor={colors.accent}
            onPress={() => setShowProgForm(!showProgForm)}
          >
            Add Test
          </Button>
        </View>

        {showProgForm && (
          <Card
            style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Card.Content>
              <TextInput
                mode="outlined"
                label="Test Date * (YYYY-MM-DD)"
                value={progDate}
                onChangeText={setProgDate}
                error={!!progErrors.date}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
              />
              <TextInput
                mode="outlined"
                label="Result Level *"
                value={progLevel}
                onChangeText={setProgLevel}
                error={!!progErrors.level}
                keyboardType="decimal-pad"
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
                right={<TextInput.Affix text={progUnit} />}
              />
              <TextInput
                mode="outlined"
                label="Notes"
                value={progNotes}
                onChangeText={setProgNotes}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
              />
              <View style={styles.formActions}>
                <Button mode="text" textColor={colors.textSecondary} onPress={() => setShowProgForm(false)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveProg}
                  loading={savingProg}
                  style={{ backgroundColor: colors.accent, borderRadius: 8 }}
                >
                  Save Test
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {progTests.length === 0 ? (
          <Text style={[styles.emptySection, { color: colors.textSecondary }]}>
            No progesterone tests recorded yet.
          </Text>
        ) : (
          progTests.map((test) => (
            <Card
              key={test.id}
              style={[styles.subCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.subCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subCardTitle, { color: colors.text }]}>
                    {test.test_date}
                  </Text>
                  <Text style={{ color: colors.accent, fontWeight: '600' }}>
                    {test.result_level} {test.unit}
                  </Text>
                  {test.notes ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {test.notes}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ))
        )}

        {/* ── Breedings ──────────────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Breedings
          </Text>
          <Button
            mode="text"
            icon="plus"
            textColor={colors.accent}
            onPress={() => setShowBreedingForm(!showBreedingForm)}
          >
            Log Breeding
          </Button>
        </View>

        {showBreedingForm && (
          <Card
            style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Card.Content>
              <TextInput
                mode="outlined"
                label="Breeding Date * (YYYY-MM-DD)"
                value={breedingDate}
                onChangeText={setBreedingDate}
                error={!!breedingErrors.date}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Method</Text>
              <SegmentedButtons
                value={breedingMethod}
                onValueChange={(v) => setBreedingMethod(v as 'natural' | 'AI')}
                buttons={[
                  { value: 'natural', label: 'Natural', icon: 'heart' },
                  { value: 'AI', label: 'AI', icon: 'needle' },
                ]}
                style={styles.segmented}
              />

              {/* Existing stud picker */}
              {maleDogs.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Stud (existing dog)
                  </Text>
                  <View style={styles.chipRow}>
                    {maleDogs.map((m) => (
                      <Chip
                        key={m.id}
                        mode={existingStudId === m.id ? 'flat' : 'outlined'}
                        selected={existingStudId === m.id}
                        onPress={() => {
                          setExistingStudId(existingStudId === m.id ? null : m.id);
                          setStudName(existingStudId === m.id ? '' : m.name);
                        }}
                        compact
                        style={existingStudId === m.id ? { backgroundColor: colors.accent + '30' } : {}}
                        textStyle={{
                          color: existingStudId === m.id ? colors.accent : colors.textSecondary,
                        }}
                        icon={() => (
                          <MaterialCommunityIcons
                            name="gender-male"
                            size={14}
                            color={existingStudId === m.id ? colors.accent : colors.textSecondary}
                          />
                        )}
                      >
                        {m.name}
                      </Chip>
                    ))}
                  </View>
                </>
              )}

              <TextInput
                mode="outlined"
                label="Stud Name"
                value={studName}
                onChangeText={(t) => {
                  setStudName(t);
                  setExistingStudId(null);
                }}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
              />
              <TextInput
                mode="outlined"
                label="Stud Details"
                value={studDetails}
                onChangeText={setStudDetails}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
              />
              <TextInput
                mode="outlined"
                label="Notes"
                value={breedingNotes}
                onChangeText={setBreedingNotes}
                multiline
                numberOfLines={3}
                style={styles.formInput}
                outlineStyle={{ borderColor: colors.border }}
              />
              <View style={styles.formActions}>
                <Button mode="text" textColor={colors.textSecondary} onPress={() => setShowBreedingForm(false)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveBreeding}
                  loading={savingBreeding}
                  style={{ backgroundColor: colors.accent, borderRadius: 8 }}
                >
                  Save Breeding
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {breedings.length === 0 ? (
          <Text style={[styles.emptySection, { color: colors.textSecondary }]}>
            No breeding records yet.
          </Text>
        ) : (
          breedings.map((b) => (
            <Card
              key={b.id}
              style={[styles.subCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.subCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subCardTitle, { color: colors.text }]}>
                    {b.breeding_date}
                  </Text>
                  <View style={styles.chipRow}>
                    <Chip
                      mode="flat"
                      compact
                      style={{ backgroundColor: colors.accent + '20' }}
                      textStyle={{ color: colors.accent, fontSize: 11 }}
                    >
                      {b.method === 'AI' ? 'AI' : 'Natural'}
                    </Chip>
                    {b.stud_name && (
                      <Chip
                        mode="flat"
                        compact
                        style={{ backgroundColor: '#3B82F6' + '20' }}
                        textStyle={{ color: '#3B82F6', fontSize: 11 }}
                      >
                        {b.stud_name}
                      </Chip>
                    )}
                  </View>
                  {b.stud_details ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                      {b.stud_details}
                    </Text>
                  ) : null}
                  {b.notes ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                      {b.notes}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ))
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <View style={styles.actionsSection}>
          {isActive && (
            <Button
              mode="outlined"
              onPress={handleEndHeat}
              icon="calendar-check"
              textColor={colors.warning}
              style={[styles.actionBtn, { borderColor: colors.warning }]}
            >
              End Heat Cycle
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={handleDelete}
            icon="delete"
            textColor={colors.error}
            style={[styles.actionBtn, { borderColor: colors.error, marginTop: isActive ? 12 : 0 }]}
          >
            Delete Heat Cycle
          </Button>
        </View>
      </ScrollView>
    </Surface>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 48 },

  headerCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dogName: { fontWeight: '700' },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  dayCounter: {
    alignItems: 'center',
    paddingLeft: 12,
  },
  dayNumber: { fontSize: 32, fontWeight: '700' },
  dayLabel: { fontSize: 12, marginTop: -2 },
  divider: { marginVertical: 10 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  detailText: { fontSize: 15 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontWeight: '700' },

  formCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  formInput: { marginBottom: 8 },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  segmented: { marginBottom: 12 },

  subCard: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 6,
  },
  subCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  subCardTitle: { fontWeight: '600', marginBottom: 4 },

  emptySection: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
    fontStyle: 'italic',
  },

  actionsSection: {
    marginTop: 24,
  },
  actionBtn: {
    borderRadius: 10,
  },
});
