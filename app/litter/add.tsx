import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Chip,
  HelperText,
  Card,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { getAllRows, getRowsByField, insertRow } from '../../src/db/database';
import type { Dog, Breeding, HeatCycle } from '../../src/db/schema';
import {
  scheduleNotification,
  storeNotificationId,
} from '../../src/utils/notifications';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_MILESTONES: { milestone_type: string; title: string; offsetDays: number }[] = [
  { milestone_type: 'Eyes Open', title: 'Eyes Open', offsetDays: 12 },
  { milestone_type: 'Ears Open', title: 'Ears Open', offsetDays: 16 },
  { milestone_type: 'Start Gruel', title: 'Start Gruel', offsetDays: 21 },
  { milestone_type: 'Full Weaning', title: 'Full Weaning', offsetDays: 49 },
  { milestone_type: 'First Vaccine', title: 'First Vaccine', offsetDays: 42 },
  { milestone_type: 'Deworming 1', title: 'Deworming 1', offsetDays: 14 },
  { milestone_type: 'Deworming 2', title: 'Deworming 2', offsetDays: 28 },
];

export default function AddLitterScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [femaleDogs, setFemaleDogs] = useState<Dog[]>([]);
  const [allDogs, setAllDogs] = useState<Dog[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number | null>(null);
  const [selectedSireId, setSelectedSireId] = useState<number | null>(null);
  const [sireMode, setSireMode] = useState<'internal' | 'external'>('internal');
  const [externalStudName, setExternalStudName] = useState('');
  const [selectedBreedingId, setSelectedBreedingId] = useState<number | null>(null);
  const [breedings, setBreedings] = useState<Breeding[]>([]);
  const [whelpingDate, setWhelpingDate] = useState('');
  const [whelpingType, setWhelpingType] = useState<'natural' | 'c-section' | ''>('');
  const [totalPuppies, setTotalPuppies] = useState('');
  const [stillborns, setStillborns] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ dam?: string; date?: string }>({});

  const loadDogs = useCallback(async () => {
    try {
      const dogs = await getAllRows<Dog>('dogs');
      setAllDogs(dogs);
      setFemaleDogs(dogs.filter((d) => d.sex === 'female'));
    } catch (err) {
      console.error('Failed to load dogs:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDogs();
    }, [loadDogs]),
  );

  const loadBreedings = useCallback(async (damId: number) => {
    try {
      // Find heat cycles for this dam
      const heats = await getRowsByField<HeatCycle>('heat_cycles', 'dog_id', [damId]);
      if (heats.length === 0) {
        setBreedings([]);
        return;
      }
      // Get breedings for those heat cycles
      const all: Breeding[] = [];
      for (const heat of heats) {
        const b = await getRowsByField<Breeding>('breedings', 'heat_cycle_id', [heat.id]);
        all.push(...b);
      }
      setBreedings(all);
    } catch (err) {
      console.error('Failed to load breedings:', err);
    }
  }, []);

  const handleSelectDam = (dogId: number) => {
    setSelectedDamId(dogId);
    setSelectedBreedingId(null);
    setErrors((prev) => ({ ...prev, dam: undefined }));
    loadBreedings(dogId);
  };

  const handleSelectSire = (dogId: number) => {
    setSelectedSireId(dogId);
  };

  const handleSireModeChange = (mode: 'internal' | 'external') => {
    setSireMode(mode);
    if (mode === 'external') {
      setSelectedSireId(null);
    } else {
      setExternalStudName('');
    }
  };

  const validate = (): boolean => {
    const newErrors: { dam?: string; date?: string } = {};
    if (!selectedDamId) newErrors.dam = 'Please select a dam (female dog)';
    if (whelpingDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(whelpingDate.trim())) {
      newErrors.date = 'Use YYYY-MM-DD format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const sireId = sireMode === 'internal' ? selectedSireId : null;
      let finalNotes = notes.trim() || null;
      if (sireMode === 'external' && externalStudName.trim()) {
        finalNotes = finalNotes
          ? `External stud: ${externalStudName.trim()}\n${finalNotes}`
          : `External stud: ${externalStudName.trim()}`;
      }

      const result = await insertRow('litters', {
        dam_id: selectedDamId,
        sire_id: sireId,
        breeding_id: selectedBreedingId,
        whelping_date: whelpingDate.trim() || null,
        whelping_type: whelpingType || null,
        total_puppies: totalPuppies ? Number(totalPuppies) : null,
        stillborns: stillborns ? Number(stillborns) : null,
        notes: finalNotes,
      } as Record<string, unknown>);

      const newLitterId = (result as { id: number }).id;

      // Auto-insert default milestones if whelping date is set
      if (whelpingDate.trim()) {
        for (const ms of DEFAULT_MILESTONES) {
          const milestoneResult = await insertRow('milestones', {
            litter_id: newLitterId,
            puppy_id: null,
            milestone_type: ms.milestone_type,
            title: ms.title,
            due_date: addDays(whelpingDate.trim(), ms.offsetDays),
            completed_at: null,
            notes: null,
          } as Record<string, unknown>);
          const milestoneId = (milestoneResult as { id: number }).id;

          // Schedule notification for key milestones
          const milestoneDate = new Date(
            addDays(whelpingDate.trim(), ms.offsetDays),
          );
          // Set notification for 1 day before the milestone
          milestoneDate.setDate(milestoneDate.getDate() - 1);

          if (milestoneDate.getTime() > Date.now()) {
            const notifId = await scheduleNotification(
              'Puppy Milestone',
              `Milestone: ${ms.title} is due soon`,
              milestoneDate,
            );
            if (notifId) {
              await storeNotificationId(`milestone_${milestoneId}`, notifId);
            }
          }
        }
      }

      const puppyCount = totalPuppies ? Number(totalPuppies) : 0;
      if (puppyCount > 0) {
        Alert.alert(
          'Add Puppies?',
          `You recorded ${puppyCount} puppy/puppies. Would you like to add puppy details now?`,
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => router.back(),
            },
            {
              text: 'Add Puppies',
              onPress: () => {
                router.back();
                router.push(`/litter/${newLitterId}`);
              },
            },
          ],
        );
      } else {
        router.back();
      }
    } catch (err) {
      console.error('Failed to save litter:', err);
      Alert.alert('Error', 'Failed to save litter. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dam picker */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Dam (Female Dog) *
          </Text>
          {femaleDogs.length === 0 ? (
            <Card
              style={[styles.noDogsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.noDogsInner}>
                <MaterialCommunityIcons name="dog-side" size={28} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginLeft: 8 }}>
                  No female dogs found. Add a female dog first.
                </Text>
              </View>
            </Card>
          ) : (
            <View style={styles.dogChipRow}>
              {femaleDogs.map((dog) => (
                <Chip
                  key={dog.id}
                  mode={selectedDamId === dog.id ? 'flat' : 'outlined'}
                  selected={selectedDamId === dog.id}
                  onPress={() => handleSelectDam(dog.id)}
                  style={[
                    styles.dogChip,
                    selectedDamId === dog.id && { backgroundColor: colors.accent + '30' },
                  ]}
                  textStyle={{
                    color: selectedDamId === dog.id ? colors.accent : colors.text,
                  }}
                  icon={() => (
                    <MaterialCommunityIcons
                      name="gender-female"
                      size={16}
                      color={selectedDamId === dog.id ? colors.accent : colors.textSecondary}
                    />
                  )}
                >
                  {dog.name}
                </Chip>
              ))}
            </View>
          )}
          {errors.dam ? <HelperText type="error">{errors.dam}</HelperText> : null}

          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Sire picker */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Sire
          </Text>
          <SegmentedButtons
            value={sireMode}
            onValueChange={(v) => handleSireModeChange(v as 'internal' | 'external')}
            buttons={[
              { value: 'internal', label: 'From My Dogs', icon: 'dog-side' },
              { value: 'external', label: 'External Stud', icon: 'account' },
            ]}
            style={styles.segmented}
            theme={{
              colors: {
                secondaryContainer: colors.accent + '30',
                onSecondaryContainer: colors.text,
                onSurface: colors.textSecondary,
              },
            }}
          />

          {sireMode === 'internal' ? (
            <View style={styles.dogChipRow}>
              {allDogs.map((dog) => (
                <Chip
                  key={dog.id}
                  mode={selectedSireId === dog.id ? 'flat' : 'outlined'}
                  selected={selectedSireId === dog.id}
                  onPress={() => handleSelectSire(dog.id)}
                  style={[
                    styles.dogChip,
                    selectedSireId === dog.id && { backgroundColor: colors.accent + '30' },
                  ]}
                  textStyle={{
                    color: selectedSireId === dog.id ? colors.accent : colors.text,
                  }}
                  icon={() => (
                    <MaterialCommunityIcons
                      name={dog.sex === 'male' ? 'gender-male' : 'gender-female'}
                      size={16}
                      color={selectedSireId === dog.id ? colors.accent : colors.textSecondary}
                    />
                  )}
                >
                  {dog.name}
                </Chip>
              ))}
            </View>
          ) : (
            <TextInput
              mode="outlined"
              label="External Stud Name"
              value={externalStudName}
              onChangeText={setExternalStudName}
              style={styles.input}
              outlineStyle={{ borderColor: colors.border }}
              activeOutlineColor={colors.accent}
            />
          )}

          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Breeding record link */}
          {selectedDamId && breedings.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Linked Breeding (optional)
              </Text>
              <View style={styles.dogChipRow}>
                {breedings.map((b) => (
                  <Chip
                    key={b.id}
                    mode={selectedBreedingId === b.id ? 'flat' : 'outlined'}
                    selected={selectedBreedingId === b.id}
                    onPress={() =>
                      setSelectedBreedingId(selectedBreedingId === b.id ? null : b.id)
                    }
                    style={[
                      styles.dogChip,
                      selectedBreedingId === b.id && { backgroundColor: colors.success + '30' },
                    ]}
                    textStyle={{
                      color: selectedBreedingId === b.id ? colors.success : colors.text,
                    }}
                  >
                    {b.breeding_date} {b.method ? `(${b.method})` : ''}
                  </Chip>
                ))}
              </View>
              <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          {/* Whelping date */}
          <TextInput
            mode="outlined"
            label="Whelping Date (YYYY-MM-DD)"
            value={whelpingDate}
            onChangeText={setWhelpingDate}
            placeholder="Leave empty if expected"
            error={!!errors.date}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
            left={<TextInput.Icon icon="calendar" />}
          />
          {errors.date ? <HelperText type="error">{errors.date}</HelperText> : null}
          {!whelpingDate.trim() && (
            <HelperText type="info" style={{ color: colors.warning }}>
              No date entered — litter will show as "Expected"
            </HelperText>
          )}

          {/* Whelping type */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Whelping Type
          </Text>
          <SegmentedButtons
            value={whelpingType}
            onValueChange={(v) => setWhelpingType(v as 'natural' | 'c-section' | '')}
            buttons={[
              { value: 'natural', label: 'Natural', icon: 'heart-pulse' },
              { value: 'c-section', label: 'C-Section', icon: 'medical-bag' },
            ]}
            style={styles.segmented}
            theme={{
              colors: {
                secondaryContainer: colors.accent + '30',
                onSecondaryContainer: colors.text,
                onSurface: colors.textSecondary,
              },
            }}
          />

          {/* Puppy counts */}
          <View style={styles.countRow}>
            <View style={styles.countField}>
              <TextInput
                mode="outlined"
                label="Total Puppies"
                value={totalPuppies}
                onChangeText={setTotalPuppies}
                keyboardType="numeric"
                style={styles.input}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
              />
            </View>
            <View style={styles.countField}>
              <TextInput
                mode="outlined"
                label="Stillborns"
                value={stillborns}
                onChangeText={setStillborns}
                keyboardType="numeric"
                style={styles.input}
                outlineStyle={{ borderColor: colors.border }}
                activeOutlineColor={colors.accent}
              />
            </View>
          </View>

          {/* Notes */}
          <TextInput
            mode="outlined"
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
          />

          {/* Save */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving || femaleDogs.length === 0}
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            contentStyle={{ paddingVertical: 6 }}
            icon="content-save"
          >
            Create Litter
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  dogChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dogChip: {
    marginBottom: 0,
  },
  noDogsCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  noDogsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  divider: {
    marginVertical: 16,
  },
  segmented: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 8,
  },
  countRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countField: {
    flex: 1,
  },
  saveBtn: {
    marginTop: 20,
    borderRadius: 10,
  },
});
