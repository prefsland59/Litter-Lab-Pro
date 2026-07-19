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
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../../src/theme/ThemeContext';
import {
  getAllRows,
  getRowsByField,
  updateRow,
  deleteRow,
} from '../../../src/db/database';
import type { Dog, Litter, Breeding, HeatCycle } from '../../../src/db/schema';

export default function EditLitterScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

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
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ dam?: string; date?: string }>({});

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      // Load dogs
      const dogs = await getAllRows<Dog>('dogs');
      setAllDogs(dogs);
      setFemaleDogs(dogs.filter((d) => d.sex === 'female'));

      // Load litter
      const litters = await getRowsByField<Litter>('litters', 'id', [Number(id)]);
      if (litters.length === 0) {
        setLoading(false);
        return;
      }
      const lit = litters[0];

      setSelectedDamId(lit.dam_id);
      setWhelpingDate(lit.whelping_date || '');
      setWhelpingType(lit.whelping_type || '');
      setTotalPuppies(lit.total_puppies != null ? String(lit.total_puppies) : '');
      setStillborns(lit.stillborns != null ? String(lit.stillborns) : '');
      setSelectedBreedingId(lit.breeding_id);

      // Handle notes and external stud
      let remainingNotes = lit.notes || '';
      const extMatch = remainingNotes.match(/^External stud:\s*(.+?)(?:\n|$)/);
      if (extMatch && !lit.sire_id) {
        setSireMode('external');
        setExternalStudName(extMatch[1]);
        remainingNotes = remainingNotes.replace(/^External stud:.*?\n?/, '').trim();
      } else {
        setSireMode('internal');
        setSelectedSireId(lit.sire_id);
      }
      setNotes(remainingNotes);

      // Load breedings for the dam
      const heats = await getRowsByField<HeatCycle>('heat_cycles', 'dog_id', [lit.dam_id]);
      const all: Breeding[] = [];
      for (const heat of heats) {
        const b = await getRowsByField<Breeding>('breedings', 'heat_cycle_id', [heat.id]);
        all.push(...b);
      }
      setBreedings(all);
    } catch (err) {
      console.error('Failed to load litter:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id, loadData]),
  );

  const handleSelectDam = (dogId: number) => {
    setSelectedDamId(dogId);
    setErrors((prev) => ({ ...prev, dam: undefined }));
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
    if (!validate() || !id) return;
    setSaving(true);

    try {
      const sireId = sireMode === 'internal' ? selectedSireId : null;
      let finalNotes = notes.trim() || null;
      if (sireMode === 'external' && externalStudName.trim()) {
        finalNotes = finalNotes
          ? `External stud: ${externalStudName.trim()}\n${finalNotes}`
          : `External stud: ${externalStudName.trim()}`;
      }

      await updateRow('litters', Number(id), {
        dam_id: selectedDamId,
        sire_id: sireId,
        breeding_id: selectedBreedingId,
        whelping_date: whelpingDate.trim() || null,
        whelping_type: whelpingType || null,
        total_puppies: totalPuppies ? Number(totalPuppies) : null,
        stillborns: stillborns ? Number(stillborns) : null,
        notes: finalNotes,
      } as Record<string, unknown>);

      router.back();
    } catch (err) {
      console.error('Failed to save litter:', err);
      Alert.alert('Error', 'Failed to update litter. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Litter',
      `Are you sure you want to delete this litter? This will also delete all puppies in this litter.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await deleteRow('litters', Number(id));
              router.back();
              router.back();
            } catch (err) {
              console.error('Failed to delete litter:', err);
              Alert.alert('Error', 'Failed to delete litter. Please try again.');
            }
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
                  No female dogs found.
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
          {breedings.length > 0 && (
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
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            contentStyle={{ paddingVertical: 6 }}
            icon="content-save"
          >
            Save Changes
          </Button>

          {/* Delete */}
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            contentStyle={{ paddingVertical: 6 }}
            textColor={colors.error}
            icon="delete"
          >
            Delete Litter
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  deleteBtn: {
    marginTop: 12,
    borderRadius: 10,
  },
});
