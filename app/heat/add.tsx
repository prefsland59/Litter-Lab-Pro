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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { getAllRows, insertRow, getRowsByField } from '../../src/db/database';
import type { Dog, HeatCycle } from '../../src/db/schema';
import {
  scheduleNotification,
  storeNotificationId,
  cancelAndRemoveNotification,
} from '../../src/utils/notifications';

const SYMPTOM_OPTIONS = [
  'Bleeding',
  'Swelling',
  'Behavior Changes',
  'Discharge',
  'Flagging',
  'Other',
] as const;

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

export default function AddHeatScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [femaleDogs, setFemaleDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ dog?: string; date?: string }>({});
  const [prediction, setPrediction] = useState<{ avgCycle: number; nextExpected: string } | null>(null);

  // Load female dogs
  const loadFemaleDogs = useCallback(async () => {
    try {
      const allDogs = await getAllRows<Dog>('dogs');
      const females = allDogs.filter((d) => d.sex === 'female');
      setFemaleDogs(females);
    } catch (err) {
      console.error('Failed to load dogs:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFemaleDogs();
    }, [loadFemaleDogs]),
  );

  // Compute prediction when dog selected
  const computePrediction = useCallback(
    async (dogId: number) => {
      try {
        const heats = await getRowsByField<HeatCycle>('heat_cycles', 'dog_id', [dogId]);
        const sorted = heats.sort((a, b) => a.start_date.localeCompare(b.start_date));
        if (sorted.length >= 2) {
          const gaps: number[] = [];
          for (let i = 1; i < sorted.length; i++) {
            gaps.push(daysBetween(sorted[i - 1].start_date, sorted[i].start_date));
          }
          const avgCycle = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
          const lastStart = sorted[sorted.length - 1].start_date;
          const nextExpected = addDays(lastStart, avgCycle);
          setPrediction({ avgCycle, nextExpected });
        } else {
          setPrediction(null);
        }
      } catch {
        setPrediction(null);
      }
    },
    [],
  );

  const handleSelectDog = (dogId: number) => {
    setSelectedDogId(dogId);
    setErrors((prev) => ({ ...prev, dog: undefined }));
    computePrediction(dogId);
  };

  const toggleSymptom = (sym: string) => {
    setSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym],
    );
  };

  const validate = (): boolean => {
    const newErrors: { dog?: string; date?: string } = {};
    if (!selectedDogId) newErrors.dog = 'Please select a female dog';
    if (!startDate.trim()) newErrors.date = 'Start date is required';
    // Basic date format check
    if (startDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      newErrors.date = 'Use YYYY-MM-DD format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const result = await insertRow('heat_cycles', {
        dog_id: selectedDogId,
        start_date: startDate.trim(),
        symptoms: symptoms.length > 0 ? symptoms.join(',') : null,
        notes: notes.trim() || null,
      } as Record<string, unknown>);
      const newHeatId = (result as { id: number }).id;

      // Schedule notification for next heat if we have a prediction
      if (prediction) {
        const dogName =
          femaleDogs.find((d) => d.id === selectedDogId)?.name ?? 'Your dog';
        const notifyDate = new Date(prediction.nextExpected);
        // Schedule for 7 days before predicted next heat
        notifyDate.setDate(notifyDate.getDate() - 7);

        // Only schedule if the date is in the future
        if (notifyDate.getTime() > Date.now()) {
          const notifId = await scheduleNotification(
            'Heat Approaching',
            `${dogName} may be coming into heat soon`,
            notifyDate,
          );
          if (notifId) {
            await storeNotificationId(`heat_${newHeatId}`, notifId);
          }
        }
      }

      router.back();
    } catch (err) {
      console.error('Failed to save heat cycle:', err);
      Alert.alert('Error', 'Failed to save heat cycle. Please try again.');
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
          {/* Dog picker */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Female Dog *
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
                  mode={selectedDogId === dog.id ? 'flat' : 'outlined'}
                  selected={selectedDogId === dog.id}
                  onPress={() => handleSelectDog(dog.id)}
                  style={[
                    styles.dogChip,
                    selectedDogId === dog.id && { backgroundColor: colors.accent + '30' },
                  ]}
                  textStyle={{
                    color: selectedDogId === dog.id ? colors.accent : colors.text,
                  }}
                  icon={() => (
                    <MaterialCommunityIcons
                      name="gender-female"
                      size={16}
                      color={selectedDogId === dog.id ? colors.accent : colors.textSecondary}
                    />
                  )}
                >
                  {dog.name}
                </Chip>
              ))}
            </View>
          )}
          {errors.dog ? <HelperText type="error">{errors.dog}</HelperText> : null}

          {/* Prediction hint */}
          {prediction && (
            <Card
              style={[styles.predictionCard, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}
            >
              <View style={styles.predictionRow}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.accent} />
                <Text style={[styles.predictionText, { color: colors.accent }]}>
                  Average cycle length: {prediction.avgCycle} days
                  {'\n'}Next heat expected around {prediction.nextExpected}
                </Text>
              </View>
            </Card>
          )}

          {/* Start date */}
          <TextInput
            mode="outlined"
            label="Start Date * (YYYY-MM-DD)"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-07-19"
            error={!!errors.date}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
            left={<TextInput.Icon icon="calendar" />}
          />
          {errors.date ? <HelperText type="error">{errors.date}</HelperText> : null}

          {/* Symptoms */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Symptoms
          </Text>
          <View style={styles.symptomRow}>
            {SYMPTOM_OPTIONS.map((sym) => {
              const selected = symptoms.includes(sym);
              return (
                <Chip
                  key={sym}
                  mode={selected ? 'flat' : 'outlined'}
                  selected={selected}
                  onPress={() => toggleSymptom(sym)}
                  style={[
                    styles.symptomChip,
                    selected && { backgroundColor: colors.warning + '30' },
                  ]}
                  textStyle={{
                    color: selected ? colors.warning : colors.textSecondary,
                  }}
                  compact
                >
                  {sym}
                </Chip>
              );
            })}
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
            Log Heat Cycle
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
  predictionCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
  },
  predictionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  input: {
    marginBottom: 8,
  },
  symptomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  symptomChip: {
    marginBottom: 0,
  },
  saveBtn: {
    marginTop: 20,
    borderRadius: 10,
  },
});
