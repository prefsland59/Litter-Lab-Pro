import React, { useState } from 'react';
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
  HelperText,
  SegmentedButtons,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '../../src/theme/ThemeContext';
import { insertRow } from '../../src/db/database';

export default function AddPuppyScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { litter_id } = useLocalSearchParams<{ litter_id: string }>();

  const [nameOrId, setNameOrId] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [color, setColor] = useState('');
  const [birthWeightGrams, setBirthWeightGrams] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name_or_id?: string; sex?: string }>({});

  const validate = (): boolean => {
    const newErrors: { name_or_id?: string; sex?: string } = {};
    if (!nameOrId.trim()) newErrors.name_or_id = 'Name or ID is required';
    if (!sex) newErrors.sex = 'Sex is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !litter_id) return;
    setSaving(true);

    try {
      await insertRow('puppies', {
        litter_id: Number(litter_id),
        name_or_id: nameOrId.trim() || null,
        sex,
        color: color.trim() || null,
        birth_weight_grams: birthWeightGrams.trim() ? Number(birthWeightGrams.trim()) : null,
        notes: notes.trim() || null,
      } as Record<string, unknown>);

      router.back();
    } catch (err) {
      console.error('Failed to save puppy:', err);
      Alert.alert('Error', 'Failed to save puppy. Please try again.');
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
          {/* Name or ID */}
          <TextInput
            mode="outlined"
            label="Name or ID *"
            value={nameOrId}
            onChangeText={setNameOrId}
            error={!!errors.name_or_id}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
          />
          {errors.name_or_id ? (
            <HelperText type="error">{errors.name_or_id}</HelperText>
          ) : null}

          {/* Sex */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sex *</Text>
          <SegmentedButtons
            value={sex}
            onValueChange={(v) => setSex(v as 'male' | 'female')}
            buttons={[
              {
                value: 'male',
                label: '\u2642 Male',
                icon: 'gender-male',
              },
              {
                value: 'female',
                label: '\u2640 Female',
                icon: 'gender-female',
              },
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
          {errors.sex ? <HelperText type="error">{errors.sex}</HelperText> : null}

          {/* Color */}
          <TextInput
            mode="outlined"
            label="Color"
            value={color}
            onChangeText={setColor}
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
            placeholder="e.g. Blue Brindle, Fawn, Pied"
          />

          {/* Birth Weight */}
          <TextInput
            mode="outlined"
            label="Birth Weight (grams)"
            value={birthWeightGrams}
            onChangeText={setBirthWeightGrams}
            keyboardType="numeric"
            style={styles.input}
            outlineStyle={{ borderColor: colors.border }}
            activeOutlineColor={colors.accent}
            placeholder="e.g. 280"
          />

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
            icon="paw"
          >
            Add Puppy
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
  input: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 12,
  },
  saveBtn: {
    marginTop: 20,
    borderRadius: 10,
  },
});
